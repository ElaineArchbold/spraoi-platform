import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

const C={primary:"#0EA5E9",text:"#10243e",muted:"#64748b",line:"#e2e8f0",soft:"#f8fafc"};
const fmt=(v)=>new Date(v).toLocaleString("en-IE",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});

export function useParentNotifications(userId){
  const [notifications,setNotifications]=useState([]);
  const [important,setImportant]=useState(null);
  async function load(){
    if(!userId)return;
    const {data}=await supabase.from("notifications").select("*").eq("user_id",userId).order("created_at",{ascending:false}).limit(50);
    const rows=data||[]; setNotifications(rows);
    setImportant(rows.find(n=>n.priority==="important"&&!n.modal_shown_at&&!n.read_at)||null);
  }
  useEffect(()=>{
    load();
    if(!userId) return;
    const channel=supabase.channel(`spraoi-notifications-${userId}`).on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications",filter:`user_id=eq.${userId}`},()=>load()).subscribe();
    return ()=>{supabase.removeChannel(channel);};
  },[userId]);
  async function markRead(n){await supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("id",n.id);await load();}
  async function markModalShown(n){await supabase.from("notifications").update({modal_shown_at:new Date().toISOString()}).eq("id",n.id);setImportant(null);}
  return {notifications,important,unread:notifications.filter(n=>!n.read_at).length,load,markRead,markModalShown};
}

export function ImportantNotificationModal({notification,onClose,onView}){
  if(!notification)return null;
  return <div style={{position:"fixed",inset:0,zIndex:3000,background:"rgba(11,37,69,.58)",display:"grid",placeItems:"center",padding:18}} onClick={onClose}><div onClick={e=>e.stopPropagation()} style={{width:"min(390px,100%)",background:"#fff",borderRadius:20,padding:20,boxShadow:"0 24px 70px rgba(0,0,0,.24)"}}><div style={{fontSize:10,fontWeight:900,color:C.primary,textTransform:"uppercase"}}>New Spraoi update</div><h2 style={{fontFamily:"'League Spartan',sans-serif",fontSize:21,margin:"8px 0",color:C.text}}>{notification.title}</h2><p style={{fontSize:12,lineHeight:1.55,color:C.muted}}>{notification.message}</p><div style={{display:"flex",gap:8,marginTop:16}}><button onClick={onClose} style={{flex:1,padding:11,borderRadius:10,border:`1px solid ${C.line}`,background:"#fff",fontWeight:800}}>Got it</button><button onClick={onView} style={{flex:1,padding:11,borderRadius:10,border:0,background:C.primary,color:"#fff",fontWeight:800}}>View updates</button></div></div></div>;
}

