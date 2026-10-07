const loader = document.querySelector('#site-loader');
const fill = document.querySelector('#loader-fill');
const percent = document.querySelector('#loader-percent');

if (loader && fill && percent) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = reducedMotion ? 0 : 4500;
  const start = performance.now();

  const finish = () => {
    document.body.classList.remove('is-loading');
    document.body.classList.add('site-ready');
    loader.setAttribute('aria-hidden', 'true');
    loader.addEventListener('transitionend', () => loader.remove(), {once: true});
    if (reducedMotion) loader.remove();
  };

  const update = now => {
    const progress = duration === 0 ? 1 : Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 2.2);
    const value = Math.round(eased * 100);
    fill.style.transform = `scaleX(${value / 100})`;
    percent.textContent = `${value}%`;
    loader.setAttribute('aria-valuenow', String(value));

    if (progress < 1) requestAnimationFrame(update);
    else {
      fill.style.transform = 'scaleX(1)';
      percent.textContent = '100%';
      loader.setAttribute('aria-valuenow', '100');
      window.setTimeout(finish, reducedMotion ? 0 : 140);
    }
  };

  requestAnimationFrame(update);
}
