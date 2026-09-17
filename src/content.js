(() => {
  const { calc, scrape, Widget } = globalThis.AttendEase;

  const DEFAULTS = { minAttendance: 75, includeMedical: false, widgetPosition: null };
  const TABLE_TIMEOUT_MS = 20000;
  const storage = globalThis.chrome?.storage?.local;

  const state = {
    target: DEFAULTS.minAttendance,
    includeMedical: DEFAULTS.includeMedical,
    courses: [],
  };

  let widget = null;

  async function readPrefs() {
    if (!storage) return { ...DEFAULTS };
    try {
      const stored = await storage.get(Object.keys(DEFAULTS));
      return { ...DEFAULTS, ...stored };
    } catch (error) {
      console.warn('[AttendEase] Could not read preferences:', error);
      return { ...DEFAULTS };
    }
  }

  function writePref(key, value) {
    storage?.set({ [key]: value }).catch((error) => {
      console.warn(`[AttendEase] Could not save ${key}:`, error);
    });
  }

  // resolves with the table once it appears, or null on timeout;
  // the portal fills it asynchronously so we use both a mutation observer and a poll
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

  function render() {
    const courses = state.courses.map((course) =>
      calc.evaluate(course, state.target, state.includeMedical)
    );

    widget.render({
      courses,
      target: state.target,
      includeMedical: state.includeMedical,
    });
  }

  // re-reads from scratch; the portal can swap the table element out
  function rescrape() {
    state.courses = scrape.parse(scrape.findTable());
    render();
  }

  async function refresh() {
    widget.setRefreshing(true);
    try {
      const table = await waitForTable();
      state.courses = scrape.parse(table);
      render();
    } finally {
      widget.setRefreshing(false);
    }
  }

  async function init() {
    const prefs = await readPrefs();
    state.target = prefs.minAttendance;
    state.includeMedical = prefs.includeMedical;

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
    });

    widget.mount(prefs.widgetPosition);
    widget.showSkeleton();
    widget.show();

    const table = await waitForTable();
    if (!table) {
      widget.render({
        courses: [],
        target: state.target,
        includeMedical: state.includeMedical,
        emptyMessage: "Couldn't find the attendance table on this page. Try refreshing.",
      });
      return;
    }

    state.courses = scrape.parse(table);
    render();

    // clear stale cache keys left by older extension versions
    storage?.remove(['attendanceData', 'lastUpdated']).catch(() => {});
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
