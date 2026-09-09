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
    !document.body.classList.contains("is-loading"));

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "no-preference" });
    watch(page);
    await page.goto(url);
    await ready(page);
    assert.equal(await page.locator(".grain").evaluate(el => getComputedStyle(el).animationName), "grain-shift");
    const canvasBefore = await page.locator("canvas").evaluate(el => el.toDataURL());
    await page.waitForTimeout(200);
    assert.notEqual(await page.locator("canvas").evaluate(el => el.toDataURL()), canvasBefore, "Hero dot field must move.");

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

    const reduced = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    watch(reduced);
    await reduced.goto(url);
    assert.equal(await reduced.locator("html").evaluate(el => el.classList.contains("motion-ready")), false);
    assert.equal(await reduced.locator(".grain").evaluate(el => getComputedStyle(el).animationName), "none");
    const stillCanvas = await reduced.locator("canvas").evaluate(el => el.toDataURL());
    await reduced.waitForTimeout(200);
    assert.equal(await reduced.locator("canvas").evaluate(el => el.toDataURL()), stillCanvas);
    await reduced.locator('[data-filter="foundations"]').click();
    assert.equal(await reduced.locator(".project-card:not(.is-filtered)").count(), 2);
    assert.equal(await reduced.locator("[data-project-count]").evaluate(el => el.getAnimations().length), 0);
    await Promise.all([reduced.waitForEvent("load"), reduced.locator("[data-motion-toggle]").click()]);
    await ready(reduced);
    assert.equal(await reduced.evaluate(() => localStorage.getItem("th-motion")), "on");
    assert.equal(await reduced.locator(".grain").evaluate(el => getComputedStyle(el).animationName), "grain-shift");
    assert.ok((await reduced.locator('[data-filter="ml"]').evaluate(el => getComputedStyle(el).transitionProperty)).includes("background-size"), "Explicit Motion On must restore filter animation even when the OS requests reduced motion.");
    console.log("PASS: reduced-motion fallback and explicit Motion On preference.");

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "no-preference" });
    watch(mobile);
    await mobile.goto(url);
    await ready(mobile);
    await mobile.locator(".project-visual").first().scrollIntoViewIfNeeded();
    await mobile.waitForFunction(() => document.querySelector(".project-card").classList.contains("is-visible"));
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await mobile.locator('[data-filter="backend"]').click();
    assert.equal(await mobile.locator(".project-card:not(.is-filtered)").count(), 8);
    const noJS = await browser.newPage({ javaScriptEnabled: false });
    await noJS.goto(url);
    assert.equal(await noJS.locator(".project-card:visible").count(), 14);
    assert.deepEqual(errors, [], "No browser JavaScript errors.");
    console.log("PASS: mobile reveals/filtering, no horizontal overflow, and all 14 projects without JavaScript.");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
