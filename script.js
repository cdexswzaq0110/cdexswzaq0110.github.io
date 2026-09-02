/* ===============================================================
   TerryH Huang — portfolio interaction layer
   Dependency-free. Every effect is additive: with JavaScript off,
   reduced motion on, or a coarse pointer, the page stays complete,
   readable and crawlable.
   =============================================================== */

const root = document.documentElement;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
const motion = !reducedMotion.matches;

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);
const lerp = (from, to, amount) => from + (to - from) * amount;

/* ---------------------------------------------------------------
   1. One shared animation loop
   --------------------------------------------------------------- */

const frameTasks = new Set();
let frameId = null;
let lastFrame = 0;

function runFrame(now) {
  const delta = lastFrame ? clamp((now - lastFrame) / 16.667, 0.1, 4) : 1;
  lastFrame = now;

  frameTasks.forEach((task) => task(delta, now));

  frameId = frameTasks.size ? window.requestAnimationFrame(runFrame) : null;
}

function addFrameTask(task) {
  frameTasks.add(task);

  if (frameId === null) {
    lastFrame = 0;
    frameId = window.requestAnimationFrame(runFrame);
  }

  return () => frameTasks.delete(task);
}

/* ---------------------------------------------------------------
   2. Scroll state — position, progress, velocity
   --------------------------------------------------------------- */

const scrollState = { y: window.scrollY, velocity: 0, direction: 1, progress: 0 };

const hero = document.querySelector(".hero");
const heroVisual = document.querySelector(".hero-visual");
const workSection = document.querySelector("#work");
const projectGrid = document.querySelector("[data-project-grid]");
const projectCards = [...document.querySelectorAll(".project-card")];
const projectVisuals = [...document.querySelectorAll(".project-visual")];
const projectCounter = document.querySelector("[data-project-count]");
const projectTotal = document.querySelector("[data-project-total]");

let activeProjects = "";

function visibleCards() {
  return projectCards.filter((card) => !card.classList.contains("is-filtered"));
}

function updateActiveProjects(cards) {
  const label = cards
    .map((card) => String(projectCards.indexOf(card) + 1).padStart(2, "0"))
    .join("–");

  if (!label || label === activeProjects) return;

  activeProjects = label;
  projectCards.forEach((card) => card.classList.toggle("is-active", cards.includes(card)));

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

  scrollState.progress = clamp(progress, 0, 1);
  root.style.setProperty("--scroll-progress", scrollState.progress);
  document.body.classList.toggle("has-scrolled", window.scrollY > 16);
}

