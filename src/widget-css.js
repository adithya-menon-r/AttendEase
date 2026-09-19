// widget stylesheet inlined as a JS string
globalThis.AttendEase = globalThis.AttendEase || {};

AttendEase.css = /* css */ `
:host {
  /* reset all inherited styles at the shadow boundary */
  all: initial;

  position: fixed;
  top: 0;
  left: 0;
  z-index: 2147483000;
  display: block;
  width: 356px;

  font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text);
  text-align: left;

  --surface: #f5f4f2;
  --card: #ffffff;
  --track: #e9e6e2;

  --shell: #1c1917;
  --shell-text: #f5f4f2;
  --shell-muted: #a09a94;
  --shell-hover: rgba(255, 255, 255, 0.1);

  --border: #e3e0dc;
  --border-strong: #c9c4be;

  --text: #1c1917;
  --text-muted: #5f5952;
  --text-faint: #8e8880;

  --safe: #16a34a;
  --safe-text: #15803d;
  --warning: #f59e0b;
  --warning-text: #b45309;
  --danger: #dc2626;
  --danger-text: #b91c1c;

  --radius: 11px;
  --duration: 140ms;
  --expand: 220ms cubic-bezier(0.4, 0, 0.2, 1);
}

:host([hidden]) { display: none; }

*, *::before, *::after { box-sizing: border-box; }

.widget {
  display: flex;
  flex-direction: column;
  max-height: 75vh;
  background: var(--surface);
  border-radius: 12px;
  box-shadow:
    0 0 0 1px rgba(28, 25, 23, 0.06),
    0 2px 4px rgba(28, 25, 23, 0.06),
    0 12px 32px rgba(28, 25, 23, 0.18);
  overflow: hidden;
}

/* ---------------------------------------------------------------- header -- */

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 7px 0 14px;
  height: 38px;
  flex: none;
  background: var(--shell);
  cursor: grab;
  user-select: none;
}

.is-dragging .header { cursor: grabbing; }

.brand {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--shell-text);
  text-decoration: none;
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.brand:hover { filter: brightness(1.4); }

.actions { display: flex; align-items: center; gap: 1px; }

.iconbtn {
  display: grid;
  place-items: center;
  width: 25px;
  height: 25px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--shell-muted);
  cursor: pointer;
  transition: background var(--duration), color var(--duration);
}

.iconbtn:hover { background: var(--shell-hover); color: var(--shell-text); }
.iconbtn:focus-visible { outline: 2px solid var(--shell-text); outline-offset: -2px; }
.iconbtn svg { width: 15px; height: 15px; display: block; }

.is-refreshing .iconbtn[data-action="refresh"] svg {
  animation: spin 900ms linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* -------------------------------------------------------------- settings -- */

.body { display: flex; flex-direction: column; min-height: 0; }

/* closed by default, so the resting widget is just header plus courses.
   a grid row animates from 0fr to 1fr; display:none could not be transitioned */
.settings-shell {
  display: grid;
  grid-template-rows: 0fr;
  flex: none;
  border-bottom: 1px solid transparent;
  transition: grid-template-rows var(--expand), border-color var(--expand);
}

.is-settings-open .settings-shell {
  grid-template-rows: 1fr;
  border-bottom-color: var(--border);
}

/* 0fr collapses the content box but not the padding, so the vertical padding
   has to travel with it or the closed panel leaves a dead band above the list */
.settings {
  overflow: hidden;
  min-height: 0;
  padding: 0 12px;
  opacity: 0;
  transition: opacity 140ms ease, padding var(--expand);
}

.is-settings-open .settings {
  padding: 10px 12px 12px;
  opacity: 1;
}

.is-settings-open .iconbtn[data-action="settings"] {
  background: var(--shell-hover);
  color: var(--shell-text);
}

.setting {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 26px;
}

.setting__label {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
}

.settings__rule {
  height: 1px;
  margin: 10px 0 8px;
  background: var(--border);
}

.settings__dates {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  transition: opacity var(--duration);
}

.settings__dates.is-disabled { opacity: 0.4; }

.datefield {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-width: 0;
}

.datefield__label {
  font-size: 11px;
  color: var(--text-faint);
}

.dateinput {
  width: 100%;
  padding: 4px 7px;
  font: inherit;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--text);
  background: var(--card);
  border: 1px solid var(--border-strong);
  border-radius: 6px;
  transition: border-color var(--duration);
}

.dateinput:hover:enabled { border-color: var(--text-faint); }
.dateinput:focus-visible { outline: 2px solid var(--text); outline-offset: 1px; }
.dateinput:disabled { cursor: not-allowed; }

.settings__footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.linkbtn {
  padding: 3px 6px;
  font: inherit;
  font-size: 11px;
  color: var(--text-muted);
  background: none;
  border: 0;
  border-radius: 5px;
  cursor: pointer;
  transition: background var(--duration), color var(--duration);
}

.linkbtn:hover { background: var(--track); color: var(--text); }
.linkbtn:focus-visible { outline: 2px solid var(--text); outline-offset: 1px; }

.settings__warning {
  margin: 0 0 10px;
  padding: 6px 8px;
  font-size: 11px;
  line-height: 1.45;
  color: var(--warning-text);
  background: rgba(245, 158, 11, 0.12);
  border-radius: 6px;
}

.settings__warning:empty { display: none; }

.select {
  appearance: none;
  padding: 3px 22px 3px 8px;
  font: inherit;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--text);
  background-color: var(--card);
  /* inline SVG chevron avoids a separate extension URL request */
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10"><path d="M2 4l3 3 3-3" fill="none" stroke="%235f5952" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>');
  background-repeat: no-repeat;
  background-position: right 7px center;
  border: 1px solid var(--border-strong);
  border-radius: 6px;
  cursor: pointer;
  transition: border-color var(--duration);
}

.select:hover { border-color: var(--text-faint); }
.select:focus-visible { outline: 2px solid var(--text); outline-offset: 1px; }

.switch { display: flex; align-items: center; cursor: pointer; }

.switch input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.switch__track {
  position: relative;
  width: 30px;
  height: 18px;
  flex: none;
  background: var(--border-strong);
  border-radius: 9px;
  transition: background var(--duration);
}

.switch__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  background: var(--card);
  border-radius: 50%;
  box-shadow: 0 1px 2px rgba(28, 25, 23, 0.25);
  transition: transform var(--duration);
}

.switch input:checked + .switch__track { background: var(--shell); }
.switch input:checked + .switch__track .switch__thumb { transform: translateX(12px); }
.switch input:focus-visible + .switch__track { outline: 2px solid var(--text); outline-offset: 2px; }

/* ------------------------------------------------------------------ list -- */

.list {
  margin: 0;
  padding: 10px;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 9px;
  overflow-y: auto;
  min-height: 0;
  transition: opacity var(--duration);
}

.is-refreshing .list { opacity: 0.45; }

.list::-webkit-scrollbar { width: 10px; }
.list::-webkit-scrollbar-track { background: transparent; }
.list::-webkit-scrollbar-thumb {
  background: var(--border-strong);
  border: 3px solid var(--surface);
  border-radius: 5px;
}
.list::-webkit-scrollbar-thumb:hover { background: var(--text-faint); }

/* ------------------------------------------------------------------ card -- */

.course {
  padding: 10px 13px 11px;
  background: var(--card);
  border-radius: var(--radius);
  box-shadow:
    0 0 0 1px rgba(28, 25, 23, 0.10),
    0 1px 2px rgba(28, 25, 23, 0.05),
    0 2px 5px -2px rgba(28, 25, 23, 0.10);
  transition: box-shadow var(--duration);
}

.course:hover {
  box-shadow:
    0 0 0 1px rgba(28, 25, 23, 0.16),
    0 2px 4px rgba(28, 25, 23, 0.06),
    0 6px 12px -4px rgba(28, 25, 23, 0.13);
}

.course__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

/* marks a course whose figure includes OD the portal could not show */
.course__od[hidden] { display: none; }

.course__od {
  flex: none;
  padding: 1px 5px;
  font-size: 10px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
  background: var(--track);
  border-radius: 4px;
}

.course__code {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text);
}

.course__pct {
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--status-text, var(--text));
}

.course__name {
  margin: 1px 0 8px;
  font-size: 12px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.course__meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-top: 7px;
}

.course__count {
  display: flex;
  align-items: baseline;
  gap: 5px;
  min-width: 0;
  font-size: 11px;
  color: var(--text-faint);
  font-variant-numeric: tabular-nums;
}

.course__verdict {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
}

.course__verdict b {
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  color: var(--status-text, var(--text));
}

/* ------------------------------------------------------------------- bar -- */

.bar {
  position: relative;
  height: 5px;
  background: var(--track);
  border-radius: 3px;
}

.bar__fill {
  display: block;
  height: 100%;
  background: var(--status);
  border-radius: 3px;
  transition: width 450ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* target line sits above fill so it stays visible on either side.
   left starts out auto, which is not interpolable, so the first paint places
   the marker without animating and only later target changes slide. */
.bar__target {
  transition: left 320ms cubic-bezier(0.4, 0, 0.2, 1);
  position: absolute;
  top: -1px;
  bottom: -1px;
  width: 2px;
  margin-left: -1px;
  background: var(--card);
  box-shadow: 0 0 0 1px rgba(28, 25, 23, 0.42);
}

/* ---------------------------------------------------------------- states -- */

.status {
  padding: 26px 18px;
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
}

.skeleton { display: flex; flex-direction: column; gap: 8px; }

.skeleton__row {
  height: 78px;
  border-radius: var(--radius);
  background:
    linear-gradient(90deg, transparent 25%, rgba(255, 255, 255, 0.85) 50%, transparent 75%),
    var(--track);
  background-size: 200% 100%, auto;
  animation: shimmer 1.4s linear infinite;
}

@keyframes shimmer {
  to { background-position: -200% 0, 0 0; }
}

.is-safe    { --status: var(--safe);    --status-text: var(--safe-text); }
.is-warning { --status: var(--warning); --status-text: var(--warning-text); }
.is-danger  { --status: var(--danger);  --status-text: var(--danger-text); }

@media (prefers-reduced-motion: reduce) {
  * { transition-duration: 1ms; animation-duration: 1ms; animation-iteration-count: 1; }
}
`;
