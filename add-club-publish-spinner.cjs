const fs = require("fs");

const path = "./apps/club/src/ClubScheduling.jsx";

if (!fs.existsSync(path)) {
  console.log("STOP: ClubScheduling.jsx not found");
  return;
}

let text = fs.readFileSync(path, "utf8");

fs.copyFileSync(
  path,
  path + ".before-publish-spinner.bak"
);

/* ============================================================
   1. Add publishing state
   ============================================================ */

const stateMarker = `function ClubScheduling`;

const componentStart = text.indexOf(stateMarker);

if (componentStart === -1) {
  console.log("STOP: ClubScheduling component not found");
  return;
}

const firstUseState = text.indexOf("useState(", componentStart);

if (firstUseState === -1) {
  console.log("STOP: no useState found in ClubScheduling");
  return;
}

const lineStart = text.lastIndexOf("\n", firstUseState) + 1;

if (!text.includes("const [publishingWeek, setPublishingWeek]")) {
  text =
    text.slice(0, lineStart) +
    `  const [publishingWeek, setPublishingWeek] = useState(false);\n` +
    text.slice(lineStart);

  console.log("OK: publishing state added");
}


/* ============================================================
   2. Wrap publishWeek with loading state
   ============================================================ */

const publishStart =
  text.indexOf("  async function publishWeek");

if (publishStart === -1) {
  console.log("STOP: publishWeek not found");
  return;
}

const bodyStart = text.indexOf("{", publishStart);

if (bodyStart === -1) {
  console.log("STOP: publishWeek body not found");
  return;
}

const afterBrace = bodyStart + 1;

if (
  !text.slice(
    afterBrace,
    afterBrace + 180
  ).includes("setPublishingWeek(true)")
) {
  text =
    text.slice(0, afterBrace) +
    `
    if (publishingWeek) return;

    setPublishingWeek(true);

    try {
` +
    text.slice(afterBrace);

  let depth = 1;
  let end = -1;

  for (let i = afterBrace + 1; i < text.length; i++) {
    if (text[i] === "{") depth++;
    if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end === -1) {
    console.log("STOP: publishWeek end not found");
    return;
  }

  text =
    text.slice(0, end) +
    `
    } finally {
      setPublishingWeek(false);
    }
` +
    text.slice(end);

  console.log("OK: publishWeek loading wrapper added");
}


/* ============================================================
   3. Replace Publish button label with spinner
   ============================================================ */

text = text.replace(
  /label=\{?"Publish Week"\}?/g,
  `label={publishingWeek ? "Publishing..." : "Publish Week"}`
);

text = text.replace(
  /disabled=\{([^}]*)\}/g,
  (match, inner) => {
    if (
      match.includes("publishingWeek") ||
      !match.includes("Publish")
    ) {
      return match;
    }
    return match;
  }
);

/* Handle normal <button> Publish Week */
text = text.replace(
  />\s*Publish Week\s*<\/button>/g,
  `>
    {publishingWeek && (
      <span
        style={{
          width: 14,
          height: 14,
          border: "2px solid rgba(255,255,255,.45)",
          borderTopColor: "#fff",
          borderRadius: "50%",
          display: "inline-block",
          marginRight: 7,
          animation: "spraoiPublishSpin .7s linear infinite"
        }}
      />
    )}
    {publishingWeek ? "Publishing..." : "Publish Week"}
  </button>`
);


/* ============================================================
   4. Add spinner CSS once
   ============================================================ */

if (!text.includes("@keyframes spraoiPublishSpin")) {
  const returnMarker = "return (";

  const returnPos = text.indexOf(returnMarker, componentStart);

  if (returnPos !== -1) {
    text =
      text.slice(0, returnPos) +
      `const publishSpinnerStyle = (
    <style>{\`
      @keyframes spraoiPublishSpin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    \`}</style>
  );

  ` +
      text.slice(returnPos);

    text = text.replace(
      /return\s*\(\s*<>/,
      `return (
    <>
      {publishSpinnerStyle}`
    );

    console.log("OK: spinner animation added");
  }
}


/* ============================================================
   5. Disable Publish button while publishing
   ============================================================ */

text = text.replace(
  /onClick=\{publishWeek\}/g,
  `onClick={publishWeek} disabled={publishingWeek}`
);

text = text.replace(
  /onClick=\{\(\)\s*=>\s*publishWeek\(\)\}/g,
  `onClick={() => publishWeek()} disabled={publishingWeek}`
);

fs.writeFileSync(path, text, "utf8");

console.log("");
console.log("============================");
console.log("PUBLISH SPINNER ADDED");
console.log("============================");
