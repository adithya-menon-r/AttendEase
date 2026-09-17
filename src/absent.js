globalThis.AttendEase = globalThis.AttendEase || {};

// Reads the absent-report page; counts absences per course within a date range to recover uncredited internship OD.
AttendEase.absent = (() => {
  const REPORT_PATH = '/client/absent-report';
  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

  // outer table: Sl No | Class Name | Course | Faculty | Absent Dates
  const COLUMN = { course: 2, dates: 4 };

  // nested per-course table: Sl No | Date | Period
  const NESTED = { date: 1, period: 2 };

  const normalise = (code) => (code || '').trim().toUpperCase();

  function currentTermId(doc = document) {
    return doc.querySelector('select[name="academic_term_id"]')?.value || '';
  }

  function datesIn(cell) {
    // a course with no absences gets an empty cell, not an empty table
    const nested = cell?.querySelector('table');
    if (!nested) return [];

    const body = nested.tBodies[0];
    const rows = body ? Array.from(body.rows) : Array.from(nested.rows).slice(1);

    return rows
      .map((row) => {
        const date = row.cells[NESTED.date]?.textContent.trim() || '';
        // dates arrive ISO, which is what makes the range check a string compare
        if (!ISO_DATE.test(date)) return null;
        return { date, period: row.cells[NESTED.period]?.textContent.trim() || '' };
      })
      .filter(Boolean);
  }

  function parse(doc) {
    const table = doc.getElementById('home_tab');
    if (!table) return [];

    const entries = [];
    for (const row of AttendEase.scrape.rowsOf(table).slice(1)) {
      const cells = row.cells;
      if (cells.length <= COLUMN.dates) continue;

      const [code = '', ...rest] = AttendEase.scrape.lines(cells[COLUMN.course]);
      if (!code) continue;

      entries.push({
        courseCode: code,
        courseName: rest.join(' '),
        absences: datesIn(cells[COLUMN.dates]),
      });
    }
    return entries;
  }

  async function load(termId) {
    const url = termId
      ? `${REPORT_PATH}?academic_term_id=${encodeURIComponent(termId)}`
      : REPORT_PATH;

    const response = await fetch(url, { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`absent report responded ${response.status}`);

    return parse(new DOMParser().parseFromString(await response.text(), 'text/html'));
  }

  // ISO dates compare correctly as strings, so no parsing is needed
  function countInRange(entries, from, till) {
    const counts = new Map();
    if (!from || !till || from > till) return counts;

    for (const entry of entries) {
      const hits = entry.absences.filter((a) => a.date >= from && a.date <= till);
      counts.set(normalise(entry.courseCode), hits.length);
    }
    return counts;
  }

  return { currentTermId, parse, load, countInRange, normalise };
})();
