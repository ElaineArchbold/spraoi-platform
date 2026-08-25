const fs = require("fs");

const path = "./apps/coach/src/App.jsx";
let text = fs.readFileSync(path, "utf8");

fs.copyFileSync(
  path,
  path + ".before-edit-session-date-lock.bak"
);

/*
  When editing an existing session:
  - derive day from session_date
  - derive weekOffset from session_date
  - keep Builder anchored to that session
*/

const marker = `  useEffect(() => {
    if (!editingSession) return;`;

const pos = text.indexOf(marker);

if (pos === -1) {
  console.log("STOP: editingSession hydration effect not found");
  return;
}

const effectEnd = text.indexOf("\n  }, [editingSession", pos);

if (effectEnd === -1) {
  console.log("STOP: editingSession effect end not found");
  return;
}

let block = text.slice(pos, effectEnd);

if (!block.includes("sessionDateForEdit")) {
  block = block.replace(
    marker,
`  useEffect(() => {
    if (!editingSession) return;

    const sessionDateForEdit = editingSession.session_date;

    if (sessionDateForEdit) {
      const target = new Date(\`\${sessionDateForEdit}T12:00:00\`);
      const today = new Date();

      const todayMonday = new Date(today);
      const todayDay = todayMonday.getDay();
      const todayDelta = todayDay === 0 ? -6 : 1 - todayDay;
      todayMonday.setDate(todayMonday.getDate() + todayDelta);
      todayMonday.setHours(12, 0, 0, 0);

      const targetMonday = new Date(target);
      const targetDay = targetMonday.getDay();
      const targetDelta = targetDay === 0 ? -6 : 1 - targetDay;
      targetMonday.setDate(targetMonday.getDate() + targetDelta);
      targetMonday.setHours(12, 0, 0, 0);

      const diffWeeks = Math.round(
        (targetMonday.getTime() - todayMonday.getTime()) /
        (7 * 24 * 60 * 60 * 1000)
      );

      const dayNames = [
        "Sun",
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat"
      ];

      setWeekOffset(diffWeeks);
      setDay(dayNames[target.getDay()]);
    }`
  );

  text =
    text.slice(0, pos) +
    block +
    text.slice(effectEnd);

  console.log("OK: editing session now locks Builder to its date");
} else {
  console.log("OK: edit-date lock already present");
}

fs.writeFileSync(path, text, "utf8");
