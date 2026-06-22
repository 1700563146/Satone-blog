const elements = document.querySelectorAll<HTMLElement>('[data-reveal]');

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12 }
  );

  for (const element of elements) {
    observer.observe(element);
  }
} else {
  for (const element of elements) {
    element.classList.add('is-visible');
  }
}