function updateMotionEffects() {
  if (!hero || !motion) return;

  const heroRange = Math.max(hero.offsetHeight - window.innerHeight * 0.25, 1);
  const heroProgress = clamp(window.scrollY / heroRange, 0, 1);
  const heroTravel = window.innerWidth > 700 ? 46 : 24;

  root.style.setProperty("--hero-copy-y", `${heroProgress * -heroTravel}px`);
  root.style.setProperty("--hero-image-y", `${heroProgress * 24}px`);
  root.style.setProperty("--hero-opacity", 1 - heroProgress * 0.38);

  const viewportCenter = window.innerHeight / 2;
  const cards = visibleCards();
  const cardMetrics = cards.map((card) => {
    const bounds = card.getBoundingClientRect();
    return Math.abs(bounds.top + bounds.height / 2 - viewportCenter);
  });

  projectVisuals.forEach((visual) => {
    const bounds = visual.getBoundingClientRect();

    if (bounds.bottom < 0 || bounds.top > window.innerHeight) return;

    const distanceFromCenter = (bounds.top + bounds.height / 2 - viewportCenter) / window.innerHeight;
    visual.style.setProperty("--scroll-media-y", `${clamp(distanceFromCenter, -1, 1) * -22}px`);
  });

  const work = workSection?.getBoundingClientRect();

  if (cardMetrics.length && work && work.top < window.innerHeight * 0.75 && work.bottom > window.innerHeight * 0.25) {
    const closestDistance = Math.min(...cardMetrics);
    updateActiveProjects(cards.filter((_, index) => cardMetrics[index] - closestDistance < 12));
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

/* Velocity + direction feed the marquee, the grid skew and the header. */
if (motion) {
  let smoothedVelocity = 0;
  let headerHidden = false;

  addFrameTask((delta) => {
    const y = window.scrollY;
    const raw = (y - scrollState.y) / delta;

    scrollState.y = y;
    smoothedVelocity = lerp(smoothedVelocity, raw, 0.18);
    scrollState.velocity = smoothedVelocity;

    if (Math.abs(raw) > 0.4) scrollState.direction = raw > 0 ? 1 : -1;

    if (projectGrid) {
      root.style.setProperty("--skew", `${clamp(smoothedVelocity * 0.025, -1.6, 1.6)}deg`);
    }

    const shouldHide = y > 420 && raw > 1.2;
    const shouldShow = raw < -1.2 || y < 120;

    if (shouldHide !== headerHidden && (shouldHide || shouldShow)) {
      headerHidden = shouldHide;
      document.body.classList.toggle("header-hidden", headerHidden);
    }
  });
}

/* ---------------------------------------------------------------
   3. Inertial scrolling (desktop pointers only)
   --------------------------------------------------------------- */

const smoothScroll = (() => {
  if (!motion || !finePointer.matches || window.matchMedia("(pointer: coarse)").matches) {
    return null;
  }

  let target = window.scrollY;
  let current = window.scrollY;
  let running = false;
  let programmatic = false;
  let stop = null;

  const limit = () => Math.max(root.scrollHeight - window.innerHeight, 0);

  function scrollsInternally(node) {
    while (node && node !== document.body && node !== root) {
      if (node instanceof Element) {
        const tag = node.tagName;

        if (tag === "IFRAME" || tag === "OBJECT" || tag === "EMBED" || tag === "TEXTAREA") return true;

        const overflow = window.getComputedStyle(node).overflowY;

        if ((overflow === "auto" || overflow === "scroll") && node.scrollHeight > node.clientHeight + 2) {
          return true;
        }
      }

      node = node.parentNode;
    }

    return false;
  }

  function frame(delta) {
    target = clamp(target, 0, limit());
    current = lerp(current, target, clamp(0.12 * delta, 0, 1));

    if (Math.abs(target - current) < 0.35) {
      current = target;
      stop?.();
      stop = null;
      running = false;
    }

    programmatic = true;
    window.scrollTo(0, current);
    programmatic = false;
  }

  function start() {
    if (running) return;

    running = true;
    stop = addFrameTask(frame);
  }

  function scrollTo(position) {
    target = clamp(position, 0, limit());
    start();
  }

  root.classList.add("lenis-active");

  window.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey || event.defaultPrevented || scrollsInternally(event.target)) return;

      const scale = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? window.innerHeight : 1;

      event.preventDefault();
      target = clamp(target + event.deltaY * scale, 0, limit());
      start();
    },
    { passive: false },
  );

  window.addEventListener(
    "scroll",
    () => {
      if (programmatic || running) return;

      target = window.scrollY;
      current = window.scrollY;
    },
    { passive: true },
  );

  window.addEventListener("resize", () => {
    target = clamp(target, 0, limit());
  });

  return { scrollTo, sync: () => { target = window.scrollY; current = window.scrollY; } };
})();

function headerOffset() {
  const header = document.querySelector(".site-header");
  return header ? header.offsetHeight + 24 : 24;
}

function goToAnchor(hash) {
  const id = hash.slice(1);
  const anchor = id ? document.getElementById(id) : null;

  if (!id) {
    if (smoothScroll) smoothScroll.scrollTo(0);
    else window.scrollTo({ top: 0, behavior: motion ? "smooth" : "auto" });
    return true;
  }

  if (!anchor) return false;

  const top = anchor.getBoundingClientRect().top + window.scrollY - (anchor === hero ? 0 : headerOffset());

  if (smoothScroll) smoothScroll.scrollTo(top);
  else window.scrollTo({ top, behavior: motion ? "smooth" : "auto" });

  return true;
}

document.addEventListener("click", (event) => {
  const link = event.target instanceof Element ? event.target.closest('a[href*="#"]') : null;

  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;

  const destination = new URL(link.href, window.location.href);

  if (
    destination.origin !== window.location.origin ||
    destination.pathname !== window.location.pathname ||
    !destination.hash
  ) {
    return;
  }

  if (!goToAnchor(destination.hash)) return;

  event.preventDefault();
  window.history.pushState(null, "", destination.hash);
});

