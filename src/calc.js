globalThis.AttendEase = globalThis.AttendEase || {};

AttendEase.calc = (() => {
  // how far above target before a course is considered comfortable
  const WARNING_BUFFER = 5;

  // guards against floor/ceil flipping on exact floating-point values
  const EPSILON = 1e-9;

  function attended(course, includeMedical) {
    return course.present + course.dutyLeave + (includeMedical ? course.medical : 0);
  }

  function percentage(course, includeMedical) {
    if (course.total <= 0) return 0;
    return (attended(course, includeMedical) / course.total) * 100;
  }

  // max classes skippable while staying at or above target:
  //   attended / (total + k) >= target/100  =>  k <= attended*100/target - total
  function bunkable(course, target, includeMedical) {
    if (course.total <= 0 || target <= 0) return 0;
    const slack = (attended(course, includeMedical) * 100) / target - course.total;
    return Math.max(0, Math.floor(slack + EPSILON));
  }

  // min classes to attend consecutively to climb back to target:
  //   (attended + k) / (total + k) >= target/100  =>  k >= (target*total - 100*attended) / (100 - target)
  function recovery(course, target, includeMedical) {
    if (course.total <= 0 || target >= 100) return 0;
    const deficit = target * course.total - 100 * attended(course, includeMedical);
    return Math.max(0, Math.ceil(deficit / (100 - target) - EPSILON));
  }

  function status(percent, target) {
    if (percent < target) return 'danger';
    if (percent < target + WARNING_BUFFER) return 'warning';
    return 'safe';
  }

  // decorates a raw course record with everything the widget needs to render
  function evaluate(course, target, includeMedical) {
    const percent = percentage(course, includeMedical);
    return {
      ...course,
      attended: attended(course, includeMedical),
      percentage: percent,
      status: status(percent, target),
      bunkable: bunkable(course, target, includeMedical),
      recovery: recovery(course, target, includeMedical),
    };
  }

  return { attended, percentage, bunkable, recovery, status, evaluate };
})();
