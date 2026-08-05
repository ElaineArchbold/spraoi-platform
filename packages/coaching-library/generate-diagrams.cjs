/**
 * Spraoi Drill Diagram Generator
 * Generates SVG pitch diagrams for all 182 activities.
 * 
 * Run: node generate-diagrams.cjs
 * 
 * Output: ./diagrams/ folder with one SVG per activity
 * 
 * The generator parses the diagram_description to determine layout:
 * - "pairs" → 2 players facing each other
 * - "circle" / "ring" → players in a circle
 * - "grid" / "square" → grid formation
 * - "line" / "relay" → players in lines
 * - "goals" / "score" → pitch with goals
 * - Default → scattered station layout
 */

const fs = require("fs");
const path = require("path");

const LIB = path.join(__dirname, "kiro-v1", "Spraoi_Sports_Kiro_Library_v1", "library");
const OUT = path.join(__dirname, "diagrams");

// Spraoi colours
const COLORS = {
  pitch: "#4a9835",
  pitchLight: "#5cb347",
  line: "rgba(255,255,255,0.4)",
  lineStrong: "rgba(255,255,255,0.6)",
  player1: "#073B74",  // navy - team A
  player2: "#079CE0",  // blue - team B
  cone: "#FF7A00",     // orange
  ball: "#FFB400",     // gold
  arrow: "#ffffff",
  arrowBall: "#FFB400",
  text: "#ffffff",
};

function detectLayout(desc) {
  const d = (desc || "").toLowerCase();
  if (d.includes("circle") || d.includes("ring")) return "circle";
  if (d.includes("pair") || d.includes("partner")) return "pairs";
  if (d.includes("grid") || d.includes("square") || d.includes("swap")) return "grid";
  if (d.includes("line") || d.includes("relay") || d.includes("queue")) return "lines";
  if (d.includes("goal") || d.includes("score") || d.includes("shoot")) return "goals";
  if (d.includes("zig") || d.includes("zag") || d.includes("agility")) return "zigzag";
  if (d.includes("1 v 1") || d.includes("one on one") || d.includes("1v1") || d.includes("opposed")) return "oneVone";
  return "stations";
}

function detectPlayerCount(desc) {
  const d = (desc || "").toLowerCase();
  if (d.includes("24")) return 12;
  if (d.includes("16")) return 8;
  if (d.includes("12")) return 6;
  return 4;
}

function detectHasWall(desc) {
  return (desc || "").toLowerCase().includes("wall");
}

function detectHasCones(desc) {
  const d = (desc || "").toLowerCase();
  return d.includes("cone") || d.includes("marker");
}

