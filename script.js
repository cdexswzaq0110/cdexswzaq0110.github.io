const root = document.documentElement;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const hero = document.querySelector(".hero");
const heroVisual = document.querySelector(".hero-visual");
const workSection = document.querySelector("#work");
const projectCards = [...document.querySelectorAll(".project-card")];
const projectVisuals = [...document.querySelectorAll(".project-visual")];
const projectCounter = document.querySelector("[data-project-count]");

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

let activeProjects = "";

function updateActiveProjects(indices) {
  const label = indices.map((index) => String(index + 1).padStart(2, "0")).join("–");

  if (!label || label === activeProjects) return;

  activeProjects = label;
  projectCards.forEach((card, index) => card.classList.toggle("is-active", indices.includes(index)));

  if (!projectCounter) return;

  projectCounter.textContent = label;
  projectCounter.animate?.(
    [
      { opacity: 0, transform: "translateY(35%)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    { duration: 320, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  );
}

function updateScrollProgress() {
  const scrollRange = root.scrollHeight - window.innerHeight;
  const progress = scrollRange > 0 ? window.scrollY / scrollRange : 0;

  root.style.setProperty("--scroll-progress", Math.min(Math.max(progress, 0), 1));
  document.body.classList.toggle("has-scrolled", window.scrollY > 16);
}

function updateMotionEffects() {
  if (!hero || reducedMotion.matches) return;

  const heroRange = Math.max(hero.offsetHeight - window.innerHeight * 0.25, 1);
  const heroProgress = clamp(window.scrollY / heroRange, 0, 1);
  const heroTravel = window.innerWidth > 700 ? 46 : 24;

  root.style.setProperty("--hero-copy-y", `${heroProgress * -heroTravel}px`);
  root.style.setProperty("--hero-image-y", `${heroProgress * 24}px`);
  root.style.setProperty("--hero-opacity", 1 - heroProgress * 0.38);

  const viewportCenter = window.innerHeight / 2;
  const cardMetrics = projectCards.map((card) => {
    const bounds = card.getBoundingClientRect();
    return Math.abs(bounds.top + bounds.height / 2 - viewportCenter);
  });
  const closestDistance = Math.min(...cardMetrics);
  const closestProjects = cardMetrics
    .map((distance, index) => ({ distance, index }))
    .filter(({ distance }) => distance - closestDistance < 12)
    .map(({ index }) => index);

  projectVisuals.forEach((visual) => {
    const bounds = visual.getBoundingClientRect();

    if (bounds.bottom < 0 || bounds.top > window.innerHeight) return;

    const distanceFromCenter = (bounds.top + bounds.height / 2 - viewportCenter) / window.innerHeight;
    visual.style.setProperty("--scroll-media-y", `${clamp(distanceFromCenter, -1, 1) * -22}px`);
  });

  const work = workSection?.getBoundingClientRect();
  if (work && work.top < window.innerHeight * 0.75 && work.bottom > window.innerHeight * 0.25) {
    updateActiveProjects(closestProjects);
  }
}

function updatePageState() {
  updateScrollProgress();
  updateMotionEffects();
}

let scrollFrame;
window.addEventListener(
  "scroll",
  () => {
    if (scrollFrame) return;

    scrollFrame = window.requestAnimationFrame(() => {
      updatePageState();
      scrollFrame = undefined;
    });
  },
  { passive: true },
);
window.addEventListener("resize", updatePageState);

updatePageState();

if (!reducedMotion.matches) {
  const heroItems = document.querySelectorAll(
    ".hero .eyebrow, .hero-line, .hero-lead, .hero-actions, .hero-visual",
  );
  const revealItems = document.querySelectorAll(
    ".section-heading, .section-intro, .project-card, .about-copy, " +
      ".skill-column, #faq article, .principles-grid article, " +
      ".contact-grid > *, .footer-inner",
  );
  const aboutStatement = document.querySelector(".about-statement");
  const observedItems = [...revealItems, ...(aboutStatement ? [aboutStatement] : [])];

  heroItems.forEach((item, index) => {
    item.classList.add("hero-reveal");
    item.style.setProperty("--reveal-delay", `${80 + index * 85}ms`);
  });
  revealItems.forEach((item) => item.classList.add("reveal"));
  aboutStatement?.classList.add("about-reveal");
  root.classList.add("motion-ready");

  window.requestAnimationFrame(() => {
    hero?.classList.add("is-visible");
    updateMotionEffects();
  });

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

    observedItems.forEach((item) => observer.observe(item));
  } else {
    observedItems.forEach((item) => item.classList.add("is-visible"));
  }

  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  if (finePointer.matches) {
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

if (!reducedMotion.matches) {
  root.classList.add("manual-page-transition");

  document.addEventListener("click", (event) => {
    const link = event.target instanceof Element ? event.target.closest("a[href]") : null;

    if (
      !link ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      link.target ||
      link.hasAttribute("download")
    ) {
      return;
    }

    const destination = new URL(link.href, window.location.href);
    const sameDocument =
      destination.pathname === window.location.pathname &&
      destination.search === window.location.search;

    if (destination.origin !== window.location.origin || sameDocument) return;

    event.preventDefault();
    document.body.classList.add("page-leaving");
    window.setTimeout(() => window.location.assign(destination.href), 220);
  });
}
