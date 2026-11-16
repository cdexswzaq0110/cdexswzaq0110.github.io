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

Motion is enabled by default in the current owner-selected design, including
on a reduced-motion device. The footer's **Motion Off/On** control remembers the
visitor's explicit choice. The v3 content update does not change that behavior.

## Engineering cases (v3)

The homepage now has three bilingual, native `<details>` cases before the
unchanged project collection: VeloGuard, Agent Kernel, and ThermoForge.
Each separates the problem, decision, evidence, and limitation, with direct
repository sources. The results are project records, not production claims;
the Agent Kernel default is explicitly a mock-backed demonstration.
The hero links directly to the cases and the existing résumé PDF. LinkedIn
uses `https://www.linkedin.com/in/huayu-huang/` across all three pages,
structured data, the command menu, and the terminal.

The browser check also covers keyboard expansion, language switching, case
deep links, Grid/Map, command navigation, and the PDF response.
No new dependencies or image assets are required.

### Preserved version and rollback

Before this update, the complete site was tagged **`before-v3`** at
`cfc29b744160f051265620482671c0d00e9e2227`; the tag is also on GitHub.
The update is developed on `v3`. Existing image files, the PDF, gallery order,
color tokens, and motion-effect implementations are preserved. CSS additions
are scoped to the engineering cases and their links.

To inspect the exact changes, run `git diff before-v3 v3`.
If a rollback is requested after deployment, first check `git status`, then
revert the v3 content-update commit on `main` and run the checks before pushing.
Use `git revert`, not a force push or hard reset, so the history remains intact.
Do not revert subsequent unrelated commits. This documents a recovery path;
no rollback is performed by the update.

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
