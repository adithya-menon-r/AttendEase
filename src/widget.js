// renders into a shadow root so portal styles and widget styles never bleed into each other
globalThis.AttendEase = globalThis.AttendEase || {};

AttendEase.Widget = (() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // minimal element builder
  function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined || value === null) continue;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'style') Object.assign(node.style, value);
      else if (key.includes('-')) node.setAttribute(key, value);
      else node[key] = value;
    }
    node.append(...children.filter(Boolean));
    return node;
  }

  function icon(paths) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    for (const [name, value] of Object.entries({
      viewBox: '0 0 16 16',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '1.65',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    })) {
      svg.setAttribute(name, value);
    }
    for (const d of paths) {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      svg.appendChild(path);
    }
    return svg;
  }

  const ICONS = {
    refresh: ['M13.5 8a5.5 5.5 0 1 1-1.61-3.89', 'M13.5 2.5V5H11'],
    close: ['m4 4 8 8', 'M12 4l-8 8'],
    sliders: ['M2 5h12', 'M2 11h12', 'M9.5 3v4', 'M5.5 9v4'],
  };

  return class Widget {
    static HOST_ID = 'attendease-root';
    static TARGETS = [75, 80, 85, 90, 95];

    // minimum pixels of header kept on screen so the widget stays grabbable
    static EDGE_MARGIN = 40;
    static WIDTH = 360;

    // shared curve for the bar sweep and the number counting beside it
    static SWEEP = { duration: 620, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' };
    static STAGGER = 45;

    constructor(handlers = {}) {
      this.handlers = handlers;
      this.host = null;
      this.root = null;
      this.position = { x: 0, y: 0 };
      this.settingsOpen = false;
      this.cards = new Map();
      this.signature = null;
      this.onWindowResize = () => this.applyPosition();
    }

    get visible() {
      return Boolean(this.host) && !this.host.hasAttribute('hidden');
    }

    mount(position) {
      this.destroy();

      this.host = el('div', { id: Widget.HOST_ID, hidden: true });
      this.root = this.host.attachShadow({ mode: 'open' });
      this.root.append(el('style', { text: AttendEase.css }), this.buildShell());
      document.body.appendChild(this.host);

      this.position = position || this.defaultPosition();
      this.applyPosition();
      this.bindEvents();
      window.addEventListener('resize', this.onWindowResize);
    }

    destroy() {
      window.removeEventListener('resize', this.onWindowResize);
      document.getElementById(Widget.HOST_ID)?.remove();
      this.host = null;
      this.root = null;
    }

    defaultPosition() {
      return { x: Math.max(16, window.innerWidth - Widget.WIDTH - 32), y: 84 };
    }

    buildShell() {
      const button = (action, label, paths) =>
        el('button', { class: 'iconbtn', 'data-action': action, title: label, 'aria-label': label },
          icon(paths));

      return el('div', { class: 'widget' },
        el('header', { class: 'header' },
          el('a', { class: 'brand', text: 'AttendEase', href: 'https://github.com/adithya-menon-r/AttendEase', target: '_blank' }),
          el('div', { class: 'actions' },
            button('settings', 'Settings', ICONS.sliders),
            button('refresh', 'Refresh', ICONS.refresh),
            button('close', 'Hide', ICONS.close))),
        el('div', { class: 'body' },
          // wrapper exists so the panel can animate open
          el('div', { class: 'settings-shell' }, this.buildSettings()),
          el('ul', { class: 'list' })));
    }

    buildSettings() {
      const toggle = (name) =>
        el('label', { class: 'switch' },
          el('input', { type: 'checkbox', 'data-control': name }),
          el('span', { class: 'switch__track' }, el('span', { class: 'switch__thumb' })));

      const row = (label, control) =>
        el('div', { class: 'setting' },
          el('span', { class: 'setting__label', text: label }),
          control);

      // <input type="date"> uses YYYY-MM-DD; display order follows browser locale and can't be overridden
      const date = (name, label) =>
        el('label', { class: 'datefield' },
          el('span', { class: 'datefield__label', text: label }),
          el('input', { type: 'date', class: 'dateinput', 'data-control': name }));

      return el('div', { class: 'settings' },
        el('p', { class: 'settings__warning' }),
        row('Target attendance',
          el('select', { class: 'select', 'data-control': 'target' },
            ...Widget.TARGETS.map((value) =>
              el('option', { value: String(value), text: `${value}%` })))),
        row('Count medical leave', toggle('medical')),
        el('div', { class: 'settings__rule' }),
        row('Internship OD', toggle('internship')),
        el('div', { class: 'settings__dates' }, date('from', 'Start'), date('till', 'End')),
        el('div', { class: 'settings__footer' },
          el('button', {
            class: 'linkbtn', type: 'button', 'data-action': 'reset', text: 'Reset all settings',
          })));
    }


    // progress bar with a target marker; returns handles to update both
    buildBar() {
      const fill = el('span', { class: 'bar__fill' });
      const target = el('span', { class: 'bar__target' });
      return {
        node: el('div', { class: 'bar' }, fill, target),
        set(percentage, targetPercent, delay) {
          const width = `${Math.min(Math.max(percentage, 0), 100)}%`;
          target.style.left = `${targetPercent}%`;
          fill.style.width = width;
          if (delay !== undefined && !Widget.reducedMotion()) {
            fill.animate([{ width: '0%' }, { width }], { ...Widget.SWEEP, delay });
          }
        },
      };
    }

    static reducedMotion() {
      return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    }

    // counts the percentage up alongside its bar, on the same curve
    static countUp(node, from, to) {
      node.__stop?.();
      node.textContent = `${to.toFixed(2)}%`;
      if (Widget.reducedMotion() || Math.abs(to - from) < 0.01) return;
      let frame = 0;
      const started = performance.now();
      const tick = (now) => {
        const progress = Math.min(1, (now - started) / Widget.SWEEP.duration);
        const eased = 1 - (1 - progress) ** 3;
        node.textContent = `${(from + (to - from) * eased).toFixed(2)}%`;
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      node.__stop = () => cancelAnimationFrame(frame);
    }

    $(selector) {
      return this.root.querySelector(selector);
    }

    bindEvents() {
      this.$('.actions').addEventListener('click', (event) => {
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (action === 'refresh') this.handlers.onRefresh?.();
        else if (action === 'settings') this.toggleSettings();
        else if (action === 'close') this.hide();
      });

      this.$('[data-control="target"]').addEventListener('change', (event) => {
        this.handlers.onTargetChange?.(Number(event.target.value));
      });

      this.$('[data-control="medical"]').addEventListener('change', (event) => {
        this.handlers.onMedicalChange?.(event.target.checked);
      });

      this.$('[data-action="reset"]').addEventListener('click', () => {
        this.handlers.onReset?.();
      });

      for (const name of ['internship', 'from', 'till']) {
        this.$(`[data-control="${name}"]`).addEventListener('change', () => {
          this.handlers.onInternshipChange?.({
            enabled: this.$('[data-control="internship"]').checked,
            from: this.$('[data-control="from"]').value,
            till: this.$('[data-control="till"]').value,
          });
        });
      }

      this.bindDragging();
    }

    bindDragging() {
      const widget = this.$('.widget');
      const header = this.$('.header');
      let origin = null;

      header.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        if (event.target.closest('button, select, label, input, a')) return;

        origin = {
          x: event.clientX - this.position.x,
          y: event.clientY - this.position.y,
        };
        try { header.setPointerCapture(event.pointerId); } catch { /* not capturable */ }
        widget.classList.add('is-dragging');
        event.preventDefault();
      });

      header.addEventListener('pointermove', (event) => {
        if (!origin) return;
        this.position = { x: event.clientX - origin.x, y: event.clientY - origin.y };
        this.applyPosition();
      });

      const end = (event) => {
        if (!origin) return;
        origin = null;
        try { header.releasePointerCapture(event.pointerId); } catch { /* never captured */ }
        widget.classList.remove('is-dragging');
        this.handlers.onMove?.(this.position);
      };

      header.addEventListener('pointerup', end);
      header.addEventListener('pointercancel', end);
    }

    // clamps to viewport so a saved position never strands the widget off-screen
    applyPosition() {
      if (!this.host) return;
      const width = this.host.offsetWidth || Widget.WIDTH;
      const maxX = Math.max(0, window.innerWidth - width);
      const maxY = Math.max(0, window.innerHeight - Widget.EDGE_MARGIN);
      this.position = {
        x: Math.min(Math.max(this.position.x, 0), maxX),
        y: Math.min(Math.max(this.position.y, 0), maxY),
      };
      this.host.style.transform = `translate3d(${this.position.x}px, ${this.position.y}px, 0)`;
    }

    show() { this.host?.removeAttribute('hidden'); }

    hide() { this.host?.setAttribute('hidden', ''); }

    toggle() {
      if (this.visible) this.hide();
      else this.show();
    }

    toggleSettings() {
      this.settingsOpen = !this.settingsOpen;
      this.$('.widget').classList.toggle('is-settings-open', this.settingsOpen);
      const button = this.$('[data-action="settings"]');
      button.title = this.settingsOpen ? 'Close settings' : 'Settings';
      button.setAttribute('aria-label', button.title);
    }

    setRefreshing(refreshing) {
      this.$('.widget')?.classList.toggle('is-refreshing', refreshing);
    }

    replayEntrance() {
      this.signature = null;
    }

    showSkeleton() {
      // drop any retained cards so the first real render plays its entrance
      this.signature = null;
      this.cards = new Map();
      const rows = [0, 1, 2].map(() => el('div', { class: 'skeleton__row' }));
      this.$('.list').replaceChildren(el('li', { class: 'skeleton' }, ...rows));
    }

    render(state) {
      if (!this.root) return;
      const { courses, target, includeMedical, internship, emptyMessage } = state;

      this.$('[data-control="target"]').value = String(target);
      this.$('[data-control="medical"]').checked = includeMedical;
      this.$('[data-control="internship"]').checked = internship.enabled;

      for (const [name, value] of [['from', internship.from], ['till', internship.till]]) {
        const input = this.$(`[data-control="${name}"]`);
        // only assign when it differs, so typing in the field is never fought
        if (input.value !== value) input.value = value;
        input.disabled = !internship.enabled;
      }

      this.$('.settings__dates').classList.toggle('is-disabled', !internship.enabled);
      this.$('.settings__warning').textContent = state.warning || '';

      this.renderCourses(courses, target, includeMedical, emptyMessage);
    }

    renderCourses(courses, target, includeMedical, emptyMessage) {
      const signature = courses.map((course) => course.courseCode).join('|');

      if (signature === this.signature && this.cards?.size === courses.length) {
        courses.forEach((course) => this.cards.get(course.courseCode)?.update(course, target, includeMedical));
        return;
      }

      this.signature = signature;
      this.cards = new Map();

      if (courses.length === 0) {
        this.$('.list').replaceChildren(
          el('li', { class: 'status', text: emptyMessage || 'No courses found on this page.' })
        );
        return;
      }

      const cards = courses.map((course, index) => {
        const card = this.buildCourse(course, target, includeMedical, index * Widget.STAGGER);
        this.cards.set(course.courseCode, card);
        return card.node;
      });
      this.$('.list').replaceChildren(...cards);
    }

    buildCourse(course, target, includeMedical, delay) {
      const bar = this.buildBar();
      const pct = el('span', { class: 'course__pct' });
      const code = el('span', { class: 'course__code' });
      const name = el('p', { class: 'course__name' });
      const tally = el('span');
      const badge = el('span', { class: 'course__od', hidden: true });
      const absent = el('span');
      const count = el('span', { class: 'course__count' }, tally, badge, absent);
      const verdict = el('span', { class: 'course__verdict' },
        el('span'), el('b'));

      const node = el('li', { class: 'course' },
        el('div', { class: 'course__top' }, code, pct),
        name,
        bar.node,
        el('div', { class: 'course__meta' }, count, verdict));

      let shown = 0;

      const update = (next, nextTarget, nextMedical, entering) => {
        node.className = `course is-${next.status}`;
        code.textContent = next.courseCode || `Course ${next.serialNumber}`;
        name.textContent = next.courseName;
        name.title = next.courseName;

        Widget.countUp(pct, entering ? 0 : shown, next.percentage);
        shown = next.percentage;

        bar.set(next.percentage, nextTarget, entering ? delay : undefined);

        count.title = Widget.describeTally(next, nextMedical);
        tally.textContent = `${next.attended}/${next.total}`;
        absent.textContent = `· ${next.effectiveAbsent} absent`;

        const appearing = badge.hidden && next.recoveredOD > 0;
        badge.hidden = next.recoveredOD <= 0;
        if (next.recoveredOD > 0) {
          badge.textContent = `+${next.recoveredOD} OD`;
          if (appearing && !entering && !Widget.reducedMotion()) {
            badge.animate([{ transform: 'scale(.7)', opacity: 0 }, { transform: 'none', opacity: 1 }],
              { duration: 200, easing: 'ease-out' });
          }
        }

        const below = next.status === 'danger';
        verdict.firstChild.textContent = below ? 'Attend ' : 'Can skip ';
        verdict.lastChild.textContent = String(below ? next.recovery : next.bunkable);
      };

      update(course, target, includeMedical, true);

      if (!Widget.reducedMotion()) {
        node.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
          { duration: 260, easing: 'ease-out', delay });
      }

      return { node, update };
    }

    static describeTally(course, includeMedical) {
      const parts = [`${course.present} present`];
      if (course.dutyLeave > 0) parts.push(`${course.dutyLeave} OD`);
      if (course.recoveredOD > 0) parts.push(`${course.recoveredOD} uncredited intern OD`);
      if (includeMedical && course.medical > 0) parts.push(`${course.medical} Medical`);
      return parts.length > 1 ? parts.join(' + ') : '';
    }

  };
})();
