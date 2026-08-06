// Load Kiro Library v1 into Supabase (clears old data first)
// Run: node load-library.cjs

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = "https://wgiftppliylhipgjvnnb.supabase.co";
const SUPABASE_KEY = "sb_publishable_7QQYASK70Wr4foSfYbsQQQ_6Feu8Bso";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const LIB = path.join(__dirname, "..", "spraoi-library", "kiro-v1", "Spraoi_Sports_Kiro_Library_v1", "library");

async function run() {
  const skills = JSON.parse(fs.readFileSync(path.join(LIB, "skills.json"), "utf8"));
  const activities = JSON.parse(fs.readFileSync(path.join(LIB, "activities.json"), "utf8"));
  const challenges = JSON.parse(fs.readFileSync(path.join(LIB, "challenges.json"), "utf8"));
  console.log(`Loaded: ${skills.length} skills, ${activities.length} activities, ${challenges.length} challenges`);

  // Clear old data
  console.log("Clearing old data...");
  await supabase.from("activity_secondary_skills").delete().neq("activity_id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("session_activities").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("activities").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("challenges").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("skills").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  console.log("  Done.");

  // Insert skills
  console.log("Loading skills...");
  let ok = 0, fail = 0;
  for (const s of skills) {
    const { error } = await supabase.from("skills").insert({
      code: s.code || null, name: s.name, sport: s.sport, category: s.category,
      description: s.description || "", age_groups: s.age_groups || [], status: "approved",
    });
    if (error) { console.log("  SKIP:", s.name, error.message); fail++; } else ok++;
  }
  console.log(`  ${ok} loaded, ${fail} skipped.`);

  // Get skill map
  const { data: dbSkills } = await supabase.from("skills").select("id, name");
  const skillMap = Object.fromEntries((dbSkills || []).map((s) => [s.name, s.id]));
  console.log(`  ${Object.keys(skillMap).length} skills in DB.`);

  // Insert activities
  console.log("Loading activities...");
  ok = 0; fail = 0;
  for (const a of activities) {
    const skillId = skillMap[a.skill];
    if (!skillId) { console.log("  NO SKILL:", a.title, "->", a.skill); fail++; continue; }
    const { data, error } = await supabase.from("activities").insert({
      title: a.title, skill_id: skillId, sport: a.sport, category: a.category,
      age_groups: a.age_groups, difficulty: a.difficulty, format: a.format,
      duration_mins: a.duration_mins, players_min: a.players_min, players_max: a.players_max,
      equipment: a.equipment, area_size: a.area_size || "", indoor: a.indoor, outdoor: a.outdoor,
      description: a.description, coaching_points: a.coaching_points,
      setup: a.setup, diagram_description: a.diagram_description || "", status: "approved",
    }).select().single();
    if (error) { console.log("  ERR:", a.title, error.message); fail++; }
    else {
      ok++;
      if (data && a.secondary_skills && a.secondary_skills.length > 0) {
        for (const secName of a.secondary_skills) {
          const secId = skillMap[secName];
          if (secId) await supabase.from("activity_secondary_skills").insert({ activity_id: data.id, skill_id: secId });
        }
      }
    }
  }
  console.log(`  ${ok} loaded, ${fail} failed.`);

  // Insert challenges
  console.log("Loading challenges...");
  ok = 0; fail = 0;
  for (const c of challenges) {
    const skillId = skillMap[c.skill];
    if (!skillId) { console.log("  NO SKILL:", c.title, "->", c.skill); fail++; continue; }
    const { error } = await supabase.from("challenges").insert({
      title: c.title, skill_id: skillId, sport: c.sport, age_groups: c.age_groups,
      difficulty: c.difficulty, level: c.level, duration_mins: c.duration_mins,
      description: c.description, target: c.target, video_url: c.video_url || "", status: "approved",
    });
    if (error) { console.log("  ERR:", c.title, error.message); fail++; } else ok++;
  }
  console.log(`  ${ok} loaded, ${fail} failed.`);

  console.log("\nDone! Library loaded.");
}

run().catch((e) => console.error("FATAL:", e.message));
