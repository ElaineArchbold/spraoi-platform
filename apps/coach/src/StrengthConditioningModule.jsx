
import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

const UI = {
  ink: "#13243b",
  muted: "#627187",
  line: "#dfe7ef",
  soft: "#f6f9fc",
  white: "#ffffff",
  purple: "#7C3AED",
  purpleDark: "#5B21B6",
  purpleSoft: "#F5F3FF",
  green: "#166534",
  greenSoft: "#DCFCE7",
  amber: "#92400E",
  amberSoft: "#FEF3C7",
  red: "#B91C1C",
  redSoft: "#FEE2E2",
  blue: "#1D4ED8",
  blueSoft: "#DBEAFE",
};

const GROUP_STYLE = {
  white: { bg: "#FFFFFF", border: "#94A3B8", text: "#0F172A" },
  blue: { bg: "#2563EB", border: "#1D4ED8", text: "#FFFFFF" },
  green: { bg: "#16A34A", border: "#15803D", text: "#FFFFFF" },
  orange: { bg: "#EA580C", border: "#C2410C", text: "#FFFFFF" },
  yellow: { bg: "#FACC15", border: "#EAB308", text: "#422006" },
};

const card = {
  background: UI.white,
  border: `1px solid ${UI.line}`,
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 5px 18px rgba(15,23,42,.05)",
};

const button = {
  border: 0,
  borderRadius: 10,
  padding: "9px 12px",
  fontSize: 10,
  fontWeight: 800,
  cursor: "pointer",
};

const input = {
  width: "100%",
  boxSizing: "border-box",
  border: `1px solid ${UI.line}`,
  borderRadius: 9,
  padding: "9px 10px",
  background: "#fff",
  color: UI.ink,
  fontSize: 10,
};

function numberOrNull(value, allowZero = false) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (allowZero ? n < 0 : n <= 0) return null;
  return Math.round(n);
}

function addDays(dateValue, count) {
  const date = new Date(`${dateValue}T12:00:00`);
  date.setDate(date.getDate() + count);
  return date.toISOString().slice(0, 10);
}

function currentWeekNumber(assignment, programme) {
  if (!assignment?.starts_on) return 1;
  const start = new Date(`${assignment.starts_on}T12:00:00`);
  const today = new Date();
  const elapsed = Math.max(0, Math.floor((today - start) / 86400000));
  const calculated = Math.floor(elapsed / 7) + 1;
  return Math.min(Math.max(1, calculated), Number(programme?.duration_weeks || calculated || 1));
}

function targetLabel(item, exercise, override = null) {
  const sets = override?.sets ?? item?.sets ?? exercise?.default_sets ?? null;
  const reps = override?.reps ?? item?.reps ?? exercise?.default_reps ?? null;
  const duration = override?.duration_seconds ?? item?.duration_seconds ?? exercise?.default_duration_seconds ?? null;
  const distance = override?.distance_m ?? item?.distance_m ?? exercise?.default_distance_m ?? null;
  const custom = override?.target_text || item?.target_text || "";
  if (custom) return custom;
  if (sets && reps) return `${sets} × ${reps}`;
  if (sets && distance) return `${sets} × ${distance}m`;
  if (duration) {
    if (duration >= 60) {
      const mins = Math.floor(duration / 60);
      const secs = duration % 60;
      return secs ? `${mins}m ${secs}s` : `${mins} min`;
    }
    return `${duration} sec`;
  }
  if (distance) return `${distance}m`;
  return "Complete as prescribed";
}

function Chip({ children, bg = "#F3F4F6", color = UI.muted }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "5px 8px",
      borderRadius: 999,
      fontSize: 8,
      fontWeight: 900,
      background: bg,
      color
    }}>
      {children}
    </span>
  );
}

function Modal({ title, onClose, children, width = 680 }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed",
      inset: 0,
      zIndex: 20000,
      background: "rgba(15,23,42,.55)",
      display: "grid",
      placeItems: "center",
      padding: 18
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: `min(${width}px, 100%)`,
        maxHeight: "92vh",
        overflow: "auto",
        background: "#fff",
        borderRadius: 18,
        boxShadow: "0 28px 80px rgba(15,23,42,.28)"
      }}>
        <div style={{
          padding: "17px 20px",
          borderBottom: `1px solid ${UI.line}`,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center"
        }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: UI.ink }}>{title}</div>
          <button type="button" onClick={onClose} style={{ ...button, background: "#F3F4F6", color: UI.ink, padding: "7px 10px" }}>Close</button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

