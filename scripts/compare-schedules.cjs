// Compare schedule data between current version and PR
const fs = require("fs");

const current = JSON.parse(fs.readFileSync("static/data/ttc-schedules.json", "utf8"));
const pr = JSON.parse(fs.readFileSync("/tmp/pr-schedules.json", "utf8"));
const prData = fs.readFileSync("/tmp/pr-schedules.json", "utf8");

const currentStops = new Set(Object.keys(current));
const prStops = new Set(Object.keys(pr));

const removed = [...currentStops].filter(s => !prStops.has(s));
const added = [...prStops].filter(s => !currentStops.has(s));
const common = [...currentStops].filter(s => prStops.has(s));

let changed = 0;
const changedExamples = [];
common.forEach(stopId => {
  if (JSON.stringify(current[stopId]) !== JSON.stringify(pr[stopId])) {
    changed++;
    if (changedExamples.length < 3) {
      changedExamples.push({ stopId, before: current[stopId], after: pr[stopId] });
    }
  }
});

console.log("=== TTC Schedule Data Comparison ===\n");
console.log("File sizes:");
console.log("  Current: " + fs.statSync("static/data/ttc-schedules.json").size.toLocaleString() + " bytes");
console.log("  PR:      " + prData.length.toLocaleString() + " bytes\n");

console.log("Stop counts:");
console.log("  Current: " + currentStops.size);
console.log("  PR:      " + prStops.size + "\n");

console.log("Changes:");
console.log("  Stops removed: " + removed.length + (removed.length > 0 ? " (" + removed.slice(0, 5).join(", ") + ")" : ""));
console.log("  Stops added:   " + added.length + (added.length > 0 ? " (" + added.slice(0, 5).join(", ") + ")" : ""));
console.log("  Stops changed: " + changed + " of " + common.length + " (" + (changed / common.length * 100).toFixed(1) + "%)\n");

if (changedExamples.length > 0) {
  console.log("=== Sample Schedule Changes ===\n");
  changedExamples.forEach(({ stopId, before, after }) => {
    console.log("Stop " + stopId + ":");
    const routes = new Set([...Object.keys(before), ...Object.keys(after)]);
    routes.forEach(route => {
      const b = before[route] || {};
      const a = after[route] || {};
      if (JSON.stringify(b) !== JSON.stringify(a)) {
        console.log("  Route " + route + ":");
        if (b.weekday !== a.weekday) console.log("    weekday: " + (b.weekday || "none") + " → " + (a.weekday || "none"));
        if (b.saturday !== a.saturday) console.log("    saturday: " + (b.saturday || "none") + " → " + (a.saturday || "none"));
        if (b.sunday !== a.sunday) console.log("    sunday: " + (b.sunday || "none") + " → " + (a.sunday || "none"));
      }
    });
    console.log("");
  });
}

console.log("=== Summary ===");
if (changed === 0 && removed.length === 0 && added.length === 0) {
  console.log("✅ No meaningful changes - GTFS data is identical to current version");
} else {
  console.log("📊 GTFS data has been updated with schedule changes");
  console.log("   Review PR #1 at: https://github.com/shabanmohd/ttc-alerts-svelte/pull/1");
}
