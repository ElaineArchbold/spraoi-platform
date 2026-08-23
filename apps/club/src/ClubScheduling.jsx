import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

const RED = "#d32f2f";
const INK = "#13243b";
const MUTED = "#627187";
const LINE = "#dfe7ef";
const SOFT = "#f6f9fc";
const DEFAULT_FACILITIES = [
  ["All-Weather Pitch", ""],
  ["New All-Weather Pitch", ""],
  ["Main Pitch", "Generally reserved for senior matches and training"],
  ["Balheary Bridge Pitch", ""],
  ["Balheary Container Pitch", ""],
  ["Millerâ€™s Glen", ""],
  ["Newbridge", ""],
];

function teamName(team) {
  if (!team) return "Team";
  const label = team.label || "Team";
  if (/boys|girls|mixed/i.test(label)) return label;
  if (team.gender === "girls") return `${label} Girls`;
  if (team.gender === "boys") return `${label} Boys`;
  return label;
}
function mondayOf(date = new Date()) {
  const d = new Date(date); d.setHours(0,0,0,0);
  const day = d.getDay() || 7; d.setDate(d.getDate() - day + 1);
  return d;
}
function isoDate(d) { return d.toISOString().slice(0,10); }
function dateForWeekday(weekStart, weekday) {
  const d = new Date(`${weekStart}T12:00:00`); d.setDate(d.getDate() + Number(weekday) - 1); return d;
}
function localDateTime(date, time) { return `${isoDate(date)}T${String(time).slice(0,5)}:00`; }
const card = { background:"#fff", border:`1px solid ${LINE}`, borderRadius:16, padding:18, boxShadow:"0 2px 12px rgba(15,35,60,.05)" };
const input = { height:38, borderRadius:9, border:`1px solid ${LINE}`, padding:"0 10px", fontSize:11, color:INK, background:"#fff" };
const btn = (primary=false) => ({ height:38, borderRadius:9, border: primary ? "none" : `1px solid ${LINE}`, padding:"0 13px", fontSize:11, fontWeight:800, cursor:"pointer", background:primary?RED:"#fff", color:primary?"#fff":INK });

