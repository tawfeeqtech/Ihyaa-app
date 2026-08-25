import fs from "node:fs";
const s = fs.readFileSync("node_modules/playwright-core/lib/coreBundle.js", "utf8");
// Find all occurrences of "matches(url" and print each with context
let i = s.indexOf("matches(url");
let count = 0;
while (i !== -1 && count < 10) {
  console.log("=== @" + i + " ===");
  console.log(s.slice(Math.max(0, i - 350), i + 250));
  console.log();
  i = s.indexOf("matches(url", i + 1);
  count++;
}
