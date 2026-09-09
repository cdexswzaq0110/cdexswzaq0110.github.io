# TerryH Huang — Portfolio

Personal portfolio published with GitHub Pages.

## Preview and check

Serve this directory with `python -m http.server 8765 --bind 127.0.0.1`, then open
`http://127.0.0.1:8765/`. There is no build step or package install.

Run `node --check script.js` and `node tests/portfolio.mjs` before publishing.
The collection check covers project order, display names, repository destinations,
unique cover files, index anchors, filter totals, and retained SEO files.
For interface changes, also check filtering, index navigation, mobile menu,
keyboard focus, reduced motion, and a JavaScript-disabled page in a browser.

With Playwright available to Node and Google Chrome installed, run
`node tests/motion.cjs` against the preview. Set `PORTFOLIO_URL` to test another
deployment. This browser check samples actual frames for image parallax, card
tilt, inertial scrolling, grid skew, and the hero dot field; it also checks
filter transitions, the project counter, mobile, and reduced-motion behavior.
No browser-test dependency is shipped to the website.

Motion follows the OS accessibility preference by default. On a reduced-motion
device, the footer's **Motion On** control explicitly enables the original
motion layer for that browser. Its choice survives a reload.

## Project collection

The homepage contains 14 entries in the curated order defined in `index.html`.
The project index and category controls navigate the same collection.
GitHub repository names appear beneath the shorter display titles.
Megumi's existing cover is retained; it is outside this homepage selection.

The September 2026 covers and generation prompts are documented in
[`docs/project-covers.md`](docs/project-covers.md).
The original SignalWeave cover remains at `assets/signalweave.webp`;
the new homepage cover is `assets/signalweave-v2.webp`.

The project gallery follows TasteSkill's
[existing-project redesign guidance](https://github.com/Leonxlnx/taste-skill/tree/main/skills/redesign-skill):
warm surfaces, clearer typography, a navigable index, and architectural project images.
It reuses the existing vanilla HTML, CSS, and JavaScript interaction layer.
Keep the project image transforms and the grid's velocity-driven skew when
adjusting gallery styles. Use `background-image`, not the `background` shorthand,
for filter color changes so the original sweeping fill animation is preserved.
