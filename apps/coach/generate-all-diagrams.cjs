// Generate improved SVG pitch diagrams for ALL activities
// Run: node generate-all-diagrams.cjs
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const s = createClient("https://wgiftppliylhipgjvnnb.supabase.co", "sb_publishable_7QQYASK70Wr4foSfYbsQQQ_6Feu8Bso");
const OUT = path.join(__dirname, "public", "diagrams");

function detectLayout(desc) {
  const d = (desc || "").toLowerCase();
  if (d.includes("circle") || d.includes("ring")) return "circle";
  if (d.includes("pair") || d.includes("partner")) return "pairs";
  if (d.includes("grid") || d.includes("square") || d.includes("swap")) return "grid";
  if (d.includes("line") || d.includes("relay") || d.includes("queue")) return "lines";
  if (d.includes("goal") || d.includes("score") || d.includes("shoot")) return "goals";
  if (d.includes("zig") || d.includes("zag") || d.includes("agility")) return "zigzag";
  if (d.includes("1 v 1") || d.includes("1v1") || d.includes("opposed")) return "oneVone";
  if (d.includes("ladder")) return "ladder";
  return "stations";
}

function generateSvg(layout) {
  const w = 440, h = 320;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`;
  // Defs
  svg += `<defs>
    <linearGradient id="pitch" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#5cb85c"/><stop offset="50%" stop-color="#4a9835"/><stop offset="100%" stop-color="#3d8030"/></linearGradient>
    <filter id="shadow"><feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.3"/></filter>
  </defs>`;
  // Pitch background
  svg += `<rect width="${w}" height="${h}" fill="url(#pitch)" rx="14"/>`;
  // Pitch lines
  svg += `<rect x="14" y="14" width="${w-28}" height="${h-28}" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="2" rx="8"/>`;
  svg += `<line x1="${w/2}" y1="14" x2="${w/2}" y2="${h-14}" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" stroke-dasharray="8,6"/>`;
  svg += `<circle cx="${w/2}" cy="${h/2}" r="35" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>`;
  svg += `<circle cx="${w/2}" cy="${h/2}" r="3" fill="rgba(255,255,255,0.4)"/>`;

  const player = (x, y, label, color) => `<g filter="url(#shadow)"><circle cx="${x}" cy="${y}" r="14" fill="${color}"/><circle cx="${x}" cy="${y}" r="14" fill="none" stroke="#fff" stroke-width="2.5"/><text x="${x}" y="${y+5}" text-anchor="middle" fill="#fff" font-size="10" font-weight="800" font-family="sans-serif">${label}</text></g>`;
  const cone = (x, y) => `<polygon points="${x},${y-9} ${x-7},${y+6} ${x+7},${y+6}" fill="#FF7A00" stroke="#fff" stroke-width="1.5" filter="url(#shadow)"/>`;
  const ball = (x, y) => `<circle cx="${x}" cy="${y}" r="7" fill="#FFB400" stroke="#fff" stroke-width="2" filter="url(#shadow)"/>`;
  const arrow = (x1, y1, x2, y2, dashed) => {
    const angle = Math.atan2(y2-y1, x2-x1);
    const ax = x2 - 8*Math.cos(angle-0.4), ay = y2 - 8*Math.sin(angle-0.4);
    const bx = x2 - 8*Math.cos(angle+0.4), by = y2 - 8*Math.sin(angle+0.4);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(255,255,255,0.7)" stroke-width="2" ${dashed?'stroke-dasharray="6,4"':''}/><polygon points="${x2},${y2} ${ax},${ay} ${bx},${by}" fill="rgba(255,255,255,0.7)"/>`;
  };

  switch(layout) {
    case "pairs":
      for(let i=0;i<4;i++){const y=55+i*60; svg+=player(130,y,"A","#073B74")+player(310,y,"B","#8e24aa")+arrow(148,y,290,y,true)+ball(220,y-12)+cone(95,y)+cone(345,y)}
      break;
    case "circle":
      for(let i=0;i<8;i++){const a=(i/8)*Math.PI*2-Math.PI/2; svg+=player(220+90*Math.cos(a),160+90*Math.sin(a),String(i+1),i%2?"#8e24aa":"#073B74")}
      svg+=ball(220,160);
      break;
    case "grid":
      for(let r=0;r<3;r++)for(let c=0;c<4;c++)svg+=cone(90+c*85,65+r*85);
      svg+=player(90,65,"A","#073B74")+player(260,150,"B","#8e24aa");
      svg+=arrow(108,70,165,70,false)+arrow(170,78,170,140,false);
      break;
    case "lines":
      for(let i=0;i<4;i++){svg+=player(110,55+i*60,String(i+1),"#073B74")+player(330,55+i*60,String(i+1),"#8e24aa")}
      svg+=arrow(130,55,310,55,true)+cone(220,50)+cone(220,120)+cone(220,190)+cone(220,260);
      break;
    case "goals":
      svg+=`<rect x="175" y="10" width="90" height="8" fill="rgba(255,255,255,0.8)" rx="4"/>`;
      svg+=`<rect x="175" y="10" width="4" height="35" fill="rgba(255,255,255,0.6)"/><rect x="261" y="10" width="4" height="35" fill="rgba(255,255,255,0.6)"/>`;
      svg+=player(220,220,"A","#073B74")+player(160,130,"B","#8e24aa")+player(280,140,"C","#8e24aa");
      svg+=arrow(220,205,220,55,true)+ball(220,180)+cone(130,240)+cone(310,240);
      break;
    case "zigzag":
      const zigs=[[90,260],[160,170],[230,260],[300,170],[370,260]];
      zigs.forEach(([x,y])=>svg+=cone(x,y));
      svg+=player(55,275,"A","#073B74");
      svg+=arrow(72,268,150,178,false)+arrow(165,175,222,255,false)+arrow(238,255,292,178,false)+arrow(307,175,362,255,false);
      break;
    case "oneVone":
      svg+=player(160,160,"ATT","#073B74")+player(280,160,"DEF","#8e24aa");
      svg+=arrow(178,155,260,155,false)+ball(160,130);
      svg+=cone(110,220)+cone(330,220)+cone(110,100)+cone(330,100);
      break;
    case "ladder":
      for(let i=0;i<7;i++)svg+=`<rect x="185" y="${45+i*35}" width="70" height="4" fill="rgba(255,255,255,0.5)" rx="2"/>`;
      svg+=player(220,290,"A","#073B74")+arrow(220,275,220,60,false);
      break;
    default: // stations
      const stns=[[110,85],[330,85],[110,235],[330,235]];
      stns.forEach(([x,y],i)=>{
        svg+=`<rect x="${x-50}" y="${y-35}" width="100" height="70" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-dasharray="6,4" rx="10"/>`;
        svg+=player(x-18,y,"A","#073B74")+player(x+18,y,"B","#8e24aa")+cone(x,y-22);
        svg+=`<text x="${x}" y="${y+50}" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="10" font-weight="700" font-family="sans-serif">Stn ${i+1}</text>`;
      });
      // Rotation arrows
      svg+=arrow(165,85,275,85,false)+arrow(335,130,335,190,false)+arrow(275,235,165,235,false)+arrow(105,190,105,130,false);
      svg+=`<text x="220" y="165" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="11" font-weight="700" font-family="sans-serif">ROTATE</text>`;
  }
  // Branding
  svg+=`<text x="${w-16}" y="${h-10}" text-anchor="end" fill="rgba(255,255,255,0.4)" font-size="9" font-weight="700" font-family="sans-serif">SPRAOI SPORTS</text>`;
  svg+=`</svg>`;
  return svg;
}

async function run() {
  const { data } = await s.from("activities").select("title, diagram_description").order("title");
  console.log(`Regenerating diagrams for ${data.length} activities...`);
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  const map = {};
  const summary = {};
  data.forEach((a, i) => {
    const layout = detectLayout(a.diagram_description);
    summary[layout] = (summary[layout] || 0) + 1;
    const fn = String(i + 1).padStart(3, "0") + "_" + a.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "") + ".svg";
    map[a.title] = fn;
    fs.writeFileSync(path.join(OUT, fn), generateSvg(layout));
  });
  fs.writeFileSync(path.join(OUT, "diagram-map.json"), JSON.stringify(map, null, 2));
  console.log("Layout distribution:", summary);
  console.log(`Done! ${Object.keys(map).length} SVGs regenerated.`);
}
run();
