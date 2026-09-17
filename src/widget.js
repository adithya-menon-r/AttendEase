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
    chevron: ['M4 6.5 8 10.5l4-4'],
    close: ['m4 4 8 8', 'M12 4l-8 8'],
  };

  return class Widget {
    static HOST_ID = 'attendease-root';
    static TARGETS = [75, 80, 85, 90, 95];

    // minimum pixels of header kept on screen so the widget stays grabbable
    static EDGE_MARGIN = 40;
    static WIDTH = 360;

    constructor(handlers = {}) {
      this.handlers = handlers;
      this.host = null;
      this.root = null;
      this.position = { x: 0, y: 0 };
      this.collapsed = false;
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
          el('span', { class: 'brand', text: 'AttendEase' }),
          el('div', { class: 'actions' },
            button('refresh', 'Refresh', ICONS.refresh),
            button('collapse', 'Collapse', ICONS.chevron),
            button('close', 'Hide', ICONS.close))),
        el('div', { class: 'body' },
          el('div', { class: 'controls' },
            el('label', { class: 'field' },
              el('span', { class: 'field__label', text: 'Target' }),
              el('select', { class: 'select', 'data-control': 'target' },
                ...Widget.TARGETS.map((value) =>
                  el('option', { value: String(value), text: `${value}%` })))),
            el('label', { class: 'switch', title: 'Count medical leave as attended' },
              el('input', { type: 'checkbox', 'data-control': 'medical' }),
              el('span', { class: 'switch__track' }, el('span', { class: 'switch__thumb' })),
              el('span', { class: 'switch__label', text: 'Medical' }))),
          el('ul', { class: 'list' })));
    }

    // progress bar with a target marker; returns handles to update both
    buildBar() {
      const fill = el('span', { class: 'bar__fill' });
      const target = el('span', { class: 'bar__target' });
      return {
        node: el('div', { class: 'bar' }, fill, target),
        set(percentage, targetPercent) {
          fill.style.width = `${Math.min(Math.max(percentage, 0), 100)}%`;
          target.style.left = `${targetPercent}%`;
        },
      };
    }

    $(selector) {
      return this.root.querySelector(selector);
    }

    bindEvents() {
      this.$('.actions').addEventListener('click', (event) => {
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (action === 'refresh') this.handlers.onRefresh?.();
        else if (action === 'collapse') this.toggleCollapsed();
        else if (action === 'close') this.hide();
      });

      this.$('[data-control="target"]').addEventListener('change', (event) => {
        this.handlers.onTargetChange?.(Number(event.target.value));
      });

      this.$('[data-control="medical"]').addEventListener('change', (event) => {
        this.handlers.onMedicalChange?.(event.target.checked);
      });

      this.bindDragging();
    }

    // pointer capture keeps move/up on the header — no document listeners, touch works for free
    bindDragging() {
      const widget = this.$('.widget');
      const header = this.$('.header');
      let origin = null;

      header.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        if (event.target.closest('button, select, label, input')) return;

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

    toggleCollapsed() {
      this.collapsed = !this.collapsed;
      this.$('.widget').classList.toggle('is-collapsed', this.collapsed);
      const button = this.$('[data-action="collapse"]');
      button.title = this.collapsed ? 'Expand' : 'Collapse';
      button.setAttribute('aria-label', button.title);
    }

    setRefreshing(refreshing) {
      this.$('.widget')?.classList.toggle('is-refreshing', refreshing);
    }

    showSkeleton() {
      const rows = [0, 1, 2].map(() => el('div', { class: 'skeleton__row' }));
      this.$('.list').replaceChildren(el('li', { class: 'skeleton' }, ...rows));
    }

    render(state) {
      if (!this.root) return;
      const { courses, target, includeMedical, emptyMessage } = state;

      this.$('[data-control="target"]').value = String(target);
      this.$('[data-control="medical"]').checked = includeMedical;

      this.$('.list').replaceChildren(
        ...(courses.length === 0
          ? [el('li', { class: 'status', text: emptyMessage || 'No courses found on this page.' })]
          : courses.map((course) => this.buildCourse(course, target, includeMedical)))
      );
    }

    buildCourse(course, target, includeMedical) {
      const bar = this.buildBar();
      bar.set(course.percentage, target);

      return el('li', { class: `course is-${course.status}` },
        el('div', { class: 'course__top' },
          el('span', { class: 'course__code', text: course.courseCode || `Course ${course.serialNumber}` }),
          el('span', { class: 'course__pct', text: `${course.percentage.toFixed(2)}%` })),
        el('p', { class: 'course__name', text: course.courseName, title: course.courseName }),
        bar.node,
        el('div', { class: 'course__meta' },
          el('span', {
            class: 'course__count',
            text: `${course.attended}/${course.total} · ${course.absent} absent`,
            title: Widget.describeTally(course, includeMedical),
          }),
          Widget.buildVerdict(course)));
    }

    // breakdown shown on hover over the tally
    static describeTally(course, includeMedical) {
      const parts = [`${course.present} present`];
      if (course.dutyLeave > 0) parts.push(`${course.dutyLeave} duty leave`);
      if (includeMedical && course.medical > 0) parts.push(`${course.medical} medical leave`);
      return `${parts.join(' + ')} of ${course.total} classes`;
    }

    static buildVerdict(course) {
      const below = course.status === 'danger';
      return el('span', { class: 'course__verdict' },
        el('span', { text: below ? 'Attend ' : 'Can skip ' }),
        el('b', { text: String(below ? course.recovery : course.bunkable) }));
    }
  };
})();
