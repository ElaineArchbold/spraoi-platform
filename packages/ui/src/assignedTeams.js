export function assignedTeams(teams = [], ids = []) {
  const assigned = new Set((ids || []).map(String));
  return (teams || []).filter((team) => assigned.has(String(team.id)))
    .sort((a, b) => teamLabel(a).localeCompare(teamLabel(b), undefined, { numeric: true }));
}

export function teamLabel(team) {
  const label = String(team?.label || team?.name || "Team").trim();
  const gender = String(team?.gender || "").toLowerCase();
  const suffix = gender === "girls" ? "Girls" : gender === "boys" ? "Boys" : "";
  return suffix && !label.toLowerCase().includes(suffix.toLowerCase()) ? label + " " + suffix : label;
}

// Membership is shared across modules; module grants do not define My Teams.
// Never fall back to legacy rows after a lookup failure or an inactive assignment.
export async function loadAssignedTeamIds(client, userId, clubId) {
  if (!userId || !clubId) return [];
  const [staff, coaches] = await Promise.all([
    client.from("team_staff").select("age_group_id,status,user_id")
      .eq("user_id", userId).eq("club_id", clubId),
    client.from("coaches").select("id").eq("user_id", userId).eq("club_id", clubId),
  ]);
  if (staff.error || coaches.error) throw staff.error || coaches.error;
  let rows = staff.data || [];
  const coachIds = (coaches.data || []).map((coach) => coach.id);
  if (coachIds.length) {
    const linked = await client.from("team_staff").select("age_group_id,status,user_id")
      .in("coach_id", coachIds).eq("club_id", clubId);
    if (linked.error) throw linked.error;
    rows = [...rows, ...(linked.data || []).filter((row) => !row.user_id || String(row.user_id) === String(userId))];
  }
  if (rows.length) {
    return [...new Set(rows.filter((row) => row.status === "active").map((row) => row.age_group_id).filter(Boolean))];
  }
  const legacy = await client.from("coach_assignments").select("age_group_id")
    .eq("user_id", userId).eq("club_id", clubId);
  if (legacy.error) throw legacy.error;
  return [...new Set((legacy.data || []).map((row) => row.age_group_id).filter(Boolean))];
}
