globalThis.AttendEase = globalThis.AttendEase || {};

AttendEase.scrape = (() => {
  // try multiple selectors; portal markup has changed across versions
  const TABLE_SELECTORS = [
    '#home_tab',
    '#attendance_table',
    'table[class*="attendance"]',
    '.table-responsive table',
    'table.table',
    '[id*="tab"] table',
  ];

  const COLUMN = {
    serial: 0,
    className: 1,
    course: 2,
    faculty: 3,
    total: 4,
    present: 5,
    dutyLeave: 6,
    absent: 7,
    percentage: 8,
    medical: 9,
  };

  // medical leave column is optional; everything up to percentage is not
  const MIN_CELLS = COLUMN.percentage + 1;

  const cellsOf = (row) => row.querySelectorAll('th, td');

  const isDataRow = (row) => cellsOf(row).length >= MIN_CELLS;

  function text(cells, index) {
    return cells[index] ? cells[index].textContent.trim() : '';
  }

  function int(cells, index) {
    const value = parseInt(text(cells, index), 10);
    return Number.isFinite(value) ? value : 0;
  }

  // splits a cell on <br> elements without re-parsing HTML
  function lines(cell) {
    if (!cell) return [];
    const collected = [''];
    for (const node of cell.childNodes) {
      if (node.nodeName === 'BR') collected.push('');
      else collected[collected.length - 1] += node.textContent;
    }
    return collected.map((line) => line.trim()).filter(Boolean);
  }

  // returns the table only once it has rows worth parsing
  function findTable() {
    for (const selector of TABLE_SELECTORS) {
      for (const table of document.querySelectorAll(selector)) {
        // row 0 is the header; data starts at row 1
        const rows = Array.from(table.querySelectorAll('tr')).slice(1);
        if (rows.some(isDataRow)) return table;
      }
    }
    return null;
  }

  function parseRow(row, index) {
    const cells = cellsOf(row);
    if (cells.length < MIN_CELLS) return null;

    const total = int(cells, COLUMN.total);
    // skip courses with no recorded classes — would divide by zero
    if (total <= 0) return null;

    const [code = '', ...rest] = lines(cells[COLUMN.course]);

    return {
      id: index,
      serialNumber: text(cells, COLUMN.serial) || String(index + 1),
      courseCode: code,
      courseName: rest.join(' '),
      className: text(cells, COLUMN.className),
      faculty: text(cells, COLUMN.faculty),
      total,
      present: int(cells, COLUMN.present),
      dutyLeave: int(cells, COLUMN.dutyLeave),
      absent: int(cells, COLUMN.absent),
      medical: int(cells, COLUMN.medical),
    };
  }

  // returns every parseable course in portal order
  function parse(table) {
    if (!table) return [];
    return Array.from(table.querySelectorAll('tr'))
      .slice(1)
      .map(parseRow)
      .filter(Boolean)
      .map((course, index) => ({ ...course, id: index }));
  }

  return { findTable, parse };
})();