export default function ParentUpdates({userId,players=[],selectedPlayer}){
  const {notifications,markRead}=useParentNotifications(userId);
  const [events,setEvents]=useState([]); const [responses,setResponses]=useState([]); const [message,setMessage]=useState("");
  const teamIds=useMemo(()=>[...new Set(players.map(p=>p.age_group_id).filter(Boolean))],[players]);
  async function loadEvents(){
    if(!teamIds.length){
      setEvents([]);
      return;
    }

    const childIds=(players||[])
      .map(p=>p.id)
      .filter(Boolean);

    const {data:eventRows,error:eventError}=await supabase
      .from("club_events")
      .select("*,facility:facilities(name)")
      .in("age_group_id",teamIds)
      .gte("starts_at",new Date(Date.now()-86400000).toISOString())
      .order("starts_at")
      .limit(40);

    if(eventError){
      setMessage(eventError.message);
      setEvents([]);
      return;
    }

    const candidates=eventRows||[];
    const eventIds=candidates.map(e=>e.id).filter(Boolean);

    let recipientRows=[];

    if(eventIds.length){
      const {data:recipientData,error:recipientError}=await supabase
        .from("connect_event_recipients")
        .select("event_id,player_id,parent_user_id,audience_type,subgroup_key,sport_code,panel")
        .in("event_id",eventIds);

      if(recipientError){
        setMessage(recipientError.message);
      }else{
        recipientRows=recipientData||[];
      }
    }

    const snapshotEventIds=new Set(
      recipientRows.map(row=>row.event_id)
    );

    const myRecipientByEvent=new Map();

    recipientRows.forEach(row=>{
      if(childIds.includes(row.player_id)){
        myRecipientByEvent.set(row.event_id,row);
      }
    });

    const visibleEvents=candidates
      .filter(event=>
        !snapshotEventIds.has(event.id) ||
        myRecipientByEvent.has(event.id)
      )
      .map(event=>{
        const recipient=myRecipientByEvent.get(event.id);

        const legacyChild=(players||[]).find(
          p=>p.age_group_id===event.age_group_id
        );

        return {
          ...event,
          _has_recipient_snapshot:snapshotEventIds.has(event.id),
          _recipient_player_id:
            recipient?.player_id ||
            legacyChild?.id ||
            null,
          _audience_type:recipient?.audience_type||null,
          _subgroup_key:recipient?.subgroup_key||null,
          _sport_code:recipient?.sport_code||null,
          _panel:recipient?.panel||null
        };
      });

    setEvents(visibleEvents);

    if(userId){
      const {data:r}=await supabase
        .from("availability_responses")
        .select("*")
        .eq("parent_user_id",userId);

      setResponses(r||[]);
    }
  }
  useEffect(()=>{loadEvents();},[userId,teamIds.join(",")]);
  async function respond(event,response){
    const child=
      (players||[]).find(p=>p.id===event._recipient_player_id) ||
      (players||[]).find(p=>p.age_group_id===event.age_group_id) ||
      selectedPlayer;
    if(!child){setMessage("No linked child was found for this team.");return;}
    const {error}=await supabase.from("availability_responses").upsert({event_id:event.id,player_id:child.id,parent_user_id:userId,response,responded_at:new Date().toISOString()},{onConflict:"event_id,player_id,parent_user_id"});
    setMessage(error?error.message:"Availability saved."); if(!error)loadEvents();
  }
  return <div><div style={{fontFamily:"'League Spartan',sans-serif",fontWeight:900,fontSize:18,color:C.text,marginBottom:12}}>Team updates</div>{message&&<div style={{padding:10,borderRadius:10,background:"#e0f2fe",fontSize:11,marginBottom:10}}>{message}</div>}
    <div style={{background:"#fff",border:`1px solid ${C.line}`,borderRadius:16,padding:14,marginBottom:14}}><div style={{fontWeight:900,fontSize:13,marginBottom:8}}>Upcoming training & matches</div>{events.length===0?<div style={{fontSize:11,color:C.muted}}>No upcoming team events.</div>:events.map(e=>{const r=responses.find(x=>x.event_id===e.id&&(!e._recipient_player_id||x.player_id===e._recipient_player_id));return <div key={e.id} style={{padding:"12px 0",borderBottom:`1px solid ${C.line}`}}><div style={{display:"flex",justifyContent:"space-between",gap:10}}><div><div style={{fontWeight:900,fontSize:13}}>{e.event_type==="match"?(e.opponent?`Match vs ${e.opponent}`:"Match"):"Training"}</div><div style={{fontSize:10,color:C.muted,marginTop:3}}>{fmt(e.starts_at)} · {e.facility?.name||e.location||"Location TBC"}</div></div>{e.status==="cancelled"&&<b style={{fontSize:10,color:"#dc2626"}}>CANCELLED</b>}</div>{e.status!=="cancelled"&&<div style={{display:"flex",gap:6,marginTop:9}}>{[["yes","Yes"],["no","No"],["maybe","Maybe"]].map(([v,l])=><button key={v} onClick={()=>respond(e,v)} style={{padding:"7px 10px",borderRadius:8,border:`1px solid ${r?.response===v?C.primary:C.line}`,background:r?.response===v?"#e0f2fe":"#fff",color:C.text,fontSize:10,fontWeight:800}}>{l}</button>)}</div>}</div>})}</div>
    <div style={{background:"#fff",border:`1px solid ${C.line}`,borderRadius:16,padding:14}}><div style={{fontWeight:900,fontSize:13,marginBottom:8}}>Notifications</div>{notifications.length===0?<div style={{fontSize:11,color:C.muted}}>You’re all caught up.</div>:notifications.map(n=><button key={n.id} onClick={()=>markRead(n)} style={{width:"100%",textAlign:"left",padding:"11px 0",border:0,borderBottom:`1px solid ${C.line}`,background:"transparent",cursor:"pointer"}}><div style={{display:"flex",gap:8,alignItems:"center"}}>{!n.read_at&&<span style={{width:7,height:7,borderRadius:"50%",background:C.primary}}/>}<b style={{fontSize:11}}>{n.title}</b></div><div style={{fontSize:10,color:C.muted,marginTop:3}}>{n.message}</div></button>)}</div>
  </div>;
}
