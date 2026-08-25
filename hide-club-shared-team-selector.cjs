const fs = require("fs");

const candidates = [
  "./apps/admin/src/App.jsx",
  "./apps/admin/src/main.jsx"
];

let path = candidates.find(fs.existsSync);

if (!path) {
  console.log("STOP: Admin shell file not found");
  process.exit(1);
}

let text = fs.readFileSync(path, "utf8");

fs.copyFileSync(
  path,
  path + ".before-hide-club-team-selector.bak"
);

/*
Find TEAM-labelled selector in the shared Admin shell.
Instead of deleting it, hide it whenever Club is active.
*/

const teamRegex =
  /(<div[^>]*>[\s\S]{0,1200}?>\s*TEAM\s*<[\s\S]{0,1800}?<\/select>[\s\S]{0,500}?<\/div>)/i;

const match = text.match(teamRegex);

if (!match) {
  console.log("STOP: shared TEAM selector block not found");
  process.exit(1);
}

const original = match[1];

const replacement =
`{activeModule !== "club" && (
  <>
${original}
  </>
)}`;

text = text.replace(original, replacement);

fs.writeFileSync(path, text, "utf8");

console.log(
  "OK: shared TEAM selector hidden when Club is active"
);
