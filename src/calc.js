globalThis.AttendEase = globalThis.AttendEase || {};

AttendEase.calc = (() => {
  // how far above target before a course is considered comfortable
  const WARNING_BUFFER = 5;

  // guards against floor/ceil flipping on exact floating-point values
  const EPSILON = 1e-9;

  // absences inside the internship window that the portal's capped Duty Leave column missed
  function recoveredOD(course, options) {
    if (!options.internshipOD) return 0;
    return Math.max(0, (course.internshipAbsences || 0) - course.dutyLeave);
  }

  // duty leave always counts, matching the portal's percentage column
  function attended(course, options) {
    const counted = course.present
      + course.dutyLeave
      + recoveredOD(course, options)
      + (options.countMedical ? course.medical : 0);
    return Math.min(counted, course.total);
  }

  function percentage(course, options) {
    if (course.total <= 0) return 0;
    return (attended(course, options) / course.total) * 100;
  }

  // max skippable: attended / (total + k) >= target/100  =>  k <= attended*100/target - total
  function bunkable(course, options) {
    if (course.total <= 0 || options.target <= 0) return 0;
    const slack = (attended(course, options) * 100) / options.target - course.total;
    return Math.max(0, Math.floor(slack + EPSILON));
  }

  // min to recover: (attended + k) / (total + k) >= target/100  =>  k >= (target*total - 100*attended) / (100 - target)
  function recovery(course, options) {
    if (course.total <= 0 || options.target >= 100) return 0;
    const deficit = options.target * course.total - 100 * attended(course, options);
    return Math.max(0, Math.ceil(deficit / (100 - options.target) - EPSILON));
  }

  function status(percent, target) {
    if (percent < target) return 'danger';
    if (percent < target + WARNING_BUFFER) return 'warning';
    return 'safe';
  }

  // decorates a raw course record with everything the widget needs to render
  function evaluate(course, options) {
    const counted = attended(course, options);
    const percent = percentage(course, options);
    return {
      ...course,
      attended: counted,
      recoveredOD: recoveredOD(course, options),
      effectiveAbsent: Math.max(0, course.total - counted),
      percentage: percent,
      status: status(percent, options.target),
      bunkable: bunkable(course, options),
      recovery: recovery(course, options),
    };
  }

  return { attended, recoveredOD, percentage, bunkable, recovery, status, evaluate };
})();
