import { supabase } from "../../../supabaseClient";

export async function getAcademyWeek(ageGroupId, weekStart) {
  return supabase.from("academy_weeks").select("*, academy_week_items(*)").eq("age_group_id", ageGroupId).eq("week_start", weekStart).maybeSingle();
}

export async function getCoachPlanSkills(planId) {
  return supabase.from("session_activities").select("id, activity:activities(id,title,sport,skill_id,skill:skills(id,name,category)) , session:sessions!inner(plan_id)").eq("session.plan_id", planId);
}
