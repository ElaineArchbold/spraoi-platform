const fs = require("fs");

const path = "./apps/club/src/App.jsx";
let text = fs.readFileSync(path, "utf8");

fs.copyFileSync(
  path,
  path + ".before-remove-club-sidebar-team-selector.bak"
);

/* Find Club Sidebar only */
const sidebarStart = text.indexOf("function Sidebar(");

if (sidebarStart === -1) {
  console.log("STOP: Club Sidebar function not found");
  return;
}

let sidebarEnd = text.indexOf("\nfunction ", sidebarStart + 20);

if (sidebarEnd === -1) {
  console.log("STOP: end of Club Sidebar not found");
  return;
}

let sidebar = text.slice(sidebarStart, sidebarEnd);

/*
  Find the literal TEAM label within the sidebar.
*/
const teamPos = sidebar.search(/>\s*TEAM\s*</i);

if (teamPos === -1) {
  console.log("WARNING: TEAM label not found inside Club Sidebar");
} else {

  /*
    Work backwards to the opening container immediately
    surrounding the TEAM label.
  */
  const blockStart = sidebar.lastIndexOf("<div", teamPos);

  /*
    Find the select following TEAM.
  */
  const selectStart = sidebar.indexOf("<select", teamPos);
  const selectEnd =
    selectStart !== -1
      ? sidebar.indexOf("</select>", selectStart)
      : -1;

  if (
    blockStart === -1 ||
    selectStart === -1 ||
    selectEnd === -1
  ) {
    console.log(
      "STOP: could not safely identify Club team selector block"
    );
    return;
  }

  /*
    Find the closing div after the select.
  */
  const afterSelect = selectEnd + "</select>".length;
  const blockEnd = sidebar.indexOf("</div>", afterSelect);

  if (blockEnd === -1) {
    console.log("STOP: selector container end not found");
    return;
  }

  sidebar =
    sidebar.slice(0, blockStart) +
    sidebar.slice(blockEnd + "</div>".length);

  console.log(
    "OK: Club left-rail TEAM selector removed"
  );
}

text =
  text.slice(0, sidebarStart) +
  sidebar +
  text.slice(sidebarEnd);

fs.writeFileSync(path, text, "utf8");

console.log("");
console.log("CLUB SIDEBAR CLEANUP COMPLETE");