/* ---------------------------------------------------------------
   4. Intro curtain
   --------------------------------------------------------------- */

function playIntro() {
  const preloader = document.querySelector("[data-preloader]");

  if (!preloader || !root.classList.contains("is-loading")) {
    root.classList.remove("is-loading");
    preloader?.remove();
    return Promise.resolve();
  }

  const counter = preloader.querySelector("[data-preloader-count]");
  const bar = preloader.querySelector("[data-preloader-bar]");
  const panels = [...preloader.querySelectorAll(".preloader-panels i")];

  panels.forEach((panel, index) => panel.style.setProperty("--panel-delay", `${index * 65}ms`));

  return new Promise((resolve) => {
    const started = performance.now();
    const duration = 1050;
    let finished = false;

    const finish = () => {
      if (finished) return;

      finished = true;
      remove();
      preloader.classList.add("is-done");
      root.classList.remove("is-loading");

      try {
        window.sessionStorage.setItem("th-intro", "1");
      } catch (error) {
        /* ignore — the intro simply replays next visit */
      }

      resolve();
      window.setTimeout(() => preloader.remove(), 1600);
    };

    const remove = addFrameTask((_, now) => {
      const progress = clamp((now - started) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      if (counter) counter.textContent = String(Math.round(eased * 100)).padStart(2, "0");
      if (bar) bar.style.setProperty("--load", eased);

      if (progress >= 1) finish();
    });

    /* Never let the curtain outstay its welcome. */
    window.setTimeout(finish, 2400);
  });
}

/* ---------------------------------------------------------------
   5. Split text
   --------------------------------------------------------------- */

function splitTextNodes(container, build) {
  [...container.childNodes].forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const parts = node.textContent.split(/(\s+)/).filter((part) => part.length);

      if (!parts.length) return;

      const fragment = document.createDocumentFragment();

      parts.forEach((part) => {
        if (/^\s+$/.test(part)) fragment.append(part);
        else fragment.append(build(part));
      });

      node.replaceWith(fragment);
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) splitTextNodes(node, build);
  });
}

function maskWord(word) {
  const outer = document.createElement("span");
  const inner = document.createElement("span");

  outer.className = "split-word";
  inner.className = "split-inner";
  inner.textContent = word;
  outer.append(inner);

  return outer;
}

function charWord(word) {
  const outer = document.createElement("span");

  outer.className = "split-word";

  [...word].forEach((character) => {
    const span = document.createElement("span");

    span.className = "split-char";
    span.textContent = character;
    outer.append(span);
  });

  return outer;
}

function applySplit(element) {
  const mode = element.dataset.split;

  if (mode === "lines") {
    const lines = [...element.children].filter((child) => child.classList.contains("hero-line"));

    lines.forEach((line, index) => {
      const inner = document.createElement("span");

      inner.className = "split-inner";
      inner.append(...line.childNodes);
      line.append(inner);
      line.classList.add("split-line");
      line.style.setProperty("--split-delay", `${120 + index * 110}ms`);
    });

    return;
  }

  if (mode === "words") {
    splitTextNodes(element, maskWord);
    element.querySelectorAll(".split-word").forEach((word, index) => {
      word.style.setProperty("--split-delay", `${index * 28}ms`);
    });

    return;
  }

  if (mode === "chars") {
    element.setAttribute("aria-label", element.textContent.replace(/\s+/g, " ").trim());
    splitTextNodes(element, charWord);
    element.classList.add("split-chars");
    element.querySelectorAll(".split-char").forEach((character, index) => {
      character.style.setProperty("--split-delay", `${index * 18}ms`);
    });
  }
}

/* ---------------------------------------------------------------
   6. Reveal on scroll
   --------------------------------------------------------------- */

const heroDelays = new Map([
  [".hero .eyebrow", 60],
  [".hero-lead", 420],
  [".hero-actions", 510],
  [".status-pill", 590],
  [".hero-visual", 180],
]);

