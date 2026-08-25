const fs = require("fs");

const path = "./apps/coach/src/App.jsx";

fs.copyFileSync(
  path,
  path + ".before-remove-planner-quick-builder.bak"
);

let text = fs.readFileSync(path, "utf8");

const plannerStart = text.indexOf("function PlannerScreen");

if (plannerStart === -1) {
  console.log("STOP: PlannerScreen not found");
  process.exit(1);
}

let plannerEnd = text.indexOf("\nfunction ", plannerStart + 30);
if (plannerEnd === -1) plannerEnd = text.length;

let planner = text.slice(plannerStart, plannerEnd);

// Remove the entire right-hand quick session builder block.
const quickBuilderStart = planner.indexOf(
  "{buildingDate && ("
);

if (quickBuilderStart === -1) {
  console.log("WARNING: quick builder block not found");
} else {
  let i = quickBuilderStart;
  let depth = 0;
  let foundStart = false;
  let endIndex = -1;

  for (; i < planner.length; i++) {
    const pair = planner.slice(i, i + 2);

    if (pair === "({") {
      depth++;
      foundStart = true;
      i++;
      continue;
    }

    if (pair === "})") {
      depth--;

      if (foundStart && depth <= 0) {
        endIndex = i + 2;
        break;
      }

      i++;
    }
  }

  // Fallback: use the next known section marker if bracket scan doesn't work.
  if (endIndex === -1) {
    const fallback = planner.indexOf(
      "{sessionDetail &&",
      quickBuilderStart
    );

    if (fallback !== -1) {
      endIndex = fallback;
    }
  }

  if (endIndex === -1) {
    console.log("STOP: could not determine end of quick builder");
    process.exit(1);
  }

  planner =
    planner.slice(0, quickBuilderStart) +
    planner.slice(endIndex);

  console.log("OK: Planner quick session builder removed");
}

// Ensure top button goes to Sessions.
planner = planner.replace(
  /<Btn label="New Session" variant="primary" onClick=\{\(\) => onNav\("coach-sessions"\)\} \/>/g,
  '<Btn label="New Session" variant="primary" onClick={() => onNav("coach-sessions")} />'
);

// Remove any click behaviour that opens quick builder by selecting a date.
// Dates should only open existing session details.
planner = planner.replace(
  /setBuildingDate\([^;]+\);?/g,
  ""
);

text =
  text.slice(0, plannerStart) +
  planner +
  text.slice(plannerEnd);

fs.writeFileSync(path, text, "utf8");

console.log("DONE: Planner now has no embedded New Session panel");
