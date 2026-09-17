(() => {
  const { calc, scrape, absent, Widget } = globalThis.AttendEase;

  const DEFAULTS = {
    minAttendance: 75,
    includeMedical: false,
    internship: { enabled: false, from: '', till: '' },
    widgetPosition: null,
  };

  const TABLE_TIMEOUT_MS = 20000;
  const storage = globalThis.chrome?.storage?.local;

  const state = {
    target: DEFAULTS.minAttendance,
    includeMedical: DEFAULTS.includeMedical,
    internship: { ...DEFAULTS.internship },
    courses: [],
    absentEntries: null,
    absentError: '',
    loadingAbsent: false,
    storageBroken: false,
  };

  let widget = null;

  const options = () => ({
    target: state.target,
    countMedical: state.includeMedical,
    internshipOD: state.internship.enabled,
  });

  const hasRange = () =>
    Boolean(state.internship.from && state.internship.till)
    && state.internship.from <= state.internship.till;

  async function readPrefs() {
    if (!storage) return { ...DEFAULTS };
    try {
      const stored = await storage.get(Object.keys(DEFAULTS));
      return { ...DEFAULTS, ...stored, internship: { ...DEFAULTS.internship, ...stored.internship } };
    } catch (error) {
      console.warn('[AttendEase] Could not read preferences:', error);
      return { ...DEFAULTS };
    }
  }

  const contextAlive = () => Boolean(globalThis.chrome?.runtime?.id);

  function writePref(key, value) {
    if (!storage) return;
    if (!contextAlive()) {
      onStorageFailure(new Error('Extension context invalidated.'));
      return;
    }
    try {
      storage.set({ [key]: value })?.catch(onStorageFailure);
    } catch (error) {
      onStorageFailure(error);
    }
  }

  // settings apply this session but can't persist; warn once rather than on every change
  function onStorageFailure(error) {
    if (state.storageBroken) return;
    state.storageBroken = true;
    console.warn('[AttendEase] Settings will not persist until this page is reloaded:', error);
    render();
  }

  // resolves with the table once it appears (MutationObserver + poll), or null on timeout
  function waitForTable() {
    const immediate = scrape.findTable();
    if (immediate) return Promise.resolve(immediate);

    return new Promise((resolve) => {
      let settled = false;

      const finish = (table) => {
        if (settled) return;
        settled = true;
        observer.disconnect();
        clearInterval(poll);
        clearTimeout(deadline);
        resolve(table);
      };

      const check = () => {
        const table = scrape.findTable();
        if (table) finish(table);
      };

      const observer = new MutationObserver(check);
      observer.observe(document.body, { childList: true, subtree: true });
      const poll = setInterval(check, 500);
      const deadline = setTimeout(() => finish(null), TABLE_TIMEOUT_MS);
    });
  }

  // fetched same-origin, so it rides the session already in the browser
  async function loadAbsentReport() {
    if (state.loadingAbsent) return;
    state.loadingAbsent = true;
    state.absentError = '';
    render();

    try {
      state.absentEntries = await absent.load(absent.currentTermId());
    } catch (error) {
      console.warn('[AttendEase] Could not read the absent report:', error);
      state.absentEntries = null;
      state.absentError = "Couldn't read the absent report. Open that tab once, then refresh.";
    } finally {
      state.loadingAbsent = false;
      render();
    }
  }

  function ensureAbsentReport() {
    if (state.internship.enabled && hasRange() && !state.absentEntries && !state.loadingAbsent) {
      loadAbsentReport();
      return true;
    }
    return false;
  }

  // only actionable warnings; per-course badges already show what was recovered
  function settingsWarning() {
    if (state.storageBroken) {
      return 'Reload this page to save settings: the extension was updated underneath it.';
    }
    if (!state.internship.enabled) return '';
    if (state.internship.from && state.internship.till
      && state.internship.from > state.internship.till) {
      return 'That start date is after the end date.';
    }
    return state.absentError;
  }

  function render(emptyMessage) {
    if (!widget) return;

    const counts = state.internship.enabled && state.absentEntries && hasRange()
      ? absent.countInRange(state.absentEntries, state.internship.from, state.internship.till)
      : null;

    const settings = options();
    const courses = state.courses.map((course) =>
      calc.evaluate(
        { ...course, internshipAbsences: counts?.get(absent.normalise(course.courseCode)) || 0 },
        settings
      )
    );

    widget.render({
      courses,
      target: state.target,
      includeMedical: state.includeMedical,
      internship: state.internship,
      warning: settingsWarning(),
      emptyMessage,
    });
  }

  // re-reads from scratch; the portal can swap the table element out
  function rescrape() {
    state.courses = scrape.parse(scrape.findTable());
    render();
  }

  async function refresh() {
    widget.setRefreshing(true);
    widget.replayEntrance();
    try {
      const table = await waitForTable();
      state.courses = scrape.parse(table);
      // manual refresh re-reads the absent report too since attendance moves with it
      if (state.internship.enabled && hasRange()) {
        state.absentEntries = null;
        await loadAbsentReport();
      } else {
        render();
      }
    } finally {
      widget.setRefreshing(false);
    }
  }

  async function init() {
    const prefs = await readPrefs();
    state.target = prefs.minAttendance;
    state.includeMedical = prefs.includeMedical;
    state.internship = { ...prefs.internship };

    widget = new Widget({
      onRefresh: refresh,
      onMove: (position) => writePref('widgetPosition', position),
      onTargetChange: (target) => {
        state.target = target;
        writePref('minAttendance', target);
        render();
      },
      onMedicalChange: (includeMedical) => {
        state.includeMedical = includeMedical;
        writePref('includeMedical', includeMedical);
        render();
      },
      onReset: () => {
        state.target = DEFAULTS.minAttendance;
        state.includeMedical = DEFAULTS.includeMedical;
        state.internship = { ...DEFAULTS.internship };
        state.absentError = '';
        writePref('minAttendance', state.target);
        writePref('includeMedical', state.includeMedical);
        writePref('internship', state.internship);
        render();
      },
      onInternshipChange: (internship) => {
        state.internship = { ...internship };
        writePref('internship', state.internship);
        if (!ensureAbsentReport()) render();
      },
    });

    widget.mount(prefs.widgetPosition);
    widget.showSkeleton();
    widget.show();

    const table = await waitForTable();
    if (!table) {
      render("Couldn't find the attendance table on this page. Try refreshing.");
      return;
    }

    state.courses = scrape.parse(table);
    if (!ensureAbsentReport()) render();

    // clear stale cache keys left by older extension versions
    try {
      storage?.remove(['attendanceData', 'lastUpdated'])?.catch(() => {});
    } catch { /* context already gone; there is nothing to clean up */ }
  }

  globalThis.chrome?.runtime?.onMessage?.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'attendease:toggle') {
      if (widget) {
        widget.toggle();
        if (widget.visible) rescrape();
      }
      sendResponse({ ok: Boolean(widget) });
    }
    return false;
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
