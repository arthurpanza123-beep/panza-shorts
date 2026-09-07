(() => {
  const canvas = document.querySelector('#sparks');
  const context = canvas.getContext('2d');
  if (!context) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let width, height, particles, frame, previous = 0;

  function particle(randomHeight = false) {
    return {
      x: Math.random() * width,
      y: randomHeight ? Math.random() * height : height + 12,
      speed: 9 + Math.random() * 18,
      drift: 2 + Math.random() * 5,
      length: 2 + Math.random() * 5,
      alpha: .22 + Math.random() * .38,
      phase: Math.random() * Math.PI * 2,
      silver: Math.random() > .75,
    };
  }

  function draw(delta, time) {
    context.clearRect(0, 0, width, height);
    for (const spark of particles) {
      spark.y -= spark.speed * delta;
      spark.x += spark.drift * delta;
      if (spark.y < -12 || spark.x > width + 12) Object.assign(spark, particle());
      const fade = Math.min(1, Math.max(0, spark.y / 110), Math.max(0, (height - spark.y) / 75));
      const alpha = spark.alpha * fade * (.8 + .2 * Math.sin(time * .0008 + spark.phase));
      context.strokeStyle = spark.silver ? `rgba(224,221,205,${alpha})` : `rgba(220,147,65,${alpha})`;
      context.lineWidth = .8;
      context.beginPath();
      context.moveTo(spark.x, spark.y);
      context.lineTo(spark.x - spark.length * .28, spark.y + spark.length);
      context.stroke();
    }
  }

  function tick(time) {
    if (time - previous >= 32) {
      draw(Math.min((time - previous) / 1000, .05), time);
      previous = time;
    }
    frame = requestAnimationFrame(tick);
  }

  function resume() {
    cancelAnimationFrame(frame);
    previous = performance.now();
    draw(0, previous);
    if (!motion.matches && !document.hidden) frame = requestAnimationFrame(tick);
  }

  function resize() {
    width = innerWidth;
    height = innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    particles = Array.from({ length: width < 600 ? 32 : 85 }, () => particle(true));
    resume();
  }

  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', resume);
  motion.addEventListener('change', resume);
  resize();
})();
