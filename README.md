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
warm surfaces, clearer typography, a navigable index, and full-frame project images.
It reuses the existing vanilla HTML, CSS, and JavaScript interaction layer.
