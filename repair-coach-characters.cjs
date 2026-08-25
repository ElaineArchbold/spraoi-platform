const fs = require("fs");

const path = "./apps/coach/src/App.jsx";
fs.copyFileSync(path, path + ".before-full-mojibake-repair.bak");

let text = fs.readFileSync(path, "utf8");

// Reverse Windows-1252 mapping.
// This lets us reconstruct the original UTF-8 bytes from strings such as:
// âŒ‚  -> ⌂
// â—«  -> ◫
// â˜…  -> ★
// Ã—   -> ×
// Â·   -> ·
const cp1252Extra = {
  "\u20AC": 0x80,
  "\u201A": 0x82,
  "\u0192": 0x83,
  "\u201E": 0x84,
  "\u2026": 0x85,
  "\u2020": 0x86,
  "\u2021": 0x87,
  "\u02C6": 0x88,
  "\u2030": 0x89,
  "\u0160": 0x8A,
  "\u2039": 0x8B,
  "\u0152": 0x8C,
  "\u017D": 0x8E,
  "\u2018": 0x91,
  "\u2019": 0x92,
  "\u201C": 0x93,
  "\u201D": 0x94,
  "\u2022": 0x95,
  "\u2013": 0x96,
  "\u2014": 0x97,
  "\u02DC": 0x98,
  "\u2122": 0x99,
  "\u0161": 0x9A,
  "\u203A": 0x9B,
  "\u0153": 0x9C,
  "\u017E": 0x9E,
  "\u0178": 0x9F
};

function cp1252Byte(ch) {
  const code = ch.codePointAt(0);

  if (code <= 0x7F) return code;
  if (code >= 0xA0 && code <= 0xFF) return code;

  return cp1252Extra[ch] ?? null;
}

function decodeMojibakeRun(run) {
  const bytes = [];

  for (const ch of run) {
    const b = cp1252Byte(ch);
    if (b === null) return run;
    bytes.push(b);
  }

  const repaired = Buffer.from(bytes).toString("utf8");

  // Never introduce replacement characters.
  if (repaired.includes("\uFFFD")) return run;

  const beforeBad = (run.match(/[ÂÃâð]/g) || []).length;
  const afterBad = (repaired.match(/[ÂÃâð]/g) || []).length;

  return afterBad < beforeBad ? repaired : run;
}

function repairPass(input) {
  // Mojibake appears as short runs of non-ASCII characters.
  return input.replace(
    /[ÂÃâð][^\x00-\x7F]{1,8}/g,
    decodeMojibakeRun
  );
}

// Some text has been corrupted more than once, so make up to 3 safe passes.
for (let i = 0; i < 3; i++) {
  const repaired = repairPass(text);
  if (repaired === text) break;
  text = repaired;
}

// Clean a few UI labels that do not need decorative symbols at all.
text = text.replace(
  /\{pitchView\s*\?\s*"[^"]*List"\s*:\s*"[^"]*Pitch"\s*\}/g,
  '{pitchView ? "List" : "Pitch"}'
);

fs.writeFileSync(path, text, "utf8");

const remaining = text
  .split(/\r?\n/)
  .map((line, i) => ({ line: i + 1, text: line }))
  .filter(x => /[ÂÃâð]/.test(x.text));

console.log("Coach mojibake repair complete.");
console.log("Remaining suspicious lines:", remaining.length);

remaining.slice(0, 30).forEach(x => {
  console.log(`${x.line}: ${x.text.trim()}`);
});
