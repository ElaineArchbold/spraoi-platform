// Load complete football library (418 activities, 135 skills, 6 challenges)
// Run: node load-football-complete.cjs
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
const s = createClient("https://wgiftppliylhipgjvnnb.supabase.co", "sb_publishable_7QQYASK70Wr4foSfYbsQQQ_6Feu8Bso");
const BASE = path.join(__dirname, "..", "spraoi-library", "football-complete", "Spraoi_Sports_Football_Library_COMPLETE");

async function run() {
  console.log("Clearing old football activities...");
  await s.from("activities").delete().eq("sport", "football");
  await s.from("challenges").delete().eq("sport", "football");
  console.log("Done.\n");

  // Load skills
  const skills = JSON.parse(fs.readFileSync(path.join(BASE, "Batch_001", "libraries", "skills_batch_001.json"), "utf8"));
  console.log(`Loading ${skills.length} skills...`);
  let ok = 0, fail = 0;
  for (const sk of skills) {
    const { error } = await s.from("skills").upsert({ name: sk.name, sport: "football", category: sk.category || "general", description: sk.description || "", age_groups: sk.age_groups || [], status: "approved" }, { onConflict: "name" });
    if (error) fail++; else ok++;
  }
  console.log(`  ${ok} ok, ${fail} failed\n`);

  // Skill map
  const { data: dbSkills } = await s.from("skills").select("id, name");
  const skillMap = Object.fromEntries((dbSkills || []).map(sk => [sk.name, sk.id]));
  console.log(`  ${Object.keys(skillMap).length} skills in DB\n`);

  // Activities
  let totalOk = 0, totalFail = 0;
  for (const batch of ["Batch_001", "Batch_002", "Batch_003", "Batch_004", "Batch_005"]) {
    const num = batch.replace("Batch_", "batch_").toLowerCase();
    const acts = JSON.parse(fs.readFileSync(path.join(BASE, batch, "libraries", `activities_${num}.json`), "utf8"));
    console.log(`${batch}: ${acts.length} activities...`);
    let bOk = 0, bFail = 0;
    for (const a of acts) {
      const skillId = skillMap[a.skill] || skillMap["General Football"];
      const diff = ({ mixed: "foundation", intermediate: "developing" })[a.difficulty] || a.difficulty || "foundation";
      const fmt = ({ activity: "drill", fitness: "drill", "fun-game": "game", "practice-play": "game", skill: "drill", "conditioned-game": "game" })[a.format] || a.format || "drill";
      const { error } = await s.from("activities").insert({
        title: a.title, skill_id: skillId, sport: "football", category: a.category || "general",
        age_groups: a.age_groups || [], difficulty: diff, format: fmt,
        duration_mins: a.duration_mins || null, players_min: a.players_min || null, players_max: a.players_max || null,
        equipment: a.equipment || "", area_size: a.area_size || "",
        indoor: a.indoor ?? true, outdoor: a.outdoor ?? true,
        description: a.description || "", coaching_points: a.coaching_points || "",
        setup: a.setup || "", diagram_description: a.diagram_description || "", status: "approved",
      });
      if (error) { if (bFail < 2) console.log("  ERR:", a.title.substring(0, 30), error.message.substring(0, 60)); bFail++; } else bOk++;
    }
    console.log(`  ${bOk} ok, ${bFail} failed`);
    totalOk += bOk; totalFail += bFail;
  }
  console.log(`\nActivities: ${totalOk} loaded, ${totalFail} failed\n`);

  // Challenges
  const chs = JSON.parse(fs.readFileSync(path.join(BASE, "Batch_001", "libraries", "challenges_batch_001.json"), "utf8"));
  ok = 0; fail = 0;
  for (const c of chs) {
    const skillId = skillMap[c.skill] || skillMap["General Football"];
    const { error } = await s.from("challenges").insert({ title: c.title, skill_id: skillId, sport: "football", age_groups: c.age_groups || [], difficulty: c.difficulty || "foundation", level: c.level || 1, duration_mins: c.duration_mins || 10, description: c.description || "", target: c.target || "", status: "approved" });
    if (error) fail++; else ok++;
  }
  console.log(`Challenges: ${ok} ok, ${fail} failed`);
  console.log("\nDone!");
}
run().catch(e => console.error("FATAL:", e.message));
