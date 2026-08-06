const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const s = createClient("https://wgiftppliylhipgjvnnb.supabase.co", "sb_publishable_7QQYASK70Wr4foSfYbsQQQ_6Feu8Bso");
const LIB = path.join(__dirname, "..", "spraoi-library", "football-v1", "Spraoi_Sports_Football_Library_Batch_001", "libraries");

async function run() {
  const activities = JSON.parse(fs.readFileSync(path.join(LIB, "activities_batch_001.json"), "utf8"));
  const challenges = JSON.parse(fs.readFileSync(path.join(LIB, "challenges_batch_001.json"), "utf8"));
  console.log("Loading", activities.length, "activities,", challenges.length, "challenges");

  const { data: dbSkills } = await s.from("skills").select("id, name");
  const skillMap = Object.fromEntries((dbSkills || []).map((sk) => [sk.name, sk.id]));
  console.log("Skills in DB:", Object.keys(skillMap).length);

  let ok = 0, fail = 0;
  for (const a of activities) {
    const skillId = skillMap[a.skill];
    if (!skillId) { console.log("  NO SKILL:", a.skill); fail++; continue; }
    const { error } = await s.from("activities").insert({
      title: a.title, skill_id: skillId, sport: "football", category: a.category,
      age_groups: a.age_groups, difficulty: a.difficulty, format: a.format,
      duration_mins: a.duration_mins, players_min: a.players_min, players_max: a.players_max,
      equipment: a.equipment, area_size: a.area_size || "", indoor: a.indoor, outdoor: a.outdoor,
      description: a.description, coaching_points: a.coaching_points,
      setup: a.setup, diagram_description: a.diagram_description || "", status: "approved",
    });
    if (error) { console.log("  ERR:", a.title, error.message); fail++; } else ok++;
  }
  console.log("Activities:", ok, "loaded,", fail, "failed");

  ok = 0; fail = 0;
  for (const c of challenges) {
    const skillId = skillMap[c.skill];
    if (!skillId) { console.log("  NO SKILL:", c.skill); fail++; continue; }
    const { error } = await s.from("challenges").insert({
      title: c.title, skill_id: skillId, sport: "football", age_groups: c.age_groups || [],
      difficulty: c.difficulty || "foundation", level: c.level || 1, duration_mins: c.duration_mins || 10,
      description: c.description, target: c.target || "", status: "approved",
    });
    if (error) { console.log("  ERR:", c.title, error.message); fail++; } else ok++;
  }
  console.log("Challenges:", ok, "loaded,", fail, "failed");
  console.log("\nDone! Football library loaded.");
}

run().catch((e) => console.error("FATAL:", e.message));