// SVG helpers
function svgStart(w = 400, h = 300) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`;
}

function pitchBg(w = 400, h = 300) {
  return `
  <rect width="${w}" height="${h}" fill="${COLORS.pitch}" rx="12"/>
  <rect x="10" y="10" width="${w - 20}" height="${h - 20}" fill="none" stroke="${COLORS.line}" stroke-width="1.5" rx="6"/>
  <line x1="${w / 2}" y1="10" x2="${w / 2}" y2="${h - 10}" stroke="${COLORS.line}" stroke-width="1"/>
  <circle cx="${w / 2}" cy="${h / 2}" r="30" fill="none" stroke="${COLORS.line}" stroke-width="1"/>`;
}

function player(x, y, label, color = COLORS.player1) {
  return `
  <circle cx="${x}" cy="${y}" r="12" fill="${color}" stroke="#fff" stroke-width="2"/>
  <text x="${x}" y="${y + 4}" text-anchor="middle" fill="#fff" font-size="9" font-weight="800" font-family="sans-serif">${label}</text>`;
}

function cone(x, y) {
  return `<polygon points="${x},${y - 8} ${x - 6},${y + 5} ${x + 6},${y + 5}" fill="${COLORS.cone}" stroke="#fff" stroke-width="1"/>`;
}

function ball(x, y) {
  return `<circle cx="${x}" cy="${y}" r="6" fill="${COLORS.ball}" stroke="#fff" stroke-width="1.5"/>`;
}

function arrow(x1, y1, x2, y2, dashed = false) {
  const dash = dashed ? 'stroke-dasharray="5,4"' : '';
  const color = dashed ? COLORS.arrowBall : COLORS.arrow;
  // Arrowhead
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 8;
  const ax = x2 - headLen * Math.cos(angle - 0.4);
  const ay = y2 - headLen * Math.sin(angle - 0.4);
  const bx = x2 - headLen * Math.cos(angle + 0.4);
  const by = y2 - headLen * Math.sin(angle + 0.4);
  return `
  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2" ${dash} opacity="0.8"/>
  <polygon points="${x2},${y2} ${ax},${ay} ${bx},${by}" fill="${color}" opacity="0.8"/>`;
}

function label(x, y, text, size = 10) {
  return `<text x="${x}" y="${y}" text-anchor="middle" fill="#fff" font-size="${size}" font-weight="700" font-family="sans-serif" opacity="0.9">${text}</text>`;
}

function spraoiBrand(w = 400, h = 300) {
  return `<text x="${w - 14}" y="${h - 8}" text-anchor="end" fill="rgba(255,255,255,0.5)" font-size="8" font-weight="700" font-family="sans-serif">SPRAOI SPORTS</text>`;
}

// Layout generators
function layoutPairs(w, h, numPairs) {
  let svg = "";
  const pairs = Math.min(numPairs, 6);
  const gap = (h - 60) / pairs;
  for (let i = 0; i < pairs; i++) {
    const y = 50 + i * gap;
    svg += player(120, y, "A", COLORS.player1);
    svg += player(280, y, "B", COLORS.player2);
    svg += arrow(140, y, 260, y, true); // ball travel
    svg += ball(200, y - 12);
    if (detectHasCones) {
      svg += cone(90, y);
      svg += cone(310, y);
    }
  }
  svg += label(200, 25, `${pairs} pairs · facing`, 11);
  return svg;
}

function layoutCircle(w, h, numPlayers) {
  let svg = "";
  const cx = w / 2, cy = h / 2;
  const r = 80;
  const n = Math.min(numPlayers, 10);
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const px = cx + r * Math.cos(angle);
    const py = cy + r * Math.sin(angle);
    svg += player(px, py, i + 1, i % 2 === 0 ? COLORS.player1 : COLORS.player2);
  }
  svg += ball(cx, cy);
  svg += label(cx, 22, "Circle formation", 11);
  return svg;
}

function layoutGrid(w, h) {
  let svg = "";
  // 4x3 grid with cones
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const x = 80 + col * 80;
      const y = 70 + row * 80;
      svg += cone(x, y);
    }
  }
  // A few players
  svg += player(80, 70, "A", COLORS.player1);
  svg += player(240, 150, "B", COLORS.player2);
  svg += arrow(95, 75, 150, 75, false);
  svg += arrow(150, 80, 150, 140, false);
  svg += label(200, 25, "Grid swap", 11);
  return svg;
}

function layoutLines(w, h) {
  let svg = "";
  // Two lines of players
  for (let i = 0; i < 4; i++) {
    svg += player(100, 60 + i * 55, i + 1, COLORS.player1);
    svg += player(300, 60 + i * 55, i + 1, COLORS.player2);
  }
  svg += arrow(120, 60, 280, 60, true);
  svg += cone(200, 50);
  svg += cone(200, 120);
  svg += cone(200, 190);
  svg += label(200, 25, "Relay lines", 11);
  return svg;
}

function layoutGoals(w, h) {
  let svg = "";
  // Goal posts
  svg += `<rect x="160" y="10" width="80" height="6" fill="#fff" rx="3" opacity="0.7"/>`;
  svg += `<rect x="160" y="10" width="3" height="30" fill="#fff" opacity="0.7"/>`;
  svg += `<rect x="237" y="10" width="3" height="30" fill="#fff" opacity="0.7"/>`;
  // Players
  svg += player(200, 200, "A", COLORS.player1);
  svg += player(150, 120, "B", COLORS.player2);
  svg += player(250, 140, "C", COLORS.player2);
  svg += arrow(200, 185, 200, 50, true); // shot
  svg += ball(200, 160);
  // Cones
  svg += cone(120, 220);
  svg += cone(280, 220);
  svg += label(200, h - 15, "Shoot at goal", 11);
  return svg;
}

function layoutZigzag(w, h) {
  let svg = "";
  // Zigzag cones
  const cones = [[80, 240], [140, 160], [200, 240], [260, 160], [320, 240]];
  cones.forEach(([x, y]) => { svg += cone(x, y); });
  // Player path
  svg += player(50, 260, "A", COLORS.player1);
  svg += arrow(65, 255, 130, 170, false);
  svg += arrow(145, 165, 195, 235, false);
  svg += arrow(205, 235, 255, 165, false);
  svg += arrow(265, 165, 315, 235, false);
  svg += label(200, 25, "Agility / Zig-zag", 11);
  return svg;
}

function layoutOneVone(w, h) {
  let svg = "";
  svg += player(150, 150, "ATT", COLORS.player1);
  svg += player(250, 150, "DEF", COLORS.player2);
  svg += arrow(165, 145, 235, 145, false);
  svg += ball(150, 125);
  svg += cone(100, 200);
  svg += cone(300, 200);
  svg += cone(100, 100);
  svg += cone(300, 100);
  svg += label(200, 25, "1 v 1", 11);
  return svg;
}

function layoutStations(w, h) {
  let svg = "";
  // 4 stations
  const stations = [
    { x: 100, y: 80, label: "Stn 1" },
    { x: 300, y: 80, label: "Stn 2" },
    { x: 100, y: 220, label: "Stn 3" },
    { x: 300, y: 220, label: "Stn 4" },
  ];
  stations.forEach((s, i) => {
    svg += `<rect x="${s.x - 40}" y="${s.y - 30}" width="80" height="60" fill="rgba(255,255,255,0.1)" stroke="${COLORS.lineStrong}" stroke-width="1.5" rx="8"/>`;
    svg += player(s.x - 15, s.y, "A", COLORS.player1);
    svg += player(s.x + 15, s.y, "B", COLORS.player2);
    svg += cone(s.x, s.y - 20);
    svg += label(s.x, s.y + 45, s.label, 9);
  });
  // Rotation arrows
  svg += arrow(145, 80, 255, 80, false);
  svg += arrow(305, 125, 305, 175, false);
  svg += arrow(255, 220, 145, 220, false);
  svg += arrow(95, 175, 95, 125, false);
  svg += label(200, 155, "ROTATE", 10);
  return svg;
}

function generateSvg(activity) {
  const w = 400, h = 300;
  const layout = detectLayout(activity.diagram_description);
  const numPlayers = detectPlayerCount(activity.diagram_description);

  let svg = svgStart(w, h);
  svg += pitchBg(w, h);

  switch (layout) {
    case "pairs": svg += layoutPairs(w, h, numPlayers / 2); break;
    case "circle": svg += layoutCircle(w, h, numPlayers); break;
    case "grid": svg += layoutGrid(w, h); break;
    case "lines": svg += layoutLines(w, h); break;
    case "goals": svg += layoutGoals(w, h); break;
    case "zigzag": svg += layoutZigzag(w, h); break;
    case "oneVone": svg += layoutOneVone(w, h); break;
    default: svg += layoutStations(w, h); break;
  }

  svg += spraoiBrand(w, h);
  svg += "</svg>";
  return svg;
}

// Main
function run() {
  const activities = JSON.parse(fs.readFileSync(path.join(LIB, "activities.json"), "utf8"));
  
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

  console.log(`Generating ${activities.length} diagrams...`);
  const summary = {};

  activities.forEach((a, i) => {
    const layout = detectLayout(a.diagram_description);
    summary[layout] = (summary[layout] || 0) + 1;

    const filename = `${String(i + 1).padStart(3, "0")}_${a.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}.svg`;
    const svg = generateSvg(a);
    fs.writeFileSync(path.join(OUT, filename), svg);
  });

  console.log("\nLayout distribution:");
  Object.entries(summary).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${k}: ${v}`);
  });
  console.log(`\nDone! ${activities.length} SVGs written to: ${OUT}`);
  console.log("\nNext steps:");
  console.log("1. Open card-editor.html to review each diagram");
  console.log("2. Copy the diagrams/ folder to spraoi-playbook/public/diagrams/");
  console.log("3. Update the app to show <img src='/diagrams/001_...' /> instead of text");
}

run();
