const assert = require("node:assert/strict");
const { chromium } = require("playwright");

// Run against the local preview by default; the same checks can verify Pages.
const url = process.env.PORTFOLIO_URL || "http://127.0.0.1:8765/";

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [];
  const watch = (page) => page.on("pageerror", (error) => errors.push(error.message));
  const ready = (page) => page.waitForFunction(() =>
    document.documentElement.classList.contains("motion-ready") &&
    document.querySelector(".hero").classList.contains("is-visible") &&
    !document.documentElement.classList.contains("is-loading"));

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "no-preference" });
    watch(page);
    await page.goto(url);
    await ready(page);
    assert.equal(await page.locator(".grain").evaluate(el => getComputedStyle(el).animationName), "grain-shift");
    const canvasBefore = await page.locator(".hero-canvas").evaluate(el => el.toDataURL());
    await page.waitForTimeout(200);
    assert.notEqual(await page.locator(".hero-canvas").evaluate(el => el.toDataURL()), canvasBefore, "Hero dot field must move.");

    const visual = page.locator(".project-visual").first();
    const image = visual.locator("img");
    await visual.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector(".project-card").classList.contains("is-visible"));
    await page.waitForTimeout(1000);
    const bounds = await visual.boundingBox();
    await page.mouse.move(bounds.x + bounds.width * 0.2, bounds.y + bounds.height * 0.3);
    await page.waitForTimeout(250);
    const imageBefore = await image.evaluate(el => getComputedStyle(el).transform);
    const tiltBefore = await visual.evaluate(el => getComputedStyle(el).transform);
    await page.mouse.move(bounds.x + bounds.width * 0.8, bounds.y + bounds.height * 0.7);
    await page.waitForTimeout(250);
    assert.notEqual(await image.evaluate(el => getComputedStyle(el).transform), imageBefore, "Project image must follow the pointer.");
    assert.notEqual(await visual.evaluate(el => getComputedStyle(el).transform), tiltBefore, "Project surface must tilt.");

    await page.evaluate(() => {
      window.motionFrames = [];
      function sample() {
        window.motionFrames.push({
          y: window.scrollY,
          skew: new DOMMatrix(getComputedStyle(document.querySelector(".project-grid")).transform).b,
          parallax: getComputedStyle(document.querySelector(".project-visual")).getPropertyValue("--scroll-media-y"),
        });
        if (window.motionFrames.length < 60) requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    });
    await page.mouse.wheel(0, 260);
    await page.waitForFunction(() => window.motionFrames.length === 60);
    const frames = await page.evaluate(() => window.motionFrames);
    assert.ok(new Set(frames.map(frame => frame.y)).size > 3, "Wheel scrolling must interpolate across frames.");
    assert.ok(frames.some(frame => Math.abs(frame.skew) > 0.001), "Grid must skew while scrolling.");
    assert.ok(new Set(frames.map(frame => frame.parallax)).size > 3, "Scroll parallax must update across frames.");

    const filter = page.locator('[data-filter="ml"]');
    await filter.scrollIntoViewIfNeeded();
    await page.mouse.move(10, 10);
    await page.waitForTimeout(500);
    assert.notEqual(await filter.evaluate(el => getComputedStyle(el).backgroundImage), "none");
    assert.equal(await filter.evaluate(el => getComputedStyle(el).backgroundSize), "100% 0%");
    await filter.hover();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-filter="ml"]')).backgroundSize === "100% 100%");
    assert.ok((await filter.evaluate(el => getComputedStyle(el).transitionProperty)).includes("background-size"));
    await filter.click();
    assert.equal(await page.locator(".project-card:not(.is-filtered)").count(), 8);
    assert.equal(await page.locator("[data-project-total]").textContent(), "08");
    assert.ok(await page.locator(".project-grid").evaluate(el => el.getAnimations({ subtree: true }).length > 0), "Filtering must animate the cards.");
    await page.waitForTimeout(1000);
    const counterBefore = await page.locator("[data-project-count]").textContent();
    await page.locator(".project-card:not(.is-filtered)").last().scrollIntoViewIfNeeded();
    await page.waitForFunction(before => document.querySelector("[data-project-count]").textContent !== before, counterBefore);
    const indices = (await page.locator("[data-project-count]").textContent()).split("–").map(Number);
    assert.ok(indices.every(index => index >= 1 && index <= 8), "Counter must use filtered positions, not original card numbers.");
    console.log("PASS: desktop dot field, grain, pointer tilt, image parallax, inertial scroll, grid skew, filter sweep, card transitions, and counter.");

    const summary = page.locator("#case-agent-kernel > summary");
    await summary.scrollIntoViewIfNeeded();
    await summary.focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#case-agent-kernel").evaluate(el => el.open), true);
    await page.locator("[data-lang-toggle]").click();
    assert.equal(await page.locator("html").getAttribute("lang"), "zh-Hant");
    assert.ok((await summary.textContent()).includes("每一步"));
    assert.ok((await page.locator("#case-agent-kernel .case-content").textContent()).includes("離線模擬"));
    assert.equal(await page.locator("#case-agent-kernel").evaluate(el => el.open), true, "Language switching must preserve the open case.");
    await page.locator("[data-lang-toggle]").click();
    await summary.focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#case-agent-kernel").evaluate(el => el.open), false);

    await page.locator('[data-filter="all"]').click();
    await page.locator('[data-view="map"]').click();
    assert.equal(await page.locator("#work").evaluate(el => el.classList.contains("is-map")), true);
    assert.equal(await page.locator(".map-list a").count(), 13);
    await page.locator('[data-view="grid"]').click();
    assert.equal(await page.locator(".project-card:not(.is-filtered)").count(), 14);
    await page.keyboard.press("Control+k");
    await page.locator(".cmdk input").fill("Engineering cases");
    await page.keyboard.press("Enter");
    await page.waitForURL("**/#engineering");
    assert.equal(await page.locator('.hero-actions a[download]').getAttribute("href"), "assets/Huang_Hua_Yu_Resume.pdf");
    const pdf = await page.request.get(new URL("assets/Huang_Hua_Yu_Resume.pdf", url).href);
    assert.equal(pdf.status(), 200);
    assert.equal((await pdf.body()).subarray(0, 5).toString(), "%PDF-");
    console.log("PASS: keyboard-operated cases, Chinese/English round trip, existing Grid/Map, command menu, and real PDF download.");

    const reduced = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    watch(reduced);
    // Preserve the owner's existing motion-on default; verify the explicit off/on control.
    await reduced.addInitScript(() => {
      if (!localStorage.getItem("th-motion")) localStorage.setItem("th-motion", "off");
    });
    await reduced.goto(url);
    assert.equal(await reduced.locator("html").evaluate(el => el.classList.contains("motion-ready")), false);
    assert.equal(await reduced.locator(".grain").evaluate(el => getComputedStyle(el).animationName), "none");
    const stillCanvas = await reduced.locator(".hero-canvas").evaluate(el => el.toDataURL());
    await reduced.waitForTimeout(200);
    assert.equal(await reduced.locator(".hero-canvas").evaluate(el => el.toDataURL()), stillCanvas);
    await reduced.locator('[data-filter="foundations"]').click();
    assert.equal(await reduced.locator(".project-card:not(.is-filtered)").count(), 2);
    assert.equal(await reduced.locator("[data-project-count]").evaluate(el => el.getAnimations().length), 0);
    await Promise.all([reduced.waitForEvent("load"), reduced.locator("[data-motion-toggle]").click()]);
    await ready(reduced);
    assert.equal(await reduced.evaluate(() => localStorage.getItem("th-motion")), "on");
    assert.equal(await reduced.locator(".grain").evaluate(el => getComputedStyle(el).animationName), "grain-shift");
    assert.ok((await reduced.locator('[data-filter="ml"]').evaluate(el => getComputedStyle(el).transitionProperty)).includes("background-size"), "Explicit Motion On must restore filter animation even when the OS requests reduced motion.");
    console.log("PASS: explicit Motion Off/On with OS reduced-motion enabled.");

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "no-preference" });
    watch(mobile);
    await mobile.goto(url);
    await ready(mobile);
    await mobile.locator("#case-thermoforge > summary").click();
    assert.equal(await mobile.locator("#case-thermoforge").evaluate(el => el.open), true);
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await mobile.locator(".project-visual").first().scrollIntoViewIfNeeded();
    await mobile.waitForFunction(() => document.querySelector(".project-card").classList.contains("is-visible"));
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await mobile.locator('[data-filter="backend"]').click();
    assert.equal(await mobile.locator(".project-card:not(.is-filtered)").count(), 8);
    const noJS = await browser.newPage({ javaScriptEnabled: false });
    await noJS.goto(url);
    assert.equal(await noJS.locator(".project-card:visible").count(), 14);
    await noJS.locator("#case-agent-kernel > summary").click();
    assert.equal(await noJS.locator("#case-agent-kernel .case-content").isVisible(), true);
    await page.goto(new URL("index.html#case-agent-kernel", url).href);
    assert.equal(await page.locator("#case-agent-kernel").evaluate(el => el.open), true, "A résumé deep link must open its case.");
    for (const file of ["resume.html", "links.html"]) {
      await page.goto(new URL(file, url).href);
      assert.ok(await page.locator('a[href="https://www.linkedin.com/in/huayu-huang/"]').count());
    }
    assert.deepEqual(errors, [], "No browser JavaScript errors.");
    console.log("PASS: mobile cases/reveals/filtering, no overflow, no-JS content, deep links, and profile links on all pages.");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
