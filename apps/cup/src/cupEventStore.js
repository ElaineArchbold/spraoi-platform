import { supabase } from "./supabaseClient";

export const CUP_EVENTS_KEY = "cup:events";
export const cupEventKey = (eventId, section) => `cup:event:${eventId}:${section}`;

export async function cupRead(key, fallback) {
  try {
    const { data, error } = await supabase.from("kv_store").select("value").eq("key", key).maybeSingle();
    if (error || !data) return fallback;
    return data.value ?? fallback;
  } catch { return fallback; }
}
export async function cupWrite(key, value) {
  const { error } = await supabase.from("kv_store").upsert({ key, value }, { onConflict: "key" });
  if (error) throw error;
  return value;
}
export const cupReadSection = (id, section, fallback) => cupRead(cupEventKey(id, section), fallback);
export const cupWriteSection = (id, section, value) => cupWrite(cupEventKey(id, section), value);
export const cupActiveEvent = () => { try { return localStorage.getItem("spraoi_cup_active_event") || ""; } catch { return ""; } };
export const cupSetActiveEvent = (id) => { try { localStorage.setItem("spraoi_cup_active_event", id); } catch {} };
export function cupSlug(v="event") { return v.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || "event"; }
export async function cupCreateEvent(details) {
  const events = await cupRead(CUP_EVENTS_KEY, []);
  let id = `${cupSlug(details.name)}-${String(details.date || Date.now()).replaceAll("-","")}`, n=2;
  while (events.some(e=>e.id===id)) id=`${cupSlug(details.name)}-${n++}`;
  const event={ id, name:details.name||"New Cup Event", date:details.date||"", venue:details.venue||"", status:"draft", createdAt:new Date().toISOString() };
  await cupWrite(CUP_EVENTS_KEY,[...events,event]); return event;
}
export async function cupUpdateEvent(id, patch) {
  const events=await cupRead(CUP_EVENTS_KEY,[]); const next=events.map(e=>e.id===id?{...e,...patch,updatedAt:new Date().toISOString()}:e); await cupWrite(CUP_EVENTS_KEY,next); return next.find(e=>e.id===id);
}
export async function cupDuplicateEvent(source, details) {
  const event=await cupCreateEvent(details);
  for (const section of ["clubs","teams","config","eventInfo","sponsors","foodMenu"]) {
    let value=await cupReadSection(source.id,section,null); if(value==null) continue;
    if(section==="teams"&&Array.isArray(value)) value=value.map(t=>({...t,playerCount:0,mentorCount:0,foodCode:String(Math.floor(1000+Math.random()*9000))}));
    await cupWriteSection(event.id,section,value);
  }
  for (const section of ["matches","refereeAccess","orders","announcements"]) await cupWriteSection(event.id,section,[]);
  return event;
}
export function cupRefAccess(eventId,pitches=[],label="Referee") { return {id:(crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`),eventId,pitches,label,code:String(Math.floor(100000+Math.random()*900000)),active:true,version:1,createdAt:new Date().toISOString()}; }
export function cupRefLink(eventId,refId) { return `${location.origin}/?event=${encodeURIComponent(eventId)}&ref=${encodeURIComponent(refId)}`; }
export function cupRefRemember(eventId,access,name) { localStorage.setItem(`cup_ref_${eventId}_${access.id}_${access.version||1}`,JSON.stringify({name})); }
export function cupRefRemembered(eventId,access) { try { return JSON.parse(localStorage.getItem(`cup_ref_${eventId}_${access.id}_${access.version||1}`)||"null"); } catch { return null; } }
export function cupResolveFinals(matches, teams, config = {}) {
  const gradeOf=(team)=>String(team?.grade||team?.name?.match(/\b([A-D])$/)?.[1]||"").toUpperCase();
  const groupMatches=matches.filter(m=>m.stageId==="group"&&m.teamA&&m.teamB);
  const byGradeGroup={};

  function standingFor(grade,groupId){
    const key=`${grade}:${groupId}`;
    if(byGradeGroup[key])return byGradeGroup[key];
    const gradeTeams=teams.filter(t=>gradeOf(t)===grade);
    const table=Object.fromEntries(gradeTeams.map(t=>[t.id,{id:t.id,name:t.name,played:0,points:0,won:0,scoreFor:0,scoreAgainst:0}]));
    groupMatches.filter(m=>String(m.grade||"").toUpperCase()===grade&&String(m.groupId)===String(groupId)&&m.status==="finished").forEach(m=>{
      const a=table[m.teamA],b=table[m.teamB]; if(!a||!b)return;
      const sa=(+m.goalsA||0)*3+(+m.pointsA||0), sb=(+m.goalsB||0)*3+(+m.pointsB||0);
      a.played++;b.played++;a.scoreFor+=sa;a.scoreAgainst+=sb;b.scoreFor+=sb;b.scoreAgainst+=sa;
      if(sa>sb){a.points+=3;a.won++}else if(sb>sa){b.points+=3;b.won++}else{a.points++;b.points++}
    });
    const rows=Object.values(table).filter(r=>groupMatches.some(m=>String(m.grade||"").toUpperCase()===grade&&String(m.groupId)===String(groupId)&&(m.teamA===r.id||m.teamB===r.id)));
    rows.sort((a,b)=>b.points-a.points||b.won-a.won||((b.scoreFor-b.scoreAgainst)-(a.scoreFor-a.scoreAgainst))||a.name.localeCompare(b.name));
    byGradeGroup[key]=rows; return rows;
  }

  return matches.map(m=>{
    if(!m.finalLabel||m.manualOverride)return m;
    if(m.qualifierMode==="two-groups"){
      const a=standingFor(m.grade,1)[m.qualifierRank-1]?.id||"";
      const b=standingFor(m.grade,2)[m.qualifierRank-1]?.id||"";
      return {...m,teamA:a,teamB:b};
    }
    if(m.qualifierMode==="single-group"){
      const rows=standingFor(m.grade,1);
      const base=(m.qualifierRank-1)*2;
      return {...m,teamA:rows[base]?.id||"",teamB:rows[base+1]?.id||""};
    }
    return m;
  });
}

export function cupGenerateSchedule(teams, config = {}) {
  const pitches=config.pitches?.length?config.pitches:[{id:"p1",name:"Pitch 1"}];
  const groupCount=Math.max(1,Number(config.groupCount)||1);
  const matchMins=Math.max(1,Number(config.matchDurationMins)||20);
  const turnaround=Math.max(0,Number(config.turnaroundMins)||5);
  const slotMins=matchMins+turnaround;
  const lunchMinutes=Math.max(30,Number(config.lunchMinutes)||30);
  const lunchCapacity=Math.max(1,Number(config.lunchCapacity)||90);
  const [sh,sm]=String(config.startTime||"10:00").split(":").map(Number);
  const startMinutes=(Number(sh)||10)*60+(Number(sm)||0);
  const timeLabel=(mins)=>`${String(Math.floor(mins/60)%24).padStart(2,"0")}:${String(mins%60).padStart(2,"0")}`;
  const gradeOf=(team)=>String(team.grade||team.name?.match(/\b([A-D])$/)?.[1]||"").toUpperCase();
  const grades=[...new Set(teams.map(gradeOf).filter(Boolean))].sort();
  const clubIds=[...new Set(teams.map(t=>t.clubId).filter(Boolean))];

  // Catering groups are separate from competition groups.
  // Keep a club together wherever possible and build as many
  // lunch slots as are required by the host club's capacity.
  const lunchClubTotals=clubIds.map(clubId=>{
    const clubTeams=teams.filter(t=>t.clubId===clubId);
    const players=clubTeams.reduce((n,t)=>n+Number(t.playerCount||0),0);
    const mentors=clubTeams.reduce((n,t)=>n+Number(t.mentorCount||0),0);
    return {clubId,players,mentors,people:players+mentors};
  }).sort((a,b)=>b.people-a.people);

  const lunchGroups=[];

  lunchClubTotals.forEach(club=>{
    let target=null;

    if(club.people<=lunchCapacity){
      target=lunchGroups.find(group=>
        !group.overCapacity &&
        group.people+club.people<=lunchCapacity
      )||null;
    }

    if(!target){
      target={
        clubIds:[],
        people:0,
        overCapacity:false
      };
      lunchGroups.push(target);
    }

    target.clubIds.push(club.clubId);
    target.people+=club.people;
    target.overCapacity=target.people>lunchCapacity;
  });

  // Clubs are distributed once; all of a club's A/B/C/D sides remain in the same numbered group.
  const groupN=Math.min(groupCount,Math.max(1,clubIds.length));
  const clubGroups=Array.from({length:groupN},()=>[]);
  clubIds.forEach((cid,i)=>clubGroups[i%groupN].push(cid));

  function circleRounds(list){
    const arr=[...list];if(arr.length<2)return[];if(arr.length%2)arr.push(null);
    let rot=[...arr];const rounds=[];
    for(let r=0;r<rot.length-1;r++){const pairs=[];for(let i=0;i<rot.length/2;i++){const a=rot[i],b=rot[rot.length-1-i];if(a&&b)pairs.push([a,b])}rounds.push(pairs);rot=[rot[0],rot[rot.length-1],...rot.slice(1,-1)]}
    return rounds;
  }

  const firstRound=[],remaining=[];
  clubGroups.forEach((clubGroup,gi)=>{
    grades.forEach(grade=>{
      const list=teams.filter(t=>clubGroup.includes(t.clubId)&&gradeOf(t)===grade);
      circleRounds(list).forEach((pairs,ri)=>pairs.forEach(([a,b])=>{
        const m={id:`group-${gi+1}-${grade}-${ri}-${a.id}-${b.id}`,teamA:a.id,teamB:b.id,stageId:"group",stageLabel:`${grade} · Group ${gi+1}`,groupId:String(gi+1),grade,status:"scheduled",goalsA:0,pointsA:0,goalsB:0,pointsB:0};
        (ri===0?firstRound:remaining).push(m);
      }));
    });
  });

  const fixtures=[],lastPlayedSlot={};let slotIndex=0,extraOffset=0;
  function canPlay(m,used,excluded,slot){if(excluded?.has(m.teamA)||excluded?.has(m.teamB)||used.has(m.teamA)||used.has(m.teamB))return false;const ar=lastPlayedSlot[m.teamA]===undefined||lastPlayedSlot[m.teamA]<slot-1;const br=lastPlayedSlot[m.teamB]===undefined||lastPlayedSlot[m.teamB]<slot-1;return ar&&br}
  function fill(pool,minSlots=0,excluded=null,stopAfterMin=false){
    let slots=0,guard=0;
    while(guard++<400&&(pool.length||slots<minSlots)){
      const used=new Set(),picked=[];
      for(let i=0;i<pool.length&&picked.length<pitches.length;i++){const m=pool[i];if(canPlay(m,used,excluded,slotIndex)){picked.push(m);used.add(m.teamA);used.add(m.teamB);pool.splice(i,1);i--}}
      picked.forEach((m,pi)=>{lastPlayedSlot[m.teamA]=slotIndex;lastPlayedSlot[m.teamB]=slotIndex;fixtures.push({...m,time:timeLabel(startMinutes+slotIndex*slotMins+extraOffset),pitchId:pitches[pi].id,pitch:pitches[pi].name})});
      slotIndex++;slots++;if(stopAfterMin&&slots>=minSlots)break;if(!pool.length&&slots>=minSlots)break;
    }
  }

  fill([...firstRound]);
  const lunchWindows=[];const fullSlots=Math.max(1,Math.floor(lunchMinutes/slotMins));const remainder=Math.max(0,lunchMinutes-fullSlots*slotMins);

  lunchGroups.forEach((lunchGroup,index)=>{
    const excluded=new Set(
      teams
        .filter(t=>lunchGroup.clubIds.includes(t.clubId))
        .map(t=>t.id)
    );

    const from=startMinutes+slotIndex*slotMins+extraOffset;

    // Continue scheduling other clubs while this catering group eats.
    fill(remaining,fullSlots,excluded,true);
    extraOffset+=remainder;

    const to=startMinutes+slotIndex*slotMins+extraOffset;

    lunchWindows.push({
      id:`lunch-${index+1}`,
      from:timeLabel(from),
      to:timeLabel(to),
      clubIds:[...lunchGroup.clubIds],
      clubs:[...lunchGroup.clubIds],
      people:lunchGroup.people,
      capacity:lunchCapacity,
      overCapacity:lunchGroup.people>lunchCapacity
    });
  });
  fill(remaining);

  const placements=(config.placements||[
    {id:"cup",label:"Cup",enabled:true,rank:1},
    {id:"shield",label:"Shield",enabled:true,rank:2},
    {id:"plate",label:"Plate",enabled:false,rank:3},
    {id:"bowl",label:"Bowl",enabled:false,rank:4}
  ]).filter(p=>p.enabled!==false);

  // Generate each placement independently for every grade.
  grades.forEach(grade=>{
    placements.forEach(pl=>{
      if(groupN===1){
        const gradeCount=teams.filter(t=>gradeOf(t)===grade).length;
        const firstIndex=(pl.rank-1)*2;
        if(firstIndex+1>=gradeCount)return;
        fixtures.push({id:`${grade}-${pl.id}-${Date.now()}-${fixtures.length}`,time:"",pitch:"",pitchId:"",teamA:"",teamB:"",teamASource:`${firstIndex+1}${firstIndex===0?"st":firstIndex===1?"nd":firstIndex===2?"rd":"th"} ${grade}`,teamBSource:`${firstIndex+2}${firstIndex+1===1?"nd":firstIndex+1===2?"rd":"th"} ${grade}`,stageId:pl.id,stageLabel:`${grade} ${pl.label}`,finalLabel:`${grade} ${pl.label} Final`,grade,qualifierMode:"single-group",qualifierRank:pl.rank,status:"scheduled",goalsA:0,pointsA:0,goalsB:0,pointsB:0});
      }else if(groupN===2){
        const enough1=teams.filter(t=>clubGroups[0].includes(t.clubId)&&gradeOf(t)===grade).length>=pl.rank;
        const enough2=teams.filter(t=>clubGroups[1].includes(t.clubId)&&gradeOf(t)===grade).length>=pl.rank;
        if(!enough1||!enough2)return;
        fixtures.push({id:`${grade}-${pl.id}-${Date.now()}-${fixtures.length}`,time:"",pitch:"",pitchId:"",teamA:"",teamB:"",teamASource:`${pl.rank===1?"1st":pl.rank===2?"2nd":pl.rank===3?"3rd":`${pl.rank}th`} ${grade} Group 1`,teamBSource:`${pl.rank===1?"1st":pl.rank===2?"2nd":pl.rank===3?"3rd":`${pl.rank}th`} ${grade} Group 2`,stageId:pl.id,stageLabel:`${grade} ${pl.label}`,finalLabel:`${grade} ${pl.label} Final`,grade,qualifierMode:"two-groups",qualifierRank:pl.rank,status:"scheduled",goalsA:0,pointsA:0,goalsB:0,pointsB:0});
      }else{
        // More than two groups: create seeded qualifier placeholders rather than guess a bye structure.
        const qualifiers=clubGroups.map((_,i)=>`${pl.rank===1?"1st":pl.rank===2?"2nd":pl.rank===3?"3rd":`${pl.rank}th`} ${grade} Group ${i+1}`);
        const q=[...qualifiers];
        while(q.length>=2){
          const a=q.shift(),b=q.pop();
          fixtures.push({id:`${grade}-${pl.id}-qual-${Date.now()}-${fixtures.length}`,time:"",pitch:"",pitchId:"",teamA:"",teamB:"",teamASource:a,teamBSource:b,stageId:pl.id,stageLabel:`${grade} ${pl.label} Qualifier`,finalLabel:`${grade} ${pl.label} Qualifier`,grade,status:"scheduled",goalsA:0,pointsA:0,goalsB:0,pointsB:0});
        }
      }
    });
  });

  // Schedule finals after group play; preserve grade order and use all configured pitches.
  const groupOnly=fixtures.filter(f=>f.stageId==="group");
  const finals=fixtures.filter(f=>f.stageId!=="group");
  fixtures.length=0;fixtures.push(...groupOnly);
  while(finals.length){
    const batch=finals.splice(0,pitches.length);
    batch.forEach((m,pi)=>fixtures.push({...m,time:timeLabel(startMinutes+slotIndex*slotMins+extraOffset),pitchId:pitches[pi].id,pitch:pitches[pi].name}));
    slotIndex++;
  }
  return {fixtures:fixtures.map((m,i)=>({...m,sortOrder:i})),lunchWindows,estimatedFinish:timeLabel(startMinutes+slotIndex*slotMins+extraOffset)};
}

