const root = document.documentElement;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function updateScrollProgress() {
  const scrollRange = root.scrollHeight - window.innerHeight;
  const progress = scrollRange > 0 ? window.scrollY / scrollRange : 0;

  root.style.setProperty("--scroll-progress", Math.min(Math.max(progress, 0), 1));
  document.body.classList.toggle("has-scrolled", window.scrollY > 16);
}

let scrollFrame;
window.addEventListener(
  "scroll",
  () => {
    if (scrollFrame) return;

    scrollFrame = window.requestAnimationFrame(() => {
      updateScrollProgress();
      scrollFrame = undefined;
    });
  },
  { passive: true },
);
window.addEventListener("resize", updateScrollProgress);

updateScrollProgress();

if (!reducedMotion.matches) {
  const hero = document.querySelector(".hero");
  const heroItems = document.querySelectorAll(
    ".hero .eyebrow, .hero-line, .hero-lead, .hero-actions, .hero-visual",
  );
  const revealItems = document.querySelectorAll(
    ".section-heading, .section-intro, .project-card, .about-statement, " +
      ".about-copy, .skill-column, #faq article, .principles-grid article, " +
      ".contact-grid > *, .footer-inner",
  );

  heroItems.forEach((item, index) => {
    item.classList.add("hero-reveal");
    item.style.setProperty("--reveal-delay", `${80 + index * 85}ms`);
  });
  revealItems.forEach((item) => item.classList.add("reveal"));
  root.classList.add("motion-ready");

  window.requestAnimationFrame(() => hero?.classList.add("is-visible"));

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8%", threshold: 0.12 },
    );

    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  if (finePointer.matches) {
    const heroVisual = document.querySelector(".hero-visual");

    heroVisual?.addEventListener("pointermove", (event) => {
      const bounds = heroVisual.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;

      heroVisual.style.setProperty("--portrait-x", `${x * 14}px`);
      heroVisual.style.setProperty("--portrait-y", `${y * 14}px`);
      heroVisual.style.setProperty("--frame-x", `${x * -9}px`);
      heroVisual.style.setProperty("--frame-y", `${y * -9}px`);
    });

    heroVisual?.addEventListener("pointerleave", () => {
      heroVisual.style.removeProperty("--portrait-x");
      heroVisual.style.removeProperty("--portrait-y");
      heroVisual.style.removeProperty("--frame-x");
      heroVisual.style.removeProperty("--frame-y");
    });

    document.querySelectorAll(".project-visual").forEach((visual) => {
      visual.addEventListener("pointermove", (event) => {
        const bounds = visual.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;

        visual.style.setProperty("--media-x", `${x * -8}px`);
        visual.style.setProperty("--media-y", `${y * -8}px`);
      });

      visual.addEventListener("pointerleave", () => {
        visual.style.removeProperty("--media-x");
        visual.style.removeProperty("--media-y");
      });
    });
  }
}
