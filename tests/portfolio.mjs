import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const expected = [
  [
    "system-design",
    "System Design",
    "https://github.com/cdexswzaq0110/build-moat-system-design-portfolio"
  ],
  [
    "algorithms",
    "Data Structures & Algorithms",
    "https://github.com/cdexswzaq0110/Data-Structures-Algorithms"
  ],
  [
    "serendipity",
    "Serendipity–Epiphany",
    "https://github.com/cdexswzaq0110/Serendipity-Epiphany"
  ],
  [
    "agent-kernel",
    "Agent Kernel",
    "https://github.com/cdexswzaq0110/Agent-System-Design"
  ],
  [
    "ordostack",
    "OrdoStack",
    "https://github.com/cdexswzaq0110/Ordostack"
  ],
  [
    "veloguard",
    "VeloGuard",
    "https://github.com/cdexswzaq0110/VeloGuard"
  ],
  [
    "esp8266",
    "ESP8266 Distance Sensor",
    "https://github.com/cdexswzaq0110/Arduino_obstacle_avoidance"
  ],
  [
    "indoor-positioning",
    "Indoor Positioning",
    "https://github.com/cdexswzaq0110/Indoor-Positioning-System"
  ],
  [
    "titanic",
    "Titanic Control Tower",
    "https://github.com/cdexswzaq0110/Titanic-ML-Control-Tower"
  ],
  [
    "house-prices",
    "House Prices",
    "https://github.com/cdexswzaq0110/House-Prices-Advanced-Regression-Techniques"
  ],
  [
    "signalweave",
    "SignalWeave",
    "https://github.com/cdexswzaq0110/SignalWeave"
  ],
  [
    "skin-lesion",
    "Skin Lesion Vision",
    "https://github.com/cdexswzaq0110/Skin-Lesion-Vision"
  ],
  [
    "thermoforge",
    "ThermoForge",
    "https://github.com/cdexswzaq0110/ThermoForge"
  ],
  [
    "more-projects",
    "More Projects",
    "https://github.com/cdexswzaq0110?tab=repositories"
  ]
];
const decode = (value) => value.replaceAll("&amp;", "&").replaceAll("&quot;", '"');
const cards = [...html.matchAll(/<article class="project-card"[^>]*>[\s\S]*?<\/article>/g)].map(([card]) => ({
  id: card.match(/id="project-([^"]+)"/)[1],
  title: decode(card.match(/<h3>(.*?)<\/h3>/)[1]),
  href: card.match(/href="([^"]+)"/)[1],
  tags: card.match(/data-tags="([^"]+)"/)[1].split(/\s+/),
  image: card.match(/src="([^"]+)"/)[1],
  alt: card.match(/alt="([^"]+)"/)[1],
}));
assert.deepEqual(cards.map(({id, title, href}) => [id, title, href]), expected,
  "Project order, display names, and GitHub destinations must match the approved collection.");
assert.equal(new Set(cards.map(card => card.id)).size, 14);
assert.equal(new Set(cards.map(card => card.image)).size, 14, "Covers must not be reused across projects.");
for (const card of cards) {
  assert.ok(statSync(resolve(root, card.image)).size > 0, `Missing image: ${card.image}`);
  assert.ok(card.alt.length > 20, `Missing descriptive alt text: ${card.id}`);
  assert.ok(html.includes(`href="#project-${card.id}"`), `Missing index link: ${card.id}`);
}
const filters = [...html.matchAll(/<button[^>]*data-filter="([^"]+)"[^>]*>[\s\S]*?<sup>(\d+)<\/sup>/g)];
assert.equal(filters.length, 4);
for (const [, filter, total] of filters) {
  const count = cards.filter(card => filter === "all" || card.tags.includes(filter)).length;
  assert.equal(Number(total), count, `Incorrect initial filter total: ${filter}`);
}
for (const [file, canonical] of [["index.html", ""], ["resume.html", "resume.html"], ["links.html", "links.html"]]) {
  assert.ok(readFileSync(resolve(root, file), "utf8").includes(`rel="canonical" href="https://cdexswzaq0110.github.io/${canonical}"`));
}
assert.ok(statSync(resolve(root, "google02af818ae84c33ec.html")).size > 0);
assert.ok(readFileSync(resolve(root, "robots.txt"), "utf8").includes("Sitemap: https://cdexswzaq0110.github.io/sitemap.xml"));
console.log("PASS: 14 ordered projects, unique covers, repository links, directory anchors, filter totals, and SEO files.");