function initReveals() {
  document.querySelectorAll("[data-split]").forEach(applySplit);

  heroDelays.forEach((delay, selector) => {
    const item = document.querySelector(selector);

    if (!item) return;

    item.classList.add("hero-reveal");
    item.style.setProperty("--reveal-delay", `${delay}ms`);
  });

  const revealItems = document.querySelectorAll(
    ".section-heading, .section-intro, .filter-bar, .project-card, .about-copy, " +
      ".skill-column, #faq article, .principles-grid article, .resume-block, " +
      ".publication-list > a, .link-groups > section, .page-hero .eyebrow, " +
      ".page-hero h1, .page-lead, .contact-grid > *, .footer-inner",
  );
  const aboutStatement = document.querySelector(".about-statement");
  const charTargets = [...document.querySelectorAll("[data-split='chars']")];

  revealItems.forEach((item) => item.classList.add("reveal"));
  aboutStatement?.classList.add("about-reveal");

  document.querySelectorAll(".skill-column").forEach((column, index) => {
    column.style.setProperty("--reveal-delay", `${index * 110}ms`);
  });

  const observed = [...revealItems, ...charTargets, ...(aboutStatement ? [aboutStatement] : [])];

  root.classList.add("motion-ready");

  if (!("IntersectionObserver" in window)) {
    observed.forEach((item) => item.classList.add("is-visible"));
    return;
  }

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

  observed.forEach((item) => observer.observe(item));
}

/* ---------------------------------------------------------------
   7. Hero dot field
   --------------------------------------------------------------- */

function initHeroCanvas() {
  const canvas = document.querySelector("[data-hero-canvas]");
  const context = canvas?.getContext?.("2d");

  if (!canvas || !context || !hero) return;

  const spacing = 30;
  const pointer = { x: -999, y: -999, strength: 0 };
  let width = 0;
  let height = 0;
  let stop = null;

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const bounds = hero.getBoundingClientRect();

    width = bounds.width;
    height = bounds.height;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function draw(_, now) {
    context.clearRect(0, 0, width, height);
    pointer.strength = lerp(pointer.strength, pointer.x < -500 ? 0 : 1, 0.08);

    const time = now * 0.00075;
    const columns = Math.ceil(width / spacing);
    const rows = Math.ceil(height / spacing);
    const radius = 170;

    for (let column = 0; column <= columns; column += 1) {
      for (let row = 0; row <= rows; row += 1) {
        const x = column * spacing;
        const y = row * spacing;
        const wave = Math.sin(x * 0.011 + y * 0.016 + time) * 0.5 + 0.5;

        let offsetX = 0;
        let offsetY = 0;
        let boost = 0;

        if (pointer.strength > 0.01) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const distance = Math.hypot(dx, dy);

          if (distance < radius) {
            const force = (1 - distance / radius) * pointer.strength;

            offsetX = (dx / (distance || 1)) * force * 16;
            offsetY = (dy / (distance || 1)) * force * 16;
            boost = force;
          }
        }

        const alpha = 0.05 + wave * 0.05 + boost * 0.35;
        const size = 0.9 + wave * 0.5 + boost * 1.5;

        context.beginPath();
        context.fillStyle = `rgba(17, 17, 17, ${alpha.toFixed(3)})`;
        context.arc(x + offsetX, y + offsetY, size, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  resize();

  hero.addEventListener("pointermove", (event) => {
    const bounds = hero.getBoundingClientRect();

    pointer.x = event.clientX - bounds.left;
    pointer.y = event.clientY - bounds.top;
  });

  hero.addEventListener("pointerleave", () => {
    pointer.x = -999;
    pointer.y = -999;
  });

  window.addEventListener("resize", () => {
    resize();
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !stop) stop = addFrameTask(draw);
        else if (!entry.isIntersecting && stop) {
          stop();
          stop = null;
        }
      },
      { threshold: 0 },
    ).observe(hero);
  } else {
    stop = addFrameTask(draw);
  }
}

/* ---------------------------------------------------------------
   8. Velocity-driven marquee
   --------------------------------------------------------------- */

function initMarquee() {
  const marquee = document.querySelector("[data-marquee]");
  const track = marquee?.querySelector("[data-marquee-track]");

  if (!marquee || !track) return;

  let trackWidth = 0;
  let offset = 0;

  function build() {
    marquee.querySelectorAll("[data-marquee-clone]").forEach((clone) => clone.remove());
    trackWidth = track.getBoundingClientRect().width;

    if (!trackWidth) return;

    const copies = Math.ceil((window.innerWidth * 2) / trackWidth) + 1;

    for (let index = 0; index < copies; index += 1) {
      const clone = track.cloneNode(true);

      clone.setAttribute("aria-hidden", "true");
      clone.setAttribute("data-marquee-clone", "");
      marquee.append(clone);
    }
  }

  build();

  let resizeTimer;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(build, 200);
  });

  function run(delta) {
    if (!trackWidth) return;

    const speed = (0.55 + clamp(Math.abs(scrollState.velocity) * 0.05, 0, 5)) * scrollState.direction;

    offset -= speed * delta;
    offset = ((offset % trackWidth) + trackWidth) % trackWidth - trackWidth;
    marquee.style.setProperty("--marquee-x", `${offset}px`);
  }

  /* Translating a 7,000px strip is the most expensive loop on the page —
     only pay for it while the band is actually on screen. */
  if ("IntersectionObserver" in window) {
    let stop = null;

    new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !stop) {
          stop = addFrameTask(run);
        } else if (!entry.isIntersecting && stop) {
          stop();
          stop = null;
        }
      },
      { threshold: 0 },
    ).observe(marquee.closest(".marquee-band") || marquee);

    return;
  }

  addFrameTask(run);
}