export default function ClubScheduling({ club, ageGroups = [], currentUserId, hideHeader = false }) {
  const [tab,setTab] = useState("weekly");
  const [plannerView,setPlannerView] = useState("week");
  const [facilities,setFacilities] = useState([]);
  const [slots,setSlots] = useState([]);
  const [allocations,setAllocations] = useState([]);
  const [weekStart,setWeekStart] = useState(isoDate(mondayOf()));
  const [message,setMessage] = useState("");
  const [toast,setToast] = useState("");
  const [busy,setBusy] = useState(false);
  const [facilityName,setFacilityName] = useState("");
  const [teamId,setTeamId] = useState(ageGroups[0]?.id || "");
  const [facilityId,setFacilityId] = useState("");
  const [weekday,setWeekday] = useState("2");
  const [startTime,setStartTime] = useState("18:00");
  const [endTime,setEndTime] = useState("19:00");

  useEffect(()=>{ if(ageGroups.length && !teamId) setTeamId(ageGroups[0].id); },[ageGroups,teamId]);

  useEffect(() => {
    if (!facilityId && facilities.length) {
      const firstActive = facilities.find((facility) => facility.active);
      if (firstActive?.id) setFacilityId(firstActive.id);
    }
  }, [facilities, facilityId]);

  useEffect(()=>{ if(club?.id) loadAll(); },[club?.id,weekStart]);

  function showToast(text) {
    setToast(text);
    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(() => setToast(""), 3500);
  }

  async function loadAll(){
    if (!club?.id) return;
    try {
      const [f,s,a] = await Promise.all([
        supabase.from("facilities").select("*").eq("club_id",club.id).order("name"),
        supabase.from("recurring_training_slots").select("*").eq("club_id",club.id).eq("active",true).order("weekday").order("start_time"),
        supabase.from("weekly_training_allocations").select("*,facility:facilities(name)").eq("club_id",club.id).eq("week_start",weekStart).order("starts_at")
      ]);

      setFacilities(f?.data || []);
      setSlots(s?.data || []);
      setAllocations(a?.data || []);

      const errors = [f?.error, s?.error, a?.error].filter(Boolean);
      if (errors.length) {
        setMessage(`Facilities loaded, but some scheduling data is unavailable: ${errors[0].message}`);
      }
    } catch (error) {
      setFacilities([]);
      setSlots([]);
      setAllocations([]);
      setMessage(`Facilities could not load scheduling data: ${error?.message || "Unknown error"}`);
    }
  }
  async function seedFacilities(){
    if(!club?.id) return; setBusy(true); setMessage("");
    const rows = DEFAULT_FACILITIES.map(([name,notes])=>({club_id:club.id,name,notes,active:true}));
    const {error}=await supabase.from("facilities").upsert(rows,{onConflict:"club_id,name",ignoreDuplicates:true});
    setMessage(error?error.message:"Default club facilities added."); await loadAll(); setBusy(false);
  }
  async function addFacility(){
    if(!facilityName.trim()) return; const {error}=await supabase.from("facilities").insert({club_id:club.id,name:facilityName.trim(),active:true});
    if(error)setMessage(error.message); else {setFacilityName("");setMessage("Facility added.");await loadAll();}
  }
  async function toggleFacility(row){ await supabase.from("facilities").update({active:!row.active,updated_at:new Date().toISOString()}).eq("id",row.id); await loadAll(); }
  function allocationsOverlap(startA, endA, startB, endB) {
    const aStart = new Date(startA).getTime();
    const aEnd = new Date(endA).getTime();
    const bStart = new Date(startB).getTime();
    const bEnd = new Date(endB).getTime();

    return aStart < bEnd && aEnd > bStart;
  }

  function findPitchConflict({
    facilityId: wantedFacilityId,
    startsAt,
    endsAt,
    excludeId = null,
  }) {
    return allocations.find((allocation) => {
      if (allocation.id === excludeId) return false;
      if (allocation.status === "cancelled") return false;

      if (
        String(allocation.facility_id) !==
        String(wantedFacilityId)
      ) {
        return false;
      }

      return allocationsOverlap(
        startsAt,
        endsAt,
        allocation.starts_at,
        allocation.ends_at
      );
    });
  }

  function oneHourAfter(timeValue) {
    const [hours, minutes] = String(timeValue || "00:00")
      .split(":")
      .map(Number);

    const total = ((hours * 60) + minutes + 60) % (24 * 60);

    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(
      total % 60
    ).padStart(2, "0")}`;
  }

  async function addManualWeekSlot() {
    if (!teamId) {
      setMessage("Choose a team.");
      return;
    }

    if (!facilityId) {
      setMessage("Choose a pitch.");
      return;
    }

    if (!weekStart || !startTime || !endTime) {
      setMessage("Choose a valid week, start time and end time.");
      return;
    }

    setBusy(true);
    setMessage("");

    const date = dateForWeekday(weekStart, Number(weekday));

    const startsAt = localDateTime(date, startTime);
    const endsAt = localDateTime(date, endTime);

    if (new Date(endsAt) <= new Date(startsAt)) {
      setMessage("End time must be after start time.");
      setBusy(false);
      return;
    }

    const conflict = findPitchConflict({
      facilityId,
      startsAt,
      endsAt,
    });

    if (conflict) {
      const conflictTeam = ageGroups.find(
        (team) => team.id === conflict.age_group_id
      );

      const conflictStart = new Date(
        conflict.starts_at
      ).toLocaleTimeString("en-IE", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const conflictEnd = new Date(
        conflict.ends_at
      ).toLocaleTimeString("en-IE", {
        hour: "2-digit",
        minute: "2-digit",
      });

      setMessage(
        `That pitch is already booked by ${teamName(
          conflictTeam
        )} from ${conflictStart} to ${conflictEnd}.`
      );

      setBusy(false);
      return;
    }

    const row = {
      club_id: club.id,
      age_group_id: teamId,
      facility_id: facilityId,
      recurring_slot_id: null,
      week_start: weekStart,
      starts_at: startsAt,
      ends_at: endsAt,
      status: "draft",
      source: "manual",
    };

    const { error } = await supabase
      .from("weekly_training_allocations")
      .insert(row);

    if (error) {
      setMessage(error.message);
    } else {
      const team = ageGroups.find((item) => String(item.id) === String(teamId));
      const facility = facilities.find((item) => String(item.id) === String(facilityId));
      setMessage("");
      showToast(`Slot added: ${teamName(team)} · ${facility?.name || "Pitch"} · ${weekdays[Number(weekday) - 1]} ${startTime}-${endTime}`);
      await loadAll();
    }

    setBusy(false);
  }

  async function addSlot(){
    if(!teamId||!facilityId) {setMessage("Choose a team and facility.");return;}
    const {error}=await supabase.from("recurring_training_slots").insert({club_id:club.id,age_group_id:teamId,facility_id:facilityId,weekday:Number(weekday),start_time:startTime,end_time:endTime,effective_from:isoDate(new Date()),active:true});
    if (error) {
      setMessage(error.message);
      return;
    }
    const team = ageGroups.find((item) => String(item.id) === String(teamId));
    const facility = facilities.find((item) => String(item.id) === String(facilityId));
    setMessage("");
    showToast(`Recurring slot added: ${teamName(team)} · ${facility?.name || "Pitch"} · ${weekdays[Number(weekday) - 1]} ${startTime}-${endTime}`);
    await loadAll();
  }
  async function removeRecurringSlot(slot){
    if(!slot?.id) return;
    const team = ageGroups.find((item) => String(item.id) === String(slot.age_group_id));
    const confirmed = window.confirm(
      `Remove the recurring training slot for ${teamName(team)}? Future unpublished weekly drafts generated from this slot will also be cancelled. Published and past allocations will be kept.`
    );
    if(!confirmed) return;

    setBusy(true);
    setMessage("");
    const now = new Date().toISOString();

    const { error: slotError } = await supabase
      .from("recurring_training_slots")
      .update({ active:false, updated_at:now })
      .eq("id", slot.id);

    if(slotError){
      setMessage(`Could not remove recurring slot: ${slotError.message}`);
      setBusy(false);
      return;
    }

    const { error: allocationError } = await supabase
      .from("weekly_training_allocations")
      .update({ status:"cancelled", updated_at:now })
      .eq("recurring_slot_id", slot.id)
      .eq("status", "draft")
      .gte("starts_at", now);

    setMessage(
      allocationError
        ? `Recurring slot removed. Future drafts could not all be cancelled: ${allocationError.message}`
        : "Recurring slot removed. Future unpublished drafts from this slot were cancelled; published and past allocations were kept."
    );
    await loadAll();
    setBusy(false);
  }
  async function generateWeek(){
    setBusy(true); setMessage("");
    const rows = [];
    const conflicts = [];

    for (const slot of slots) {
      const date = dateForWeekday(weekStart, slot.weekday);

      const startsAt = localDateTime(
        date,
        slot.start_time
      );

      const endsAt = localDateTime(
        date,
        slot.end_time
      );

      const existingConflict = findPitchConflict({
        facilityId: slot.facility_id,
        startsAt,
        endsAt,
      });

      const generatedConflict = rows.find((row) =>
        String(row.facility_id) === String(slot.facility_id) &&
        allocationsOverlap(
          startsAt,
          endsAt,
          row.starts_at,
          row.ends_at
        )
      );

      if (existingConflict || generatedConflict) {
        conflicts.push(slot);
        continue;
      }

      rows.push({
        club_id: club.id,
        age_group_id: slot.age_group_id,
        facility_id: slot.facility_id,
        recurring_slot_id: slot.id,
        week_start: weekStart,
        starts_at: startsAt,
        ends_at: endsAt,
        status: "draft",
        source: "recurring",
      });
    }

    if (!rows.length) {
      setMessage(
        conflicts.length
          ? "No drafts were created because the recurring slots clash with existing pitch bookings."
          : "Add recurring slots first."
      );
      setBusy(false);
      return;
    }
    const {error}=await supabase.from("weekly_training_allocations").upsert(rows,{onConflict:"age_group_id,starts_at",ignoreDuplicates:true});
    setMessage(
      error
        ? error.message
        : conflicts.length
          ? `${rows.length} draft allocation${
              rows.length === 1 ? "" : "s"
            } generated. ${conflicts.length} conflicting slot${
              conflicts.length === 1 ? "" : "s"
            } skipped.`
          : "Draft allocations generated for this week."
    );

    await loadAll();
    setBusy(false);
  }
  async function updateAllocation(id,patch){ const {error}=await supabase.from("weekly_training_allocations").update({...patch,updated_at:new Date().toISOString()}).eq("id",id); if(error)setMessage(error.message); await loadAll(); }
  async function attachAllocationToExistingSession(allocation, event){
    if(!allocation?.age_group_id || !event?.id) return null;
    const sessionDate = String(allocation.starts_at || "").slice(0,10);
    if(!sessionDate) return null;

    const { data: plans, error: planError } = await supabase
      .from("weekly_plans")
      .select("id")
      .eq("age_group_id", allocation.age_group_id);
    if(planError || !plans?.length) return null;

    const { data: sessionRows, error: sessionError } = await supabase
      .from("sessions")
      .select("id,event_id,planned_starts_at,planned_location,created_at")
      .in("plan_id", plans.map((plan) => plan.id))
      .eq("session_date", sessionDate)
      .order("created_at", { ascending:true })
      .limit(1);
    if(sessionError || !sessionRows?.length) return null;

    const session = sessionRows[0];
    const confirmedLocation = allocation.facility?.name || event.location || null;
    const sessionPatch = { event_id:event.id };
    if(!session.planned_starts_at) sessionPatch.planned_starts_at = allocation.starts_at;
    if(!session.planned_location && confirmedLocation) sessionPatch.planned_location = confirmedLocation;

    await supabase.from("sessions").update(sessionPatch).eq("id", session.id);
    await supabase.from("club_events").update({ session_id:session.id }).eq("id", event.id);

    const { data: draftRows } = await supabase
      .from("connect_messages")
      .select("id,body")
      .eq("club_id", club.id)
      .eq("age_group_id", allocation.age_group_id)
      .eq("message_type", "coach_session_draft")
      .is("sent_at", null)
      .is("event_id", null)
      .order("created_at", { ascending:false })
      .limit(1);

    const draft = draftRows?.[0];
    if(draft?.id){
      const start = new Date(allocation.starts_at);
      const end = allocation.ends_at ? new Date(allocation.ends_at) : null;
      const timeLabel = `${start.toLocaleTimeString("en-IE", { hour:"2-digit", minute:"2-digit", hour12:false })}${end ? `–${end.toLocaleTimeString("en-IE", { hour:"2-digit", minute:"2-digit", hour12:false })}` : ""}`;
      const nextBody = String(draft.body || "")
        .replace(/^Time:.*$/m, `Time: ${timeLabel}`)
        .replace(/^Location:.*$/m, `Location: ${confirmedLocation || "Location TBC"}`);
      await supabase.from("connect_messages").update({ event_id:event.id, body:nextBody }).eq("id", draft.id);
    }

    return session;
  }
  async function publishWeek(){
    if(!allocations.length){setMessage("Generate the week first.");return;}
    setBusy(true); setMessage(""); const now=new Date().toISOString();
    for(const a of allocations.filter(x=>x.status!=="cancelled")){
      await supabase.from("weekly_training_allocations").update({status:"published",approved_by:currentUserId,approved_at:a.approved_at||now,published_at:now,updated_at:now}).eq("id",a.id);
      const {data:existingEvent}=await supabase.from("club_events").select("*").eq("training_allocation_id",a.id).maybeSingle();
      const eventPayload={club_id:club.id,age_group_id:a.age_group_id,event_type:"training",title:"Training",facility_id:a.facility_id,location:a.facility?.name||null,starts_at:a.starts_at,ends_at:a.ends_at,status:existingEvent?"changed":"scheduled",source:"club_allocation",training_allocation_id:a.id,created_by:currentUserId};
      const changed=Boolean(existingEvent&&(String(existingEvent.facility_id||"")!==String(a.facility_id||"")||new Date(existingEvent.starts_at).getTime()!==new Date(a.starts_at).getTime()||new Date(existingEvent.ends_at||0).getTime()!==new Date(a.ends_at||0).getTime()));
      const {data:event}=await supabase.from("club_events").upsert(eventPayload,{onConflict:"training_allocation_id"}).select().maybeSingle();
      if(event?.id){
        await attachAllocationToExistingSession(a,event);
      }
      if(changed&&event?.id){
        const {data:kids}=await supabase.from("journey_players").select("parent_user_id").eq("age_group_id",a.age_group_id).not("parent_user_id","is",null);
        const parentIds=[...new Set((kids||[]).map(x=>x.parent_user_id).filter(Boolean))];
        if(parentIds.length) await supabase.from("notifications").insert(parentIds.map(uid=>({club_id:club.id,user_id:uid,age_group_id:a.age_group_id,event_id:event.id,type:"training_changed",title:"Training has changed",message:`${teamName(ageGroups.find(t=>t.id===a.age_group_id))} training is now ${new Date(a.starts_at).toLocaleString("en-IE",{weekday:"short",hour:"2-digit",minute:"2-digit"})} at ${a.facility?.name||"the confirmed venue"}.`,priority:"important",action_url:"/"})));
      }
      const {data:staff}=await supabase.from("team_staff").select("user_id,coach:coaches(email,name)").eq("club_id",club.id).eq("age_group_id",a.age_group_id).eq("role","lead_coach").eq("status","active");
      const team=ageGroups.find(t=>t.id===a.age_group_id);
      const allocationMessage=`${teamName(team)} training is confirmed for ${new Date(a.starts_at).toLocaleString("en-IE",{weekday:"short",hour:"2-digit",minute:"2-digit"})} at ${a.facility?.name||"the allocated venue"}.`;
      const notes=(staff||[]).filter(x=>x.user_id).map(x=>({club_id:club.id,user_id:x.user_id,age_group_id:a.age_group_id,event_id:event?.id||null,type:"pitch_allocation_published",title:"Pitch allocation confirmed",message:allocationMessage,priority:"important",action_url:"/coach/?screen=coach-planner"}));
      if(notes.length) await supabase.from("notifications").insert(notes);

    }
    const publishedAllocations = allocations.filter(
      (allocation) => allocation.status !== "cancelled"
    );

    const { data: clubLeadStaff } = await supabase
      .from("team_staff")
      .select("user_id,coach:coaches(email,name)")
      .eq("club_id", club.id)
      .eq("role", "lead_coach")
      .eq("status", "active");

    const leadEmails = [
      ...new Set(
        (clubLeadStaff || [])
          .map((row) => row.coach?.email)
          .filter(Boolean)
      ),
    ];

    if (leadEmails.length) {
      const summaryLines = publishedAllocations
        .sort(
          (a, b) =>
            new Date(a.starts_at).getTime() -
            new Date(b.starts_at).getTime()
        )
        .map((allocation) => {
          const team = ageGroups.find(
            (item) => item.id === allocation.age_group_id
          );

          const facility =
            allocation.facility?.name ||
            facilities.find(
              (item) => item.id === allocation.facility_id
            )?.name ||
            "Venue TBC";

          const when = new Date(
            allocation.starts_at
          ).toLocaleString("en-IE", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          });

          return `${teamName(team)} - ${when} - ${facility}`;
        });

      await supabase.functions.invoke(
        "send-spraoi-notification-email",
        {
          body: {
            recipients: leadEmails,
            subject: "Spraoi: Weekly pitch plan published",
            title: "Weekly pitch plan published",
            message: [
              `The pitch plan for the week beginning ${new Date(
                `${weekStart}T12:00:00`
              ).toLocaleDateString("en-IE", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })} has been published.`,
              "",
              ...summaryLines,
            ].join("\n"),
            actionUrl: `${window.location.origin}/coach/?screen=coach-planner`,
          },
        }
      );
    }

    setMessage(
      leadEmails.length
        ? `Weekly allocations published. ${leadEmails.length} Lead Coach${
            leadEmails.length === 1 ? "" : "es"
          } emailed.`
        : "Weekly allocations published. No Lead Coach email addresses were found."
    );

    await loadAll();
    setBusy(false);
  }
  const activeFacilities = facilities.filter((f) => f.active);

  const weekdays = [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Sun",
  ];

  const slotRows = useMemo(
    () =>
      slots.map((slot) => ({
        ...slot,
        team: ageGroups.find(
          (team) => team.id === slot.age_group_id
        ),
        facility: facilities.find(
          (facility) => facility.id === slot.facility_id
        ),
      })),
    [slots, ageGroups, facilities]
  );

  const publishedCount = allocations.filter(
    (row) => row.status === "published"
  ).length;

  const draftCount = allocations.filter(
    (row) => row.status === "draft"
  ).length;

  const cancelledCount = allocations.filter(
    (row) => row.status === "cancelled"
  ).length;

  const statCard = {
    background: "#fff",
    border: `1px solid ${LINE}`,
    borderRadius: 14,
    padding: 15,
  };

  const sectionTitle = {
    fontSize: 16,
    fontWeight: 800,
    color: INK,
    margin: 0,
  };

  const sectionSub = {
    fontSize: 10,
    color: MUTED,
    marginTop: 4,
    lineHeight: 1.5,
  };

  return (
    <div>
      <style>{`
        @media (max-width: 850px) {
          .facilities-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .facility-slot-form {
            grid-template-columns: 1fr 1fr !important;
          }

          .facility-allocation-row {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 520px) {
          .facilities-summary-grid {
            grid-template-columns: 1fr !important;
          }

          .facility-slot-form {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {!hideHeader && (
      <div
        style={{
          marginBottom: 18,
          padding: "18px 20px",
          borderRadius: 18,
          background: "linear-gradient(135deg, #fffafa 0%, #fff0f0 52%, #fbdcdc 100%)",
          border: "1px solid #f3caca",
          display: "flex",
          alignItems: "center",
          gap: 14
        }}
      >
        <div style={{ width: 50, height: 50, borderRadius: 15, background: "#fff", display: "grid", placeItems: "center", border: "1px solid #f0d2d2", boxShadow: "0 8px 22px rgba(211,47,47,.08)" }}>
          <img src="/icons/club/facilities.svg" alt="" aria-hidden="true" style={{ width: 34, height: 34, objectFit: "contain" }} />
        </div>
        <div>
          <div style={{ fontFamily: "Manrope, Segoe UI, sans-serif", fontSize: 22, fontWeight: 750, color: INK, letterSpacing: "-.025em" }}>Facilities & Slots</div>
          <div style={{ fontFamily: "Inter, Segoe UI, sans-serif", fontSize: 11, color: MUTED, marginTop: 3 }}>Manage facilities, recurring training slots and weekly pitch allocations.</div>
        </div>
      </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 7,
          overflowX: "auto",
          marginBottom: 18,
          paddingBottom: 10,
          borderBottom: `1px solid ${LINE}`,
        }}
      >
        {[
          ["weekly", "Weekly Allocations"],
          ["recurring", "Recurring Slots"],
          ["facilities", "Facilities"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            style={{
              whiteSpace: "nowrap",
              height: 36,
              borderRadius: 9,
              padding: "0 13px",
              border: `1px solid ${tab === id ? RED : LINE}`,
              background:
                tab === id
                  ? "#fff1f1"
                  : "#fff",
              color:
                tab === id
                  ? RED
                  : INK,
              fontSize: 10,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div
        className="facilities-summary-grid"
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(4, minmax(0, 1fr))",
          gap: 10,
          marginBottom: 18,
        }}
      >
        <div style={statCard}>
          <div
            style={{
              fontSize: 9,
              color: MUTED,
              textTransform: "uppercase",
              fontWeight: 800,
            }}
          >
            Active facilities
          </div>

          <div
            style={{
              fontSize: 25,
              fontWeight: 800,
              color: INK,
              marginTop: 5,
            }}
          >
            {activeFacilities.length}
          </div>

          <div style={sectionSub}>
            Available for allocations
          </div>
        </div>

        <div style={statCard}>
          <div
            style={{
              fontSize: 9,
              color: MUTED,
              textTransform: "uppercase",
              fontWeight: 800,
            }}
          >
            Recurring slots
          </div>

          <div
            style={{
              fontSize: 25,
              fontWeight: 800,
              color: INK,
              marginTop: 5,
            }}
          >
            {slots.length}
          </div>

          <div style={sectionSub}>
            Weekly training defaults
          </div>
        </div>

        <div style={statCard}>
          <div
            style={{
              fontSize: 9,
              color: MUTED,
              textTransform: "uppercase",
              fontWeight: 800,
            }}
          >
            Draft this week
          </div>

          <div
            style={{
              fontSize: 25,
              fontWeight: 800,
              color: INK,
              marginTop: 5,
            }}
          >
            {draftCount}
          </div>

          <div style={sectionSub}>
            Awaiting review
          </div>
        </div>

        <div style={statCard}>
          <div
            style={{
              fontSize: 9,
              color: MUTED,
              textTransform: "uppercase",
              fontWeight: 800,
            }}
          >
            Published
          </div>

          <div
            style={{
              fontSize: 25,
              fontWeight: 800,
              color: "#15803d",
              marginTop: 5,
            }}
          >
            {publishedCount}
          </div>

          <div style={sectionSub}>
            Confirmed this week
          </div>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            right: 22,
            bottom: 22,
            zIndex: 9999,
            maxWidth: 430,
            padding: "14px 16px",
            borderRadius: 14,
            background: "#166534",
            color: "#fff",
            boxShadow: "0 14px 36px rgba(15, 23, 42, .24)",
            fontSize: 11,
            fontWeight: 800,
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 17 }}>✓</span>
          <span>{toast}</span>
          <button
            type="button"
            onClick={() => setToast("")}
            aria-label="Close notification"
            style={{ marginLeft: "auto", border: 0, background: "transparent", color: "#fff", cursor: "pointer", fontSize: 16 }}
          >×</button>
        </div>
      )}

      {message && (
        <div
          style={{
            ...card,
            marginBottom: 14,
            padding: 12,
            fontSize: 11,
          }}
        >
          {message}
        </div>
      )}

      {/* ====================================================
          WEEKLY ALLOCATIONS
      ==================================================== */}
      {tab === "weekly" && (
        <>
          <div
            style={{
              ...card,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 14,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={sectionTitle}>
                  Weekly Pitch Plan
                </div>

                <div style={sectionSub}>
                  Generate the week from recurring slots, or add
                  one-off bookings directly to the pitch planner.
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <input
                  type="date"
                  value={weekStart}
                  onChange={(event) =>
                    setWeekStart(event.target.value)
                  }
                  style={input}
                />

                <button
                  type="button"
                  onClick={generateWeek}
                  disabled={busy}
                  style={btn(false)}
                >
                  Generate Drafts
                </button>

                <button
                  type="button"
                  onClick={publishWeek}
                  disabled={busy}
                  style={btn(true)}
                >
                  Publish Week
                </button>
              </div>
            </div>
          </div>

          {/* MANUAL SLOT */}
          <div
            style={{
              ...card,
              marginBottom: 14,
            }}
          >
            <div style={sectionTitle}>
              Add Slot
            </div>

            <div style={sectionSub}>
              Add a one-off training allocation directly to this week.
              End time defaults to one hour after the selected start time.
            </div>

            <div
              className="facility-slot-form"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1.6fr 1.6fr 1fr 1fr 1fr auto",
                gap: 8,
                marginTop: 14,
              }}
            >
              <select
                value={teamId}
                onChange={(event) =>
                  setTeamId(event.target.value)
                }
                style={input}
              >
                <option value="">Choose team</option>

                {ageGroups.map((team) => (
                  <option
                    key={team.id}
                    value={team.id}
                  >
                    {teamName(team)}
                  </option>
                ))}
              </select>

              <select
                value={facilityId}
                onChange={(event) =>
                  setFacilityId(event.target.value)
                }
                style={input}
              >
                <option value="">Choose pitch</option>

                {activeFacilities.map((facility) => (
                  <option
                    key={facility.id}
                    value={facility.id}
                  >
                    {facility.name}
                  </option>
                ))}
              </select>

              <select
                value={weekday}
                onChange={(event) =>
                  setWeekday(event.target.value)
                }
                style={input}
              >
                {weekdays.map((day, index) => (
                  <option
                    key={day}
                    value={index + 1}
                  >
                    {day}
                  </option>
                ))}
              </select>

              <input
                type="time"
                value={startTime}
                onChange={(event) => {
                  const nextStart = event.target.value;
                  setStartTime(nextStart);
                  setEndTime(oneHourAfter(nextStart));
                }}
                style={input}
              />

              <input
                type="time"
                value={endTime}
                onChange={(event) =>
                  setEndTime(event.target.value)
                }
                style={input}
              />

              <button
                type="button"
                onClick={addManualWeekSlot}
                disabled={busy}
                style={btn(true)}
              >
                Add to Week
              </button>
            </div>
          </div>

          {/* COMPACT PITCH TIMETABLE */}
          <div style={card}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              <div>
                <div style={sectionTitle}>Pitch Planner</div>
                <div style={sectionSub}>
                  View the full week at a glance or switch to detailed day and weekend timetables.
                </div>
              </div>

              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {[
                  ["week","Week"],
                  ["day","Day"],
                  ["weekend","Weekend"],
                ].map(([key,label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPlannerView(key)}
                    style={{
                      ...btn(plannerView === key),
                      height:34,
                      padding:"0 12px",
                      fontSize:9,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {activeFacilities.length === 0 ? (
              <div
                style={{
                  padding:"30px 16px",
                  border:`1px dashed ${LINE}`,
                  borderRadius:12,
                  textAlign:"center",
                  color:MUTED,
                  fontSize:10,
                  background:SOFT,
                }}
              >
                Add at least one facility before creating the pitch plan.
              </div>
            ) : (
              <>
                {/* ==================================================
                    WEEK VIEW
                ================================================== */}
                {plannerView === "week" && (() => {

                  function shortTeam(team) {
                    if (!team) return "TEAM";

                    const raw = String(
                      team.label || team.name || ""
                    ).trim();

                    let label = raw
                      .replace(/\s*Boys$/i,"B")
                      .replace(/\s*Girls$/i,"G")
                      .replace(/\s*Mixed$/i,"M");

                    if (
                      !/[BGM]$/i.test(label) &&
                      team.gender === "boys"
                    ) label += "B";

                    if (
                      !/[BGM]$/i.test(label) &&
                      team.gender === "girls"
                    ) label += "G";

                    return label.replace(/\s+/g,"");
                  }

                  const weekdayTimes = [
                    "17:00",
                    "17:30",
                    "18:00",
                    "18:30",
                    "19:00",
                    "19:30",
                    "20:00",
                    "20:30",
                  ];

                  function minutes(time) {
                    const [h,m] = time.split(":").map(Number);
                    return h * 60 + m;
                  }

                  return (
                    <div
                      style={{
                        display:"grid",
                        gridTemplateColumns:"repeat(5,minmax(0,1fr))",
                        gap:8,
                      }}
                    >
                      {weekdays.slice(0,5).map((day,index) => {
                        const date = dateForWeekday(
                          weekStart,
                          index + 1
                        );

                        const dayAllocations = allocations.filter(
                          allocation => {
                            if (
                              allocation.status === "cancelled"
                            ) return false;

                            const d = new Date(
                              allocation.starts_at
                            );

                            return (
                              d.getFullYear() === date.getFullYear() &&
                              d.getMonth() === date.getMonth() &&
                              d.getDate() === date.getDate()
                            );
                          }
                        );

                        return (
                          <div
                            key={day}
                            style={{
                              border:`1px solid ${LINE}`,
                              borderRadius:10,
                              overflow:"hidden",
                              minWidth:0,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setWeekday(String(index + 1));
                                setPlannerView("day");
                              }}
                              style={{
                                width:"100%",
                                border:"none",
                                borderBottom:`1px solid ${LINE}`,
                                background:SOFT,
                                padding:"8px 6px",
                                cursor:"pointer",
                                textAlign:"left",
                              }}
                            >
                              <div
                                style={{
                                  fontSize:10,
                                  fontWeight:900,
                                  color:INK,
                                }}
                              >
                                {day}
                              </div>

                              <div
                                style={{
                                  fontSize:8,
                                  color:MUTED,
                                  marginTop:2,
                                }}
                              >
                                {date.toLocaleDateString(
                                  "en-IE",
                                  {
                                    day:"numeric",
                                    month:"short",
                                  }
                                )}
                              </div>
                            </button>

                            {weekdayTimes.map(time => {
                              const rowStart = minutes(time);
                              const rowEnd = rowStart + 30;

                              const bookings =
                                dayAllocations.filter(
                                  allocation => {
                                    const d = new Date(
                                      allocation.starts_at
                                    );

                                    const start =
                                      d.getHours() * 60 +
                                      d.getMinutes();

                                    return (
                                      start >= rowStart &&
                                      start < rowEnd
                                    );
                                  }
                                );

                              return (
                                <div
                                  key={time}
                                  style={{
                                    minHeight:32,
                                    borderBottom:
                                      `1px solid ${LINE}`,
                                    padding:"3px 4px",
                                    display:"flex",
                                    gap:3,
                                    alignItems:"center",
                                  }}
                                >
                                  <span
                                    style={{
                                      width:31,
                                      flex:"0 0 31px",
                                      fontSize:7,
                                      color:MUTED,
                                    }}
                                  >
                                    {time}
                                  </span>

                                  <div
                                    style={{
                                      display:"flex",
                                      flexWrap:"wrap",
                                      gap:3,
                                    }}
                                  >
                                    {bookings.map(allocation => {
                                      const team =
                                        ageGroups.find(
                                          t =>
                                            t.id ===
                                            allocation.age_group_id
                                        );

                                      const pitch =
                                        facilities.find(
                                          f =>
                                            f.id ===
                                            allocation.facility_id
                                        );

                                      return (
                                        <span
                                          key={allocation.id}
                                          title={`${teamName(team)} - ${pitch?.name || "Pitch"}`}
                                          style={{
                                            padding:"3px 5px",
                                            borderRadius:6,
                                            background:
                                              allocation.status ===
                                              "published"
                                                ? "#f0fdf4"
                                                : "#fff",
                                            border:
                                              allocation.status ===
                                              "published"
                                                ? "1px solid #86efac"
                                                : `1px solid ${LINE}`,
                                            fontSize:8,
                                            fontWeight:900,
                                            color:INK,
                                          }}
                                        >
                                          {shortTeam(team)}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}


                {/* ==================================================
                    DAY VIEW
                ================================================== */}
                {plannerView === "day" && (() => {

                  const selectedDay =
                    Math.min(Number(weekday) || 1,5);

                  const selectedDate = dateForWeekday(
                    weekStart,
                    selectedDay
                  );

                  const timeSlots = [
                    "17:00",
                    "17:30",
                    "18:00",
                    "18:30",
                    "19:00",
                    "19:30",
                    "20:00",
                    "20:30",
                  ];

                  function teamShortName(team) {
                    if (!team) return "TEAM";

                    const raw = String(
                      team.label || team.name || ""
                    ).trim();

                    let label = raw
                      .replace(/\s*Boys$/i,"B")
                      .replace(/\s*Girls$/i,"G")
                      .replace(/\s*Mixed$/i,"M");

                    if (
                      !/[BGM]$/i.test(label) &&
                      team.gender === "boys"
                    ) label += "B";

                    if (
                      !/[BGM]$/i.test(label) &&
                      team.gender === "girls"
                    ) label += "G";

                    return label.replace(/\s+/g,"");
                  }

                  function minutesOfDate(value) {
                    const d = new Date(value);
                    return d.getHours() * 60 + d.getMinutes();
                  }

                  function slotMinute(time) {
                    const [h,m] =
                      time.split(":").map(Number);
                    return h * 60 + m;
                  }

                  return (
                    <>
                      <div
                        style={{
                          display:"flex",
                          gap:6,
                          flexWrap:"wrap",
                          marginBottom:10,
                        }}
                      >
                        {weekdays
                          .slice(0,5)
                          .map((day,index) => {
                            const date =
                              dateForWeekday(
                                weekStart,
                                index + 1
                              );

                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() =>
                                  setWeekday(
                                    String(index + 1)
                                  )
                                }
                                style={{
                                  ...btn(
                                    selectedDay ===
                                    index + 1
                                  ),
                                  height:32,
                                  fontSize:8,
                                }}
                              >
                                {day}{" "}
                                {date.toLocaleDateString(
                                  "en-IE",
                                  {
                                    day:"numeric",
                                    month:"short",
                                  }
                                )}
                              </button>
                            );
                          })}
                      </div>

                      <div
                        style={{
                          border:`1px solid ${LINE}`,
                          borderRadius:10,
                          overflow:"hidden",
                        }}
                      >
                        <div
                          style={{
                            display:"grid",
                            gridTemplateColumns:
                              `66px repeat(${activeFacilities.length},minmax(90px,1fr))`,
                            background:SOFT,
                          }}
                        >
                          <div
                            style={{
                              padding:7,
                              fontSize:8,
                              fontWeight:900,
                              color:MUTED,
                            }}
                          >
                            TIME
                          </div>

                          {activeFacilities.map(
                            facility => (
                              <div
                                key={facility.id}
                                style={{
                                  padding:7,
                                  borderLeft:
                                    `1px solid ${LINE}`,
                                  fontSize:8,
                                  fontWeight:900,
                                }}
                              >
                                {facility.name}
                              </div>
                            )
                          )}
                        </div>

                        {timeSlots.map(time => {
                          const rowStart =
                            slotMinute(time);

                          const rowEnd =
                            rowStart + 30;

                          return (
                            <div
                              key={time}
                              style={{
                                display:"grid",
                                gridTemplateColumns:
                                  `66px repeat(${activeFacilities.length},minmax(90px,1fr))`,
                                minHeight:38,
                                borderTop:
                                  `1px solid ${LINE}`,
                              }}
                            >
                              <div
                                style={{
                                  padding:6,
                                  fontSize:8,
                                  color:MUTED,
                                  background:"#fafafa",
                                }}
                              >
                                {time}
                              </div>

                              {activeFacilities.map(
                                facility => {
                                  const bookings =
                                    allocations.filter(
                                      allocation => {
                                        if (
                                          allocation.status ===
                                          "cancelled"
                                        ) return false;

                                        if (
                                          String(
                                            allocation.facility_id
                                          ) !==
                                          String(facility.id)
                                        ) return false;

                                        const d =
                                          new Date(
                                            allocation.starts_at
                                          );

                                        if (
                                          d.getFullYear() !==
                                          selectedDate.getFullYear() ||
                                          d.getMonth() !==
                                          selectedDate.getMonth() ||
                                          d.getDate() !==
                                          selectedDate.getDate()
                                        ) return false;

                                        const start =
                                          minutesOfDate(
                                            allocation.starts_at
                                          );

                                        return (
                                          start >= rowStart &&
                                          start < rowEnd
                                        );
                                      }
                                    );

                                  return (
                                    <div
                                      key={facility.id}
                                      style={{
                                        borderLeft:
                                          `1px solid ${LINE}`,
                                        padding:3,
                                      }}
                                    >
                                      {bookings.map(
                                        allocation => {
                                          const team =
                                            ageGroups.find(
                                              t =>
                                                t.id ===
                                                allocation.age_group_id
                                            );

                                          return (
                                            <div
                                              key={
                                                allocation.id
                                              }
                                              style={{
                                                padding:
                                                  "5px 4px",
                                                borderRadius:6,
                                                textAlign:"center",
                                                fontSize:9,
                                                fontWeight:900,
                                                background:
                                                  allocation.status ===
                                                  "published"
                                                    ? "#f0fdf4"
                                                    : "#fff",
                                                border:
                                                  allocation.status ===
                                                  "published"
                                                    ? "1px solid #86efac"
                                                    : `1px solid ${LINE}`,
                                              }}
                                            >
                                              {teamShortName(
                                                team
                                              )}
                                            </div>
                                          );
                                        }
                                      )}
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}


                {/* ==================================================
                    WEEKEND TIMETABLE
                ================================================== */}
                {plannerView === "weekend" && (() => {

                  const weekendTimes = [];

                  for (
                    let mins = 8 * 60;
                    mins < 21 * 60;
                    mins += 30
                  ) {
                    const h = Math.floor(mins / 60);
                    const m = mins % 60;

                    weekendTimes.push(
                      `${String(h).padStart(2,"0")}:${String(
                        m
                      ).padStart(2,"0")}`
                    );
                  }

                  function minuteOfTime(time) {
                    const [h,m] =
                      time.split(":").map(Number);
                    return h * 60 + m;
                  }

                  function shortTeam(team) {
                    if (!team) return "TEAM";

                    const raw = String(
                      team.label || team.name || ""
                    ).trim();

                    let label = raw
                      .replace(/\s*Boys$/i,"B")
                      .replace(/\s*Girls$/i,"G")
                      .replace(/\s*Mixed$/i,"M");

                    if (
                      !/[BGM]$/i.test(label) &&
                      team.gender === "boys"
                    ) label += "B";

                    if (
                      !/[BGM]$/i.test(label) &&
                      team.gender === "girls"
                    ) label += "G";

                    return label.replace(/\s+/g,"");
                  }

                  return (
                    <div
                      style={{
                        display:"grid",
                        gridTemplateColumns:
                          "repeat(2,minmax(0,1fr))",
                        gap:12,
                      }}
                    >
                      {[6,7].map(dayNumber => {
                        const date =
                          dateForWeekday(
                            weekStart,
                            dayNumber
                          );

                        const label =
                          dayNumber === 6
                            ? "Saturday"
                            : "Sunday";

                        return (
                          <div
                            key={dayNumber}
                            style={{
                              border:`1px solid ${LINE}`,
                              borderRadius:10,
                              overflow:"hidden",
                            }}
                          >
                            <div
                              style={{
                                padding:9,
                                background:SOFT,
                                fontSize:10,
                                fontWeight:900,
                              }}
                            >
                              {label}{" "}
                              {date.toLocaleDateString(
                                "en-IE",
                                {
                                  day:"numeric",
                                  month:"short",
                                }
                              )}
                            </div>

                            {weekendTimes.map(time => {
                              const rowStart =
                                minuteOfTime(time);

                              const rowEnd =
                                rowStart + 30;

                              const bookings =
                                allocations.filter(
                                  allocation => {
                                    if (
                                      allocation.status ===
                                      "cancelled"
                                    ) return false;

                                    const d =
                                      new Date(
                                        allocation.starts_at
                                      );

                                    if (
                                      d.getFullYear() !==
                                      date.getFullYear() ||
                                      d.getMonth() !==
                                      date.getMonth() ||
                                      d.getDate() !==
                                      date.getDate()
                                    ) return false;

                                    const start =
                                      d.getHours() * 60 +
                                      d.getMinutes();

                                    return (
                                      start >= rowStart &&
                                      start < rowEnd
                                    );
                                  }
                                );

                              return (
                                <div
                                  key={time}
                                  style={{
                                    display:"grid",
                                    gridTemplateColumns:
                                      "50px 1fr",
                                    minHeight:31,
                                    borderTop:
                                      `1px solid ${LINE}`,
                                  }}
                                >
                                  <div
                                    style={{
                                      padding:5,
                                      fontSize:7,
                                      color:MUTED,
                                      background:"#fafafa",
                                    }}
                                  >
                                    {time}
                                  </div>

                                  <div
                                    style={{
                                      padding:3,
                                      display:"flex",
                                      gap:4,
                                      flexWrap:"wrap",
                                    }}
                                  >
                                    {bookings.map(
                                      allocation => {
                                        const team =
                                          ageGroups.find(
                                            t =>
                                              t.id ===
                                              allocation.age_group_id
                                          );

                                        const pitch =
                                          facilities.find(
                                            f =>
                                              f.id ===
                                              allocation.facility_id
                                          );

                                        return (
                                          <span
                                            key={
                                              allocation.id
                                            }
                                            title={
                                              pitch?.name ||
                                              "Pitch"
                                            }
                                            style={{
                                              padding:
                                                "3px 5px",
                                              borderRadius:6,
                                              fontSize:8,
                                              fontWeight:900,
                                              border:
                                                `1px solid ${LINE}`,
                                              background:"#fff",
                                            }}
                                          >
                                            {shortTeam(team)}
                                            {" - "}
                                            {pitch?.name ||
                                              "Pitch"}
                                          </span>
                                        );
                                      }
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </>
      )}

      {/* ====================================================
          RECURRING SLOTS
      ==================================================== */}
      {tab === "recurring" && (
        <>
          <div
            style={{
              ...card,
              marginBottom: 14,
            }}
          >
            <div style={sectionTitle}>
              Add recurring training slot
            </div>

            <div style={sectionSub}>
              Set the normal weekly training allocation for
              each team. These become the starting point for
              each week's draft.
            </div>

            <div
              className="facility-slot-form"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "2fr 2fr 1fr 1fr 1fr auto",
                gap: 8,
                marginTop: 14,
              }}
            >
              <select
                value={teamId}
                onChange={(event) =>
                  setTeamId(event.target.value)
                }
                style={input}
              >
                <option value="">Choose team</option>

                {ageGroups.map((team) => (
                  <option
                    key={team.id}
                    value={team.id}
                  >
                    {teamName(team)}
                  </option>
                ))}
              </select>

              <select
                value={facilityId}
                onChange={(event) =>
                  setFacilityId(event.target.value)
                }
                style={input}
              >
                <option value="">
                  Choose facility
                </option>

                {activeFacilities.map(
                  (facility) => (
                    <option
                      key={facility.id}
                      value={facility.id}
                    >
                      {facility.name}
                    </option>
                  )
                )}
              </select>

              <select
                value={weekday}
                onChange={(event) =>
                  setWeekday(event.target.value)
                }
                style={input}
              >
                {weekdays.map((day, index) => (
                  <option
                    key={day}
                    value={index + 1}
                  >
                    {day}
                  </option>
                ))}
              </select>

              <input
                type="time"
                value={startTime}
                onChange={(event) => {
                  const nextStart = event.target.value;
                  setStartTime(nextStart);
                  setEndTime(oneHourAfter(nextStart));
                }}
                style={input}
              />

              <input
                type="time"
                value={endTime}
                onChange={(event) =>
                  setEndTime(event.target.value)
                }
                style={input}
              />

              <button
                type="button"
                onClick={addSlot}
                style={btn(true)}
              >
                Add Slot
              </button>
            </div>
          </div>

          <div style={card}>
            <div style={sectionTitle}>
              Recurring defaults
            </div>

            <div style={sectionSub}>
              These slots are used to generate the weekly
              allocation draft.
            </div>

            <div
              style={{
                display: "grid",
                gap: 8,
                marginTop: 14,
              }}
            >
              {slotRows.length === 0 ? (
                <div
                  style={{
                    padding: "26px 14px",
                    borderRadius: 12,
                    border: `1px dashed ${LINE}`,
                    background: SOFT,
                    textAlign: "center",
                    fontSize: 10,
                    color: MUTED,
                  }}
                >
                  No recurring training slots have been
                  added yet.
                </div>
              ) : (
                slotRows.map((slot) => (
                  <div
                    key={slot.id}
                    style={{
                      border: `1px solid ${LINE}`,
                      borderRadius: 11,
                      padding: 12,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: INK,
                        }}
                      >
                        {teamName(slot.team)}
                      </div>

                      <div
                        style={{
                          fontSize: 10,
                          color: MUTED,
                          marginTop: 3,
                        }}
                      >
                        {weekdays[slot.weekday - 1]} -{" "}
                        {String(
                          slot.start_time
                        ).slice(0, 5)}
                        -
                        {String(
                          slot.end_time
                        ).slice(0, 5)}
                      </div>
                    </div>

                    <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                      <span
                        style={{
                          padding: "5px 8px",
                          borderRadius: 999,
                          background: SOFT,
                          color: INK,
                          fontSize: 9,
                          fontWeight: 800,
                        }}
                      >
                        {slot.facility?.name || "No facility"}
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => removeRecurringSlot(slot)}
                        style={{...btn(false), height:30, color:RED, borderColor:"#fecaca"}}
                      >
                        Remove recurring slot
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* ====================================================
          FACILITIES
      ==================================================== */}
      {tab === "facilities" && (
        <div style={card}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={sectionTitle}>
                Club facilities
              </div>

              <div style={sectionSub}>
                Manage pitches and locations that can be
                used for training allocations.
              </div>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={seedFacilities}
              style={btn(false)}
            >
              Add Fingallians Defaults
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              margin: "16px 0",
            }}
          >
            <input
              value={facilityName}
              onChange={(event) =>
                setFacilityName(event.target.value)
              }
              placeholder="Facility or pitch name"
              style={{
                ...input,
                flex: 1,
              }}
            />

            <button
              type="button"
              onClick={addFacility}
              style={btn(true)}
            >
              Add Facility
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gap: 8,
            }}
          >
            {facilities.length === 0 ? (
              <div
                style={{
                  padding: "28px 14px",
                  borderRadius: 12,
                  border: `1px dashed ${LINE}`,
                  background: SOFT,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: INK,
                  }}
                >
                  No facilities added
                </div>

                <div
                  style={{
                    fontSize: 10,
                    color: MUTED,
                    marginTop: 4,
                  }}
                >
                  Add them manually or load the default
                  Fingallians facilities.
                </div>
              </div>
            ) : (
              facilities.map((facility) => (
                <div
                  key={facility.id}
                  style={{
                    border: `1px solid ${LINE}`,
                    borderRadius: 11,
                    padding: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    opacity: facility.active ? 1 : 0.55,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: INK,
                      }}
                    >
                      {facility.name}
                    </div>

                    <div
                      style={{
                        fontSize: 10,
                        color: MUTED,
                        marginTop: 3,
                      }}
                    >
                      {facility.notes ||
                        (facility.active
                          ? "Available for allocations"
                          : "Currently disabled")}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        padding: "5px 8px",
                        borderRadius: 999,
                        background: facility.active
                          ? "#dcfce7"
                          : "#f1f5f9",
                        color: facility.active
                          ? "#15803d"
                          : MUTED,
                        fontSize: 9,
                        fontWeight: 800,
                      }}
                    >
                      {facility.active
                        ? "Active"
                        : "Disabled"}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        toggleFacility(facility)
                      }
                      style={btn(false)}
                    >
                      {facility.active
                        ? "Disable"
                        : "Enable"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}