export default function StrengthConditioningModule({ selectedTeam, teamName = "Selected team", GroupManager }) {
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [programmes, setProgrammes] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [items, setItems] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [players, setPlayers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [progress, setProgress] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [feedback, setFeedback] = useState([]);

  const [selectedProgrammeId, setSelectedProgrammeId] = useState("");
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState("");

  const [showCreateProgramme, setShowCreateProgramme] = useState(false);
  const [programmeForm, setProgrammeForm] = useState({ title: "", description: "", duration_weeks: 4 });

  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exerciseForm, setExerciseForm] = useState({
    title: "",
    description: "",
    category: "strength",
    equipment: "",
    default_sets: "",
    default_reps: "",
    default_duration_seconds: "",
    default_distance_m: "",
    default_verification_type: "self"
  });

  const [exerciseSearch, setExerciseSearch] = useState("");
  const [exerciseCategory, setExerciseCategory] = useState("all");

  const [assignmentForm, setAssignmentForm] = useState({
    scope: "team",
    target_id: "",
    starts_on: new Date().toISOString().slice(0, 10),
    notes: ""
  });

  const [newItem, setNewItem] = useState({
    exercise_id: "",
    sets: "",
    reps: "",
    duration_seconds: "",
    distance_m: "",
    rest_seconds: "",
    target_text: "",
    verification_type: "self",
    xp_reward: 10
  });

  const [overrideEditor, setOverrideEditor] = useState(null);
  const [overrideDraft, setOverrideDraft] = useState({
    sets: "",
    reps: "",
    duration_seconds: "",
    distance_m: "",
    target_text: "",
    coach_note: ""
  });

  async function loadAll() {
    if (!selectedTeam?.id || !selectedTeam?.club_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setMessage("");

    try {
      const [programmeResult, assignmentResult, playerResult, groupResult, exerciseResult] = await Promise.all([
        supabase.from("sc_programmes").select("*").eq("club_id", selectedTeam.club_id).eq("age_group_id", selectedTeam.id).order("updated_at", { ascending: false }),
        supabase.from("sc_assignments").select("*").eq("age_group_id", selectedTeam.id).order("starts_on", { ascending: false }),
        supabase.from("players").select("id,name,football_panel,hurling_panel").eq("age_group_id", selectedTeam.id).order("name"),
        supabase.from("sc_groups").select("*").eq("age_group_id", selectedTeam.id).eq("active", true).order("sort_order"),
        supabase.from("sc_exercises").select("*").or(`club_id.eq.${selectedTeam.club_id},is_global.eq.true`).order("title")
      ]);

      for (const r of [programmeResult, assignmentResult, playerResult, groupResult, exerciseResult]) {
        if (r.error) throw r.error;
      }

      const nextProgrammes = programmeResult.data || [];
      const nextAssignments = assignmentResult.data || [];
      const nextPlayers = playerResult.data || [];
      const nextGroups = groupResult.data || [];
      const nextExercises = exerciseResult.data || [];

      setProgrammes(nextProgrammes);
      setAssignments(nextAssignments);
      setPlayers(nextPlayers);
      setGroups(nextGroups);
      setExercises(nextExercises);

      let nextWeeks = [];
      let nextItems = [];
      let nextMemberships = [];
      let nextProgress = [];
      let nextOverrides = [];
      let nextFeedback = [];

      const programmeIds = nextProgrammes.map((x) => x.id);
      if (programmeIds.length) {
        const weekResult = await supabase.from("sc_programme_weeks").select("*").in("programme_id", programmeIds).order("week_number");
        if (weekResult.error) throw weekResult.error;
        nextWeeks = weekResult.data || [];

        const weekIds = nextWeeks.map((x) => x.id);
        if (weekIds.length) {
          const itemResult = await supabase.from("sc_programme_items").select("*").in("programme_week_id", weekIds).order("sort_order");
          if (itemResult.error) throw itemResult.error;
          nextItems = itemResult.data || [];
        }
      }

      const groupIds = nextGroups.map((x) => x.id);
      if (groupIds.length) {
        const memberResult = await supabase.from("sc_group_members").select("*").in("group_id", groupIds).eq("active", true);
        if (memberResult.error) throw memberResult.error;
        nextMemberships = memberResult.data || [];
      }

      const assignmentIds = nextAssignments.map((x) => x.id);
      if (assignmentIds.length) {
        const [progressResult, overrideResult] = await Promise.all([
          supabase.from("sc_progress").select("*").in("assignment_id", assignmentIds).order("updated_at", { ascending: false }),
          supabase.from("sc_player_overrides").select("*").in("assignment_id", assignmentIds).eq("active", true)
        ]);
        if (progressResult.error) throw progressResult.error;
        if (overrideResult.error) throw overrideResult.error;

        nextProgress = progressResult.data || [];
        nextOverrides = overrideResult.data || [];

        const progressIds = nextProgress.map((x) => x.id);
        if (progressIds.length) {
          const feedbackResult = await supabase.from("sc_feedback").select("*").in("progress_id", progressIds).order("feedback_at", { ascending: false });
          if (feedbackResult.error) throw feedbackResult.error;
          nextFeedback = feedbackResult.data || [];
        }
      }

      setWeeks(nextWeeks);
      setItems(nextItems);
      setMemberships(nextMemberships);
      setProgress(nextProgress);
      setOverrides(nextOverrides);
      setFeedback(nextFeedback);

      setSelectedProgrammeId((current) =>
        current && nextProgrammes.some((x) => String(x.id) === String(current))
          ? current
          : nextProgrammes.find((x) => x.status === "active")?.id || nextProgrammes[0]?.id || ""
      );
      setSelectedPlayerId((current) =>
        current && nextPlayers.some((x) => String(x.id) === String(current))
          ? current
          : nextPlayers[0]?.id || ""
      );
      setSelectedExerciseId((current) =>
        current && nextExercises.some((x) => String(x.id) === String(current))
          ? current
          : nextExercises[0]?.id || ""
      );
    } catch (error) {
      console.error("S&C desktop load error:", error);
      setMessage(error?.message || "Could not load S&C.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, [selectedTeam?.id]);

  const exerciseMap = useMemo(
    () => new Map(exercises.map((row) => [String(row.id), row])),
    [exercises]
  );

  const selectedProgramme = programmes.find((x) => String(x.id) === String(selectedProgrammeId)) || null;
  const programmeWeeks = selectedProgramme
    ? weeks.filter((x) => String(x.programme_id) === String(selectedProgramme.id)).sort((a,b) => Number(a.week_number)-Number(b.week_number))
    : [];
  const effectiveWeekId = programmeWeeks.some((x) => String(x.id) === String(selectedWeekId))
    ? selectedWeekId
    : programmeWeeks[0]?.id || "";
  const selectedWeek = programmeWeeks.find((x) => String(x.id) === String(effectiveWeekId)) || null;
  const selectedWeekItems = selectedWeek
    ? items.filter((x) => String(x.programme_week_id) === String(selectedWeek.id)).sort((a,b)=>Number(a.sort_order)-Number(b.sort_order))
    : [];
  const selectedPlayer = players.find((x) => String(x.id) === String(selectedPlayerId)) || null;
  const selectedExercise = exercises.find((x) => String(x.id) === String(selectedExerciseId)) || null;

  function groupForPlayer(playerId) {
    const membership = memberships.find((x) => String(x.player_id) === String(playerId) && x.active !== false);
    return groups.find((x) => String(x.id) === String(membership?.group_id || "")) || null;
  }

  function assignmentAppliesToPlayer(assignment, player) {
    if (assignment.scope === "team") return true;
    if (assignment.scope === "player") return String(assignment.player_id || "") === String(player.id);
    if (assignment.scope === "subgroup" && assignment.group_id) {
      return memberships.some((m) =>
        String(m.player_id) === String(player.id) &&
        String(m.group_id) === String(assignment.group_id) &&
        m.active !== false
      );
    }
    return false;
  }

  function rowsForProgramme(programme) {
    if (!programme) return [];
    const rows = [];
    assignments
      .filter((assignment) => String(assignment.programme_id) === String(programme.id) && assignment.status === "active")
      .forEach((assignment) => {
        const weekNumber = currentWeekNumber(assignment, programme);
        const week = weeks.find((w) => String(w.programme_id) === String(programme.id) && Number(w.week_number) === Number(weekNumber));
        if (!week) return;
        const weekItems = items.filter((item) => String(item.programme_week_id) === String(week.id));

        players
          .filter((player) => assignmentAppliesToPlayer(assignment, player))
          .forEach((player) => {
            weekItems.forEach((item) => {
              const progressRow = progress.find((p) =>
                String(p.assignment_id) === String(assignment.id) &&
                String(p.programme_item_id) === String(item.id) &&
                String(p.player_id) === String(player.id)
              ) || null;
              const override = overrides.find((o) =>
                o.active !== false &&
                String(o.assignment_id) === String(assignment.id) &&
                String(o.programme_item_id) === String(item.id) &&
                String(o.player_id) === String(player.id)
              ) || null;
              rows.push({
                assignment,
                programme,
                week,
                item,
                exercise: exerciseMap.get(String(item.exercise_id)) || null,
                player,
                progress: progressRow,
                override
              });
            });
          });
      });
    return rows;
  }

  const activeProgramme = programmes.find((x) => x.status === "active") || null;
  const overviewRows = rowsForProgramme(activeProgramme);
  const overviewComplete = overviewRows.filter((x) => x.progress?.status === "approved").length;
  const overviewPending = overviewRows.filter((x) => x.progress?.status === "pending").length;
  const overviewNeeds = overviewRows.filter((x) => x.progress?.status === "needs_work").length;
  const overviewNotStartedPlayers = players.filter((player) => {
    const rows = overviewRows.filter((x) => String(x.player.id) === String(player.id));
    return rows.length && rows.every((x) => !x.progress);
  }).length;
  const completionPercent = overviewRows.length ? Math.round((overviewComplete / overviewRows.length) * 100) : 0;
  const selectedProgrammeRows = rowsForProgramme(selectedProgramme);
  const selectedPlayerRows = selectedPlayer ? selectedProgrammeRows.filter((x) => String(x.player.id) === String(selectedPlayer.id)) : [];

  async function createProgramme() {
    if (!programmeForm.title.trim()) return;
    setSaving(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const duration = Math.max(1, Math.min(52, Number(programmeForm.duration_weeks || 4)));
      const { data: programme, error } = await supabase
        .from("sc_programmes")
        .insert({
          club_id: selectedTeam.club_id,
          age_group_id: selectedTeam.id,
          title: programmeForm.title.trim(),
          description: programmeForm.description.trim() || null,
          duration_weeks: duration,
          status: "draft",
          created_by: authData?.user?.id || null
        })
        .select()
        .single();
      if (error) throw error;

      const { error: weekError } = await supabase
        .from("sc_programme_weeks")
        .insert(Array.from({ length: duration }, (_, index) => ({
          programme_id: programme.id,
          week_number: index + 1,
          title: `Week ${index + 1}`
        })));
      if (weekError) throw weekError;

      setProgrammeForm({ title: "", description: "", duration_weeks: 4 });
      setShowCreateProgramme(false);
      setSelectedProgrammeId(programme.id);
      setTab("programmes");
      await loadAll();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateProgrammeStatus(programme, status) {
    const { error } = await supabase.from("sc_programmes").update({ status, updated_at: new Date().toISOString() }).eq("id", programme.id);
    if (error) return setMessage(error.message);
    await loadAll();
  }

  async function updateWeek(week, patch) {
    const { error } = await supabase.from("sc_programme_weeks").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", week.id);
    if (error) return setMessage(error.message);
    await loadAll();
  }

  function chooseExercise(exerciseId) {
    const exercise = exerciseMap.get(String(exerciseId));
    setNewItem((current) => ({
      ...current,
      exercise_id: exerciseId,
      sets: exercise?.default_sets ?? "",
      reps: exercise?.default_reps ?? "",
      duration_seconds: exercise?.default_duration_seconds ?? "",
      distance_m: exercise?.default_distance_m ?? "",
      verification_type: exercise?.default_verification_type || "self"
    }));
  }

  async function addProgrammeItem() {
    if (!selectedWeek?.id || !newItem.exercise_id) return;
    const { error } = await supabase.from("sc_programme_items").insert({
      programme_week_id: selectedWeek.id,
      exercise_id: newItem.exercise_id,
      sort_order: selectedWeekItems.length,
      sets: numberOrNull(newItem.sets),
      reps: numberOrNull(newItem.reps),
      duration_seconds: numberOrNull(newItem.duration_seconds),
      distance_m: numberOrNull(newItem.distance_m),
      rest_seconds: numberOrNull(newItem.rest_seconds, true),
      target_text: newItem.target_text.trim() || null,
      verification_type: newItem.verification_type || "self",
      xp_reward: Math.max(0, Number(newItem.xp_reward || 0))
    });
    if (error) return setMessage(error.message);
    setNewItem({
      exercise_id: "",
      sets: "",
      reps: "",
      duration_seconds: "",
      distance_m: "",
      rest_seconds: "",
      target_text: "",
      verification_type: "self",
      xp_reward: 10
    });
    await loadAll();
  }

  async function copyPreviousWeek() {
    if (!selectedWeek || Number(selectedWeek.week_number) <= 1) return;
    const previousWeek = programmeWeeks.find((x) => Number(x.week_number) === Number(selectedWeek.week_number) - 1);
    if (!previousWeek) return;
    const previousItems = items.filter((x) => String(x.programme_week_id) === String(previousWeek.id));
    if (!previousItems.length) return window.alert("The previous week has no activities.");
    if (selectedWeekItems.length && !window.confirm("This week already has activities. Replace them with a copy of the previous week?")) return;

    setSaving(true);
    try {
      if (selectedWeekItems.length) {
        const { error: deleteError } = await supabase.from("sc_programme_items").delete().in("id", selectedWeekItems.map((x) => x.id));
        if (deleteError) throw deleteError;
      }
      const { error: insertError } = await supabase.from("sc_programme_items").insert(
        previousItems.map((item, index) => ({
          programme_week_id: selectedWeek.id,
          exercise_id: item.exercise_id,
          sort_order: index,
          sets: item.sets,
          reps: item.reps,
          duration_seconds: item.duration_seconds,
          distance_m: item.distance_m,
          rest_seconds: item.rest_seconds,
          target_text: item.target_text,
          player_instructions: item.player_instructions,
          coach_notes: item.coach_notes,
          required: item.required,
          verification_type: item.verification_type,
          xp_reward: item.xp_reward
        }))
      );
      if (insertError) throw insertError;
      await loadAll();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function createAssignment() {
    if (!selectedProgramme) return;
    if (assignmentForm.scope !== "team" && !assignmentForm.target_id) {
      return setMessage("Choose a training group or player.");
    }
    const { data: authData } = await supabase.auth.getUser();
    const { error } = await supabase.from("sc_assignments").insert({
      programme_id: selectedProgramme.id,
      club_id: selectedTeam.club_id,
      age_group_id: selectedTeam.id,
      scope: assignmentForm.scope,
      subgroup_key: null,
      group_id: assignmentForm.scope === "subgroup" ? assignmentForm.target_id : null,
      player_id: assignmentForm.scope === "player" ? assignmentForm.target_id : null,
      starts_on: assignmentForm.starts_on,
      ends_on: addDays(assignmentForm.starts_on, Number(selectedProgramme.duration_weeks || 1) * 7 - 1),
      status: "active",
      assigned_by: authData?.user?.id || null,
      notes: assignmentForm.notes.trim() || null
    });
    if (error) return setMessage(error.message);
    setAssignmentForm((current) => ({ ...current, target_id: "", notes: "" }));
    await loadAll();
  }

  async function addExercise() {
    if (!exerciseForm.title.trim()) return;
    setSaving(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const { data: created, error } = await supabase
        .from("sc_exercises")
        .insert({
          club_id: selectedTeam.club_id,
          title: exerciseForm.title.trim(),
          description: exerciseForm.description.trim() || null,
          category: exerciseForm.category,
          equipment: exerciseForm.equipment.trim() || null,
          default_sets: numberOrNull(exerciseForm.default_sets),
          default_reps: numberOrNull(exerciseForm.default_reps),
          default_duration_seconds: numberOrNull(exerciseForm.default_duration_seconds),
          default_distance_m: numberOrNull(exerciseForm.default_distance_m),
          default_verification_type: exerciseForm.default_verification_type,
          is_global: false,
          created_by: authData?.user?.id || null
        })
        .select()
        .single();
      if (error) throw error;
      setSelectedExerciseId(created.id);
      setShowAddExercise(false);
      setExerciseForm({
        title: "",
        description: "",
        category: "strength",
        equipment: "",
        default_sets: "",
        default_reps: "",
        default_duration_seconds: "",
        default_distance_m: "",
        default_verification_type: "self"
      });
      await loadAll();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  function openOverride(row) {
    setOverrideEditor(row);
    setOverrideDraft({
      sets: row.override?.sets ?? row.item.sets ?? "",
      reps: row.override?.reps ?? row.item.reps ?? "",
      duration_seconds: row.override?.duration_seconds ?? row.item.duration_seconds ?? "",
      distance_m: row.override?.distance_m ?? row.item.distance_m ?? "",
      target_text: row.override?.target_text || row.item.target_text || "",
      coach_note: row.override?.coach_note || ""
    });
  }

  async function saveOverride() {
    if (!overrideEditor) return;
    const { data: authData } = await supabase.auth.getUser();
    const { error } = await supabase.from("sc_player_overrides").upsert({
      assignment_id: overrideEditor.assignment.id,
      player_id: overrideEditor.player.id,
      programme_item_id: overrideEditor.item.id,
      active: true,
      sets: numberOrNull(overrideDraft.sets),
      reps: numberOrNull(overrideDraft.reps),
      duration_seconds: numberOrNull(overrideDraft.duration_seconds),
      distance_m: numberOrNull(overrideDraft.distance_m),
      target_text: overrideDraft.target_text.trim() || null,
      coach_note: overrideDraft.coach_note.trim() || null,
      created_by: authData?.user?.id || null,
      updated_at: new Date().toISOString()
    }, { onConflict: "assignment_id,player_id,programme_item_id" });
    if (error) return setMessage(error.message);
    setOverrideEditor(null);
    await loadAll();
  }

  const filteredExercises = exercises.filter((exercise) => {
    const search = exerciseSearch.trim().toLowerCase();
    const matchesSearch = !search ||
      String(exercise.title || "").toLowerCase().includes(search) ||
      String(exercise.description || "").toLowerCase().includes(search);
    const matchesCategory = exerciseCategory === "all" || exercise.category === exerciseCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ flex: 1, overflow: "auto", background: UI.soft }}>
      <div style={{ background: "#fff", borderBottom: `1px solid ${UI.line}`, padding: "18px 24px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, color: UI.ink }}>Strength & Conditioning</div>
            <div style={{ fontSize: 11, color: UI.muted, marginTop: 3 }}>
              {teamName} · programmes, training groups, player targets and progress
            </div>
          </div>
          <button type="button" onClick={() => setShowCreateProgramme(true)} style={{ ...button, background: UI.purple, color: "#fff" }}>
            + Create Programme
          </button>
        </div>

        <div style={{ display: "flex", gap: 4, marginTop: 15, overflowX: "auto" }}>
          {[
            ["overview", "Overview"],
            ["programmes", "Programmes"],
            ["groups", "Training Groups"],
            ["players", "Players"],
            ["library", "Exercise Library"]
          ].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)} style={{
              border: 0,
              borderBottom: tab === id ? `3px solid ${UI.purple}` : "3px solid transparent",
              background: "transparent",
              color: tab === id ? UI.purpleDark : UI.muted,
              fontWeight: 900,
              fontSize: 10,
              padding: "11px 12px",
              whiteSpace: "nowrap",
              cursor: "pointer"
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 24, maxWidth: 1320, margin: "0 auto" }}>
        {message && (
          <div style={{ ...card, padding: 10, marginBottom: 12, background: UI.amberSoft, color: UI.amber }}>
            {message}
          </div>
        )}

        {loading ? (
          <div style={card}>Loading S&C…</div>
        ) : (
          <>
            {tab === "overview" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div style={{ ...card, background: "linear-gradient(135deg,#FAF5FF,#F5F3FF)", borderColor: "#DDD6FE" }}>
                    <div style={{ fontSize: 9, fontWeight: 900, color: UI.purpleDark, textTransform: "uppercase" }}>Active Programme</div>
                    {activeProgramme ? (
                      <>
                        <div style={{ fontSize: 21, fontWeight: 900, color: UI.ink, marginTop: 5 }}>{activeProgramme.title}</div>
                        <div style={{ fontSize: 10, color: UI.muted, marginTop: 3 }}>{activeProgramme.duration_weeks} weeks</div>
                        <div style={{ marginTop: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, fontWeight: 800, color: UI.muted }}>
                            <span>Current progress</span><span>{completionPercent}%</span>
                          </div>
                          <div style={{ height: 9, borderRadius: 99, background: "#E5E7EB", overflow: "hidden", marginTop: 5 }}>
                            <div style={{ height: "100%", width: `${completionPercent}%`, background: UI.purple }} />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 7, marginTop: 14, flexWrap: "wrap" }}>
                          <button type="button" onClick={() => { setSelectedProgrammeId(activeProgramme.id); setTab("programmes"); }} style={{ ...button, background: UI.purple, color: "#fff" }}>Open Current Programme</button>
                          <button type="button" onClick={() => setTab("players")} style={{ ...button, background: "#fff", color: UI.ink, border: `1px solid ${UI.line}` }}>View Players</button>
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 18, fontWeight: 900, color: UI.ink, marginTop: 6 }}>No active programme</div>
                    )}
                  </div>

                  <div style={card}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: UI.ink }}>Needs Attention</div>
                    <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                      {[
                        ["Waiting for coach", overviewPending, "#EDE9FE", UI.purpleDark],
                        ["Needs more work", overviewNeeds, UI.amberSoft, UI.amber],
                        ["Players not started", overviewNotStartedPlayers, "#F3F4F6", UI.muted]
                      ].map(([label, value, bg, color]) => (
                        <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 11px", borderRadius: 10, background: bg, color }}>
                          <span style={{ fontSize: 10, fontWeight: 800 }}>{label}</span>
                          <strong style={{ fontSize: 17 }}>{value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
                  {[
                    ["Players", players.length],
                    ["Current tasks", overviewRows.length],
                    ["Completed", overviewComplete],
                    ["Programmes", programmes.length]
                  ].map(([label, value]) => (
                    <div key={label} style={{ ...card, textAlign: "center", padding: 13 }}>
                      <div style={{ fontSize: 8, fontWeight: 900, color: UI.muted, textTransform: "uppercase" }}>{label}</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: UI.ink, marginTop: 3 }}>{value}</div>
                    </div>
                  ))}
                </div>

                <div style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: UI.ink }}>Training Groups</div>
                      <div style={{ fontSize: 9, color: UI.muted, marginTop: 2 }}>Neutral station groups for S&C work</div>
                    </div>
                    <button type="button" onClick={() => setTab("groups")} style={{ ...button, background: "#F3F4F6", color: UI.ink, padding: "7px 9px" }}>Manage Groups</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 7 }}>
                    {groups.map((group) => {
                      const style = GROUP_STYLE[group.colour_key] || GROUP_STYLE.white;
                      const count = memberships.filter((m) => String(m.group_id) === String(group.id) && m.active !== false).length;
                      return (
                        <div key={group.id} style={{ border: `2px solid ${style.border}`, background: style.bg, color: style.text, borderRadius: 11, padding: "10px 8px" }}>
                          <div style={{ fontSize: 11, fontWeight: 900 }}>{group.name}</div>
                          <div style={{ fontSize: 9, marginTop: 3, opacity: .85 }}>{count} player{count === 1 ? "" : "s"}</div>
                          <div style={{ fontSize: 8, marginTop: 5, opacity: .78 }}>{group.focus || "No focus set"}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {tab === "programmes" && (
              <div style={{ display: "grid", gridTemplateColumns: "310px 1fr", gap: 14, alignItems: "start" }}>
                <div style={card}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: UI.ink }}>Programmes</div>
                  <div style={{ fontSize: 9, color: UI.muted, margin: "3px 0 12px" }}>Active, draft and archived S&C blocks</div>
                  {programmes.map((programme) => (
                    <button key={programme.id} type="button" onClick={() => {
                      setSelectedProgrammeId(programme.id);
                      setSelectedWeekId(weeks.find((w) => String(w.programme_id) === String(programme.id))?.id || "");
                    }} style={{
                      width: "100%",
                      textAlign: "left",
                      border: String(programme.id) === String(selectedProgrammeId) ? `2px solid ${UI.purple}` : `1px solid ${UI.line}`,
                      background: String(programme.id) === String(selectedProgrammeId) ? UI.purpleSoft : "#fff",
                      borderRadius: 11,
                      padding: 10,
                      marginBottom: 7,
                      cursor: "pointer"
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 900, color: UI.ink }}>{programme.title}</div>
                      <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
                        <Chip bg={programme.status === "active" ? UI.greenSoft : programme.status === "draft" ? "#EDE9FE" : "#F3F4F6"} color={programme.status === "active" ? UI.green : programme.status === "draft" ? UI.purpleDark : UI.muted}>{programme.status}</Chip>
                        <Chip>{programme.duration_weeks} weeks</Chip>
                      </div>
                    </button>
                  ))}
                </div>

                {!selectedProgramme ? (
                  <div style={card}>Select a programme or create a new one.</div>
                ) : (
                  <div>
                    <div style={{ ...card, marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: 20, fontWeight: 900, color: UI.ink }}>{selectedProgramme.title}</div>
                          <div style={{ fontSize: 10, color: UI.muted, marginTop: 4 }}>{selectedProgramme.description || "No programme description yet."}</div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          {selectedProgramme.status !== "active" && <button type="button" onClick={() => updateProgrammeStatus(selectedProgramme, "active")} style={{ ...button, background: UI.greenSoft, color: UI.green }}>Activate</button>}
                          {selectedProgramme.status === "active" && <button type="button" onClick={() => updateProgrammeStatus(selectedProgramme, "draft")} style={{ ...button, background: "#EDE9FE", color: UI.purpleDark }}>Back to Draft</button>}
                          {selectedProgramme.status !== "archived" && <button type="button" onClick={() => updateProgrammeStatus(selectedProgramme, "archived")} style={{ ...button, background: "#F3F4F6", color: UI.muted }}>Archive</button>}
                        </div>
                      </div>
                    </div>

                    <div style={{ ...card, marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 900, color: UI.ink }}>Week Builder</div>
                          <div style={{ fontSize: 9, color: UI.muted, marginTop: 2 }}>Build each week and progress targets over time.</div>
                        </div>
                        {selectedWeek && Number(selectedWeek.week_number) > 1 && (
                          <button type="button" onClick={copyPreviousWeek} disabled={saving} style={{ ...button, background: "#F3F4F6", color: UI.ink }}>Copy Previous Week</button>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 11 }}>
                        {programmeWeeks.map((week) => (
                          <button key={week.id} type="button" onClick={() => setSelectedWeekId(week.id)} style={{
                            ...button,
                            padding: "7px 10px",
                            background: String(week.id) === String(effectiveWeekId) ? UI.purple : "#F3F4F6",
                            color: String(week.id) === String(effectiveWeekId) ? "#fff" : UI.ink
                          }}>Week {week.week_number}</button>
                        ))}
                      </div>

                      {selectedWeek && (
                        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 8, marginBottom: 11 }}>
                          <input key={`${selectedWeek.id}:title`} defaultValue={selectedWeek.title || ""} onBlur={(e) => updateWeek(selectedWeek, { title: e.target.value.trim() || null })} placeholder="Week title" style={input} />
                          <input key={`${selectedWeek.id}:focus`} defaultValue={selectedWeek.focus || ""} onBlur={(e) => updateWeek(selectedWeek, { focus: e.target.value.trim() || null })} placeholder="Week focus" style={input} />
                        </div>
                      )}

                      {selectedWeekItems.map((item) => {
                        const exercise = exerciseMap.get(String(item.exercise_id));
                        return (
                          <div key={item.id} style={{ border: `1px solid ${UI.line}`, borderRadius: 11, padding: 11, marginBottom: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 900, color: UI.ink }}>{exercise?.title || "Activity"}</div>
                                <div style={{ fontSize: 9, color: UI.muted, marginTop: 3 }}>{targetLabel(item, exercise)} · {item.verification_type || exercise?.default_verification_type || "self"} check</div>
                              </div>
                              <button type="button" onClick={async () => {
                                if (!window.confirm("Remove this activity from the week?")) return;
                                const { error } = await supabase.from("sc_programme_items").delete().eq("id", item.id);
                                if (error) setMessage(error.message); else await loadAll();
                              }} style={{ ...button, background: UI.redSoft, color: UI.red, padding: "6px 8px" }}>Remove</button>
                            </div>
                          </div>
                        );
                      })}

                      {selectedWeek && (
                        <div style={{ border: `1px dashed ${UI.purple}`, background: UI.purpleSoft, borderRadius: 12, padding: 12, marginTop: 10 }}>
                          <div style={{ fontSize: 12, fontWeight: 900, color: UI.purpleDark }}>Add Activity</div>
                          <div style={{ display: "grid", gridTemplateColumns: "2fr repeat(4,1fr)", gap: 6, marginTop: 8 }}>
                            <select value={newItem.exercise_id} onChange={(e) => chooseExercise(e.target.value)} style={input}>
                              <option value="">Choose exercise…</option>
                              {exercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.title} · {exercise.category}</option>)}
                            </select>
                            <input type="number" min="1" value={newItem.sets} onChange={(e) => setNewItem((c)=>({...c,sets:e.target.value}))} placeholder="Sets" style={input} />
                            <input type="number" min="1" value={newItem.reps} onChange={(e) => setNewItem((c)=>({...c,reps:e.target.value}))} placeholder="Reps" style={input} />
                            <input type="number" min="1" value={newItem.duration_seconds} onChange={(e) => setNewItem((c)=>({...c,duration_seconds:e.target.value}))} placeholder="Seconds" style={input} />
                            <input type="number" min="1" value={newItem.distance_m} onChange={(e) => setNewItem((c)=>({...c,distance_m:e.target.value}))} placeholder="Distance m" style={input} />
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 180px 100px", gap: 6, marginTop: 6 }}>
                            <input value={newItem.target_text} onChange={(e) => setNewItem((c)=>({...c,target_text:e.target.value}))} placeholder="Optional custom target" style={input} />
                            <select value={newItem.verification_type} onChange={(e) => setNewItem((c)=>({...c,verification_type:e.target.value}))} style={input}>
                              <option value="self">Self check</option>
                              <option value="coach">Coach check</option>
                            </select>
                            <button type="button" onClick={addProgrammeItem} style={{ ...button, background: UI.purple, color: "#fff" }}>Add</button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div style={card}>
                        <div style={{ fontSize: 15, fontWeight: 900, color: UI.ink }}>Assign Programme</div>
                        <select value={assignmentForm.scope} onChange={(e)=>setAssignmentForm((c)=>({...c,scope:e.target.value,target_id:""}))} style={{...input,marginTop:10}}>
                          <option value="team">Whole Team</option>
                          <option value="subgroup">Training Group</option>
                          <option value="player">Individual Player</option>
                        </select>
                        {assignmentForm.scope === "subgroup" && (
                          <select value={assignmentForm.target_id} onChange={(e)=>setAssignmentForm((c)=>({...c,target_id:e.target.value}))} style={{...input,marginTop:7}}>
                            <option value="">Choose group…</option>
                            {groups.map((g)=><option key={g.id} value={g.id}>{g.name}</option>)}
                          </select>
                        )}
                        {assignmentForm.scope === "player" && (
                          <select value={assignmentForm.target_id} onChange={(e)=>setAssignmentForm((c)=>({...c,target_id:e.target.value}))} style={{...input,marginTop:7}}>
                            <option value="">Choose player…</option>
                            {players.map((p)=><option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        )}
                        <input type="date" value={assignmentForm.starts_on} onChange={(e)=>setAssignmentForm((c)=>({...c,starts_on:e.target.value}))} style={{...input,marginTop:7}} />
                        <button type="button" onClick={createAssignment} style={{...button,width:"100%",background:UI.purple,color:"#fff",marginTop:9}}>Publish Assignment</button>
                      </div>

                      <div style={card}>
                        <div style={{ fontSize: 15, fontWeight: 900, color: UI.ink }}>Current Assignments</div>
                        <div style={{ display: "grid", gap: 7, marginTop: 9 }}>
                          {assignments.filter((a)=>String(a.programme_id)===String(selectedProgramme.id)).map((a)=>(
                            <div key={a.id} style={{ padding: 9, border: `1px solid ${UI.line}`, borderRadius: 10 }}>
                              <div style={{ fontSize: 10, fontWeight: 900, color: UI.ink }}>
                                {a.scope === "team" ? "Whole Team" : a.scope === "player" ? players.find((p)=>String(p.id)===String(a.player_id))?.name || "Player" : groups.find((g)=>String(g.id)===String(a.group_id))?.name || "Training Group"}
                              </div>
                              <div style={{ fontSize: 8, color: UI.muted, marginTop: 2 }}>{a.starts_on} → {a.ends_on || "ongoing"} · {a.status}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "groups" && (
              GroupManager ? <GroupManager selectedTeam={selectedTeam} /> : <div style={card}>Training group manager unavailable.</div>
            )}

            {tab === "players" && (
              <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 14, alignItems: "start" }}>
                <div style={card}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: UI.ink }}>Players</div>
                  {players.map((player)=>(
                    <button key={player.id} type="button" onClick={()=>setSelectedPlayerId(player.id)} style={{
                      width:"100%", textAlign:"left",
                      border:String(player.id)===String(selectedPlayerId)?`2px solid ${UI.purple}`:`1px solid ${UI.line}`,
                      background:String(player.id)===String(selectedPlayerId)?UI.purpleSoft:"#fff",
                      borderRadius:10,padding:9,marginTop:6,cursor:"pointer"
                    }}>
                      <div style={{fontSize:10,fontWeight:900,color:UI.ink}}>{player.name}</div>
                      <div style={{fontSize:8,color:UI.muted,marginTop:3}}>{groupForPlayer(player.id)?.name || "No S&C group"}</div>
                    </button>
                  ))}
                </div>

                <div style={card}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: UI.ink }}>{selectedPlayer?.name || "Select a player"}</div>
                  <div style={{ display:"grid", gap:8, marginTop:10 }}>
                    {selectedPlayerRows.map((row)=>{
                      const state = row.progress?.status || "todo";
                      const feedbackRow = row.progress ? feedback.find((f)=>String(f.progress_id)===String(row.progress.id)) : null;
                      return (
                        <div key={`${row.assignment.id}:${row.item.id}`} style={{border:`1px solid ${UI.line}`,borderRadius:11,padding:11}}>
                          <div style={{display:"flex",justifyContent:"space-between",gap:10}}>
                            <div>
                              <div style={{fontSize:8,fontWeight:900,color:UI.purpleDark,textTransform:"uppercase"}}>{row.programme.title} · Week {row.week.week_number}</div>
                              <div style={{fontSize:13,fontWeight:900,color:UI.ink,marginTop:3}}>{row.exercise?.title || "Activity"}</div>
                              <div style={{fontSize:9,color:UI.muted,marginTop:3}}>Target: <strong>{targetLabel(row.item,row.exercise,row.override)}</strong></div>
                            </div>
                            <Chip bg={state==="approved"?UI.greenSoft:state==="pending"?"#EDE9FE":state==="needs_work"?UI.amberSoft:"#F3F4F6"} color={state==="approved"?UI.green:state==="pending"?UI.purpleDark:state==="needs_work"?UI.amber:UI.muted}>{state}</Chip>
                          </div>
                          {feedbackRow?.feedback && <div style={{fontSize:9,color:UI.ink,background:"#F8FAFC",padding:8,borderRadius:8,marginTop:8}}>Feedback: {feedbackRow.feedback}</div>}
                          <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
                            <button type="button" onClick={()=>openOverride(row)} style={{...button,padding:"6px 8px",background:"#F3F4F6",color:UI.ink,fontSize:8}}>Adjust Target</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {tab === "library" && (
              <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14, alignItems: "start" }}>
                <div style={card}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:16,fontWeight:900,color:UI.ink}}>Exercise Library</div>
                      <div style={{fontSize:9,color:UI.muted,marginTop:2}}>Reusable S&C activities</div>
                    </div>
                    <button type="button" onClick={()=>setShowAddExercise(true)} style={{...button,background:UI.purple,color:"#fff",padding:"7px 9px"}}>+ Add</button>
                  </div>
                  <input value={exerciseSearch} onChange={(e)=>setExerciseSearch(e.target.value)} placeholder="Search exercises…" style={{...input,marginTop:10}} />
                  <select value={exerciseCategory} onChange={(e)=>setExerciseCategory(e.target.value)} style={{...input,marginTop:7}}>
                    <option value="all">All categories</option>
                    <option value="strength">Strength</option>
                    <option value="mobility">Mobility</option>
                    <option value="speed">Speed</option>
                    <option value="conditioning">Conditioning</option>
                    <option value="recovery">Recovery</option>
                  </select>
                  <div style={{display:"grid",gap:6,marginTop:10}}>
                    {filteredExercises.map((exercise)=>(
                      <button key={exercise.id} type="button" onClick={()=>setSelectedExerciseId(exercise.id)} style={{
                        textAlign:"left",
                        border:String(exercise.id)===String(selectedExerciseId)?`2px solid ${UI.purple}`:`1px solid ${UI.line}`,
                        borderRadius:10,
                        background:String(exercise.id)===String(selectedExerciseId)?UI.purpleSoft:"#fff",
                        padding:9,
                        cursor:"pointer"
                      }}>
                        <div style={{fontSize:10,fontWeight:900,color:UI.ink}}>{exercise.title}</div>
                        <div style={{display:"flex",gap:5,marginTop:5}}><Chip>{exercise.category}</Chip>{exercise.is_global&&<Chip bg={UI.blueSoft} color={UI.blue}>Global</Chip>}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={card}>
                  {selectedExercise ? (
                    <>
                      <div style={{fontSize:20,fontWeight:900,color:UI.ink}}>{selectedExercise.title}</div>
                      <div style={{fontSize:9,color:UI.muted,marginTop:3}}>{selectedExercise.description || "No description yet."}</div>
                      <div style={{fontSize:9,color:UI.muted,marginTop:9}}>Default target: <strong>{targetLabel({},selectedExercise)}</strong></div>
                    </>
                  ) : "Choose an exercise."}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showCreateProgramme && (
        <Modal title="Create S&C Programme" onClose={()=>setShowCreateProgramme(false)}>
          <input value={programmeForm.title} onChange={(e)=>setProgrammeForm((c)=>({...c,title:e.target.value}))} placeholder="Programme name" style={input} />
          <textarea rows={3} value={programmeForm.description} onChange={(e)=>setProgrammeForm((c)=>({...c,description:e.target.value}))} placeholder="Description" style={{...input,marginTop:8,resize:"vertical"}} />
          <select value={programmeForm.duration_weeks} onChange={(e)=>setProgrammeForm((c)=>({...c,duration_weeks:Number(e.target.value)}))} style={{...input,marginTop:8}}>
            {Array.from({length:12},(_,i)=>i+1).map((week)=><option key={week} value={week}>{week} week{week===1?"":"s"}</option>)}
          </select>
          <button type="button" onClick={createProgramme} disabled={saving||!programmeForm.title.trim()} style={{...button,width:"100%",background:UI.purple,color:"#fff",marginTop:10}}>{saving?"Creating…":"Create Programme"}</button>
        </Modal>
      )}

      {showAddExercise && (
        <Modal title="Add S&C Exercise" onClose={()=>setShowAddExercise(false)}>
          <input value={exerciseForm.title} onChange={(e)=>setExerciseForm((c)=>({...c,title:e.target.value}))} placeholder="Exercise title" style={input} />
          <select value={exerciseForm.category} onChange={(e)=>setExerciseForm((c)=>({...c,category:e.target.value}))} style={{...input,marginTop:8}}>
            <option value="strength">Strength</option>
            <option value="mobility">Mobility</option>
            <option value="speed">Speed</option>
            <option value="conditioning">Conditioning</option>
            <option value="recovery">Recovery</option>
          </select>
          <textarea rows={3} value={exerciseForm.description} onChange={(e)=>setExerciseForm((c)=>({...c,description:e.target.value}))} placeholder="Description / coaching points" style={{...input,marginTop:8,resize:"vertical"}} />
          <button type="button" onClick={addExercise} disabled={saving||!exerciseForm.title.trim()} style={{...button,width:"100%",background:UI.purple,color:"#fff",marginTop:10}}>{saving?"Saving…":"Add Exercise"}</button>
        </Modal>
      )}

      {overrideEditor && (
        <Modal title={`${overrideEditor.player.name} · ${overrideEditor.exercise?.title || "S&C Activity"}`} onClose={()=>setOverrideEditor(null)}>
          <div style={{fontSize:10,color:UI.muted,marginBottom:10}}>Programme target: <strong>{targetLabel(overrideEditor.item,overrideEditor.exercise)}</strong></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7}}>
            {[
              ["Sets","sets"],["Reps","reps"],["Duration sec","duration_seconds"],["Distance m","distance_m"]
            ].map(([label,key])=>(
              <label key={key} style={{fontSize:8,fontWeight:800,color:UI.muted}}>
                {label}
                <input type="number" min="1" value={overrideDraft[key]} onChange={(e)=>setOverrideDraft((c)=>({...c,[key]:e.target.value}))} style={{...input,marginTop:4}} />
              </label>
            ))}
          </div>
          <input value={overrideDraft.target_text} onChange={(e)=>setOverrideDraft((c)=>({...c,target_text:e.target.value}))} placeholder="Custom target" style={{...input,marginTop:8}} />
          <textarea rows={3} value={overrideDraft.coach_note} onChange={(e)=>setOverrideDraft((c)=>({...c,coach_note:e.target.value}))} placeholder="Coach note" style={{...input,marginTop:8,resize:"vertical"}} />
          <button type="button" onClick={saveOverride} style={{...button,width:"100%",background:UI.purple,color:"#fff",marginTop:10}}>Save Override</button>
        </Modal>
      )}
    </div>
  );
}