/* ---------------------------------------------------------------
   9. Project filter with FLIP transitions
   --------------------------------------------------------------- */

function initFilter() {
  const chips = [...document.querySelectorAll("[data-filter]")];

  if (!projectGrid || !chips.length) return;

  function apply(filter) {
    const before = new Map(projectCards.map((card) => [card, card.getBoundingClientRect()]));

    projectCards.forEach((card) => {
      const tags = (card.dataset.tags || "").split(/\s+/);
      const visible = filter === "all" || tags.includes(filter);

      card.classList.toggle("is-filtered", !visible);
    });

    chips.forEach((chip) => {
      const active = chip.dataset.filter === filter;

      chip.classList.toggle("is-active", active);
      chip.setAttribute("aria-pressed", String(active));
    });

    const shown = visibleCards();

    if (projectTotal) projectTotal.textContent = String(shown.length).padStart(2, "0");

    if (!motion || typeof projectGrid.animate !== "function") {
      updatePageState();
      return;
    }

    shown.forEach((card, index) => {
      const previous = before.get(card);
      const next = card.getBoundingClientRect();

      card.classList.add("is-visible");

      if (!previous || previous.width === 0) {
        card.animate(
          [
            { opacity: 0, transform: "translate3d(0, 1.6rem, 0) scale(0.97)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: 560, delay: index * 45, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards" },
        );
        return;
      }

      const dx = previous.left - next.left;
      const dy = previous.top - next.top;

      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

      card.animate(
        [{ transform: `translate3d(${dx}px, ${dy}px, 0)` }, { transform: "none" }],
        { duration: 640, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
    });

    updatePageState();
  }

  chips.forEach((chip) => chip.addEventListener("click", () => apply(chip.dataset.filter)));
}

/* ---------------------------------------------------------------
   10. Pointer flourishes — cursor, magnets, tilt, scramble
   --------------------------------------------------------------- */

function initCursor() {
  const cursor = document.querySelector("[data-cursor]");

  if (!cursor || !window.CSS?.supports?.("mix-blend-mode", "difference")) return;

  root.classList.add("has-cursor");
  cursor.classList.add("is-hidden");

  const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const ring = { x: pointer.x, y: pointer.y };
  const label = cursor.querySelector(".cursor-text");

  document.addEventListener(
    "pointermove",
    (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      cursor.classList.remove("is-hidden");
      cursor.style.setProperty("--cursor-x", `${pointer.x}px`);
      cursor.style.setProperty("--cursor-y", `${pointer.y}px`);
    },
    { passive: true },
  );

  document.addEventListener("pointerdown", () => cursor.classList.add("is-down"));
  document.addEventListener("pointerup", () => cursor.classList.remove("is-down"));
  document.addEventListener("pointerleave", () => cursor.classList.add("is-hidden"));

  document.addEventListener("pointerover", (event) => {
    if (!(event.target instanceof Element)) return;

    const labelled = event.target.closest("[data-cursor-label]");
    const interactive = event.target.closest("a, button, input, summary");

    if (labelled) {
      if (label) label.textContent = labelled.dataset.cursorLabel;
      cursor.classList.add("is-labelled");
      cursor.classList.remove("is-hover");
      return;
    }

    cursor.classList.remove("is-labelled");
    cursor.classList.toggle("is-hover", Boolean(interactive));
  });

  addFrameTask((delta) => {
    ring.x = lerp(ring.x, pointer.x, clamp(0.16 * delta, 0, 1));
    ring.y = lerp(ring.y, pointer.y, clamp(0.16 * delta, 0, 1));
    cursor.style.setProperty("--ring-x", `${ring.x.toFixed(2)}px`);
    cursor.style.setProperty("--ring-y", `${ring.y.toFixed(2)}px`);
  });
}

function initMagnets() {
  document.querySelectorAll("[data-magnetic]").forEach((element) => {
    const reset = () => {
      element.style.removeProperty("--mx");
      element.style.removeProperty("--my");
    };

    element.addEventListener("pointermove", (event) => {
      const bounds = element.getBoundingClientRect();
      const x = event.clientX - bounds.left - bounds.width / 2;
      const y = event.clientY - bounds.top - bounds.height / 2;

      element.style.setProperty("--mx", `${clamp(x * 0.32, -18, 18)}px`);
      element.style.setProperty("--my", `${clamp(y * 0.42, -12, 12)}px`);
    });

    element.addEventListener("pointerleave", reset);
    element.addEventListener("blur", reset);
  });
}

function initHeroParallax() {
  if (!heroVisual) return;

  heroVisual.addEventListener("pointermove", (event) => {
    const bounds = heroVisual.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;

    heroVisual.style.setProperty("--portrait-x", `${x * 14}px`);
    heroVisual.style.setProperty("--portrait-y", `${y * 14}px`);
    heroVisual.style.setProperty("--frame-x", `${x * -9}px`);
    heroVisual.style.setProperty("--frame-y", `${y * -9}px`);
  });

  heroVisual.addEventListener("pointerleave", () => {
    ["--portrait-x", "--portrait-y", "--frame-x", "--frame-y"].forEach((name) =>
      heroVisual.style.removeProperty(name),
    );
  });
}

function initTilt() {
  document.querySelectorAll("[data-tilt]").forEach((element) => {
    const surface = element.closest("a") || element;

    surface.addEventListener("pointermove", (event) => {
      const bounds = element.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;

      element.style.setProperty("--tilt-x", `${clamp(-y * 9, -6, 6)}deg`);
      element.style.setProperty("--tilt-y", `${clamp(x * 9, -6, 6)}deg`);
      element.style.setProperty("--media-x", `${x * -10}px`);
      element.style.setProperty("--media-y", `${y * -10}px`);
    });

    surface.addEventListener("pointerleave", () => {
      element.style.removeProperty("--tilt-x");
      element.style.removeProperty("--tilt-y");
      element.style.removeProperty("--media-x");
      element.style.removeProperty("--media-y");
    });
  });
}

const scrambleGlyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*+/";

function initScramble() {
  document.querySelectorAll("[data-scramble]").forEach((element) => {
    const node = [...element.childNodes].find(
      (child) => child.nodeType === Node.TEXT_NODE && child.textContent.trim(),
    );

    if (!node) return;

    const original = node.textContent;
    const trimmed = original.trim();
    const start = original.indexOf(trimmed);
    const lead = original.slice(0, start);
    const tail = original.slice(start + trimmed.length);
    let stop = null;

    element.addEventListener("pointerenter", () => {
      if (stop) return;

      const bounds = element.getBoundingClientRect();

      element.style.display = "inline-block";
      element.style.minWidth = `${Math.ceil(bounds.width)}px`;

      const began = performance.now();

      stop = addFrameTask((_, now) => {
        const progress = clamp((now - began) / 420, 0, 1);
        const settled = Math.floor(progress * trimmed.length);

        node.textContent =
          lead +
          [...trimmed]
            .map((character, index) => {
              if (index < settled || character === " ") return character;
              return scrambleGlyphs[Math.floor(Math.random() * scrambleGlyphs.length)];
            })
            .join("") +
          tail;

        if (progress >= 1) {
          node.textContent = original;
          stop?.();
          stop = null;
        }
      });
    });
  });
}

/* ---------------------------------------------------------------
   11. Section rail
   --------------------------------------------------------------- */

function initRail() {
  const rail = document.querySelector("[data-rail]");

  if (!rail) return;

  const links = [...rail.querySelectorAll("a")];
  const targets = links
    .map((link) => ({ link, section: document.querySelector(link.getAttribute("href")) }))
    .filter((entry) => entry.section);

  if (!targets.length) return;

  /* Every ink-backed band the rail can float over, so it flips to light. */
  const darkBands = [...document.querySelectorAll(".about-section, .marquee-band, .site-footer")];

  addFrameTask(() => {
    const line = window.innerHeight * 0.42;
    let active = targets[0];

    targets.forEach((entry) => {
      if (entry.section.getBoundingClientRect().top <= line) active = entry;
    });

    targets.forEach(({ link }) => link.classList.toggle("is-active", link === active.link));

    const middle = window.innerHeight / 2;

    rail.classList.toggle(
      "is-inverted",
      darkBands.some((band) => {
        const bounds = band.getBoundingClientRect();
        return bounds.top < middle && bounds.bottom > middle;
      }),
    );
  });
}

/* ---------------------------------------------------------------
   12. Floating link preview (links page)
   --------------------------------------------------------------- */

function initLinkPreview() {
  const sources = [...document.querySelectorAll("[data-preview]")];

  if (!sources.length) return;

  const preview = document.createElement("div");

  preview.className = "link-preview";
  preview.setAttribute("aria-hidden", "true");

  const images = new Map();

  sources.forEach((source) => {
    const image = document.createElement("img");

    image.src = source.dataset.preview;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    preview.append(image);
    images.set(source, image);
  });

  document.body.append(preview);

  const pointer = { x: 0, y: 0 };
  const position = { x: 0, y: 0 };
  let visible = false;

  sources.forEach((source) => {
    source.addEventListener("pointerenter", (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;

      if (!visible) {
        position.x = pointer.x;
        position.y = pointer.y;
      }

      images.forEach((image, key) => image.classList.toggle("is-current", key === source));
      preview.style.setProperty("--preview-rotate", `${(Math.random() * 8 - 4).toFixed(2)}deg`);
      preview.classList.add("is-visible");
      visible = true;
    });

    source.addEventListener("pointerleave", () => {
      preview.classList.remove("is-visible");
      visible = false;
    });
  });

  document.addEventListener(
    "pointermove",
    (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    },
    { passive: true },
  );

  addFrameTask((delta) => {
    if (!visible) return;

    position.x = lerp(position.x, pointer.x, clamp(0.12 * delta, 0, 1));
    position.y = lerp(position.y, pointer.y, clamp(0.12 * delta, 0, 1));
    preview.style.setProperty("--preview-x", `${position.x.toFixed(1)}px`);
    preview.style.setProperty("--preview-y", `${position.y.toFixed(1)}px`);
  });
}

/* ---------------------------------------------------------------
   13. Page transitions
   --------------------------------------------------------------- */

function initPageTransition() {
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

/* ---------------------------------------------------------------
   14. Boot
   --------------------------------------------------------------- */

initFilter();

if (!motion) {
  root.classList.remove("is-loading");
  document.querySelector("[data-preloader]")?.remove();
} else {
  initReveals();
  initHeroCanvas();
  initMarquee();
  initRail();
  initPageTransition();

  if (finePointer.matches) {
    initCursor();
    initMagnets();
    initHeroParallax();
    initTilt();
    initScramble();
    initLinkPreview();
  }

  playIntro().then(() => {
    hero?.classList.add("is-visible");
    smoothScroll?.sync();
    updatePageState();
  });

  window.addEventListener("load", () => {
    smoothScroll?.sync();
    updatePageState();
  });
}
