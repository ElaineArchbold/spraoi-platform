import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

const C = {
  primary:"#0EA5E9",
  text:"#10243e",
  muted:"#64748b",
  line:"#e2e8f0",
  soft:"#f8fafc"
};

function RichMessageText({text}) {
  const parts=String(text||"").split(
    /(https?:\/\/[^\s]+)/g
  );

  return (
    <>
      {parts.map((part,index)=>
        /^https?:\/\//i.test(part)
          ? <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color:C.primary,
                fontWeight:800,
                textDecoration:"underline",
                overflowWrap:"anywhere"
              }}
            >
              {part}
            </a>
          : <span key={index}>{part}</span>
      )}
    </>
  );
}

const fmt = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IE", {
    weekday:"short",
    day:"numeric",
    month:"short",
    hour:"2-digit",
    minute:"2-digit"
  });
};

export function useParentNotifications(userId) {
  const [notifications,setNotifications] = useState([]);
  const [important,setImportant] = useState(null);

  async function load() {
    if (!userId) {
      setNotifications([]);
      setImportant(null);
      return;
    }

    const {data,error} = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id",userId)
      .order("created_at",{ascending:false})
      .limit(100);

    if (error) {
      console.error("Notification load error:",error.message);
      return;
    }

    let rows = data || [];

    const notificationIds=rows
      .map(n=>n.id)
      .filter(Boolean);

    if(notificationIds.length){
      const {data:recipientRows}=await supabase
        .from("connect_message_recipients")
        .select("notification_id,message_id,player_id")
        .in("notification_id",notificationIds);

      const messageIdByNotification=new Map(
        (recipientRows||[]).map(
          r=>[r.notification_id,r.message_id]
        )
      );

      const playerIdByNotification=new Map(
        (recipientRows||[]).map(
          r=>[r.notification_id,r.player_id]
        )
      );

      const messageIds=[
        ...new Set(
          (recipientRows||[])
            .map(r=>r.message_id)
            .filter(Boolean)
        )
      ];

      let activeMessageIds=new Set(messageIds);

      if(messageIds.length){
        const {data:messageRows,error:messageLoadError}=await supabase
          .from("connect_messages")
          .select("id,archived_at,event_id")
          .in("id",messageIds);

        if(!messageLoadError){
          const linkedEventIds=[
            ...new Set(
              (messageRows||[])
                .map(message=>message.event_id)
                .filter(Boolean)
            )
          ];

          let cancelledEventIds=new Set();

          if(linkedEventIds.length){
            const {data:eventRows,error:eventStatusError}=await supabase
              .from("club_events")
              .select("id,status")
              .in("id",linkedEventIds);

            if(!eventStatusError){
              cancelledEventIds=new Set(
                (eventRows||[])
                  .filter(event=>event.status==="cancelled")
                  .map(event=>event.id)
              );
            }
          }

          activeMessageIds=new Set(
            (messageRows||[])
              .filter(
                message=>
                  !message.archived_at &&
                  (
                    !message.event_id ||
                    !cancelledEventIds.has(message.event_id)
                  )
              )
              .map(message=>message.id)
          );
        }
      }

      const ageGroupIds=[
        ...new Set(
          rows
            .map(n=>n.age_group_id)
            .filter(Boolean)
        )
      ];

      let teamLabelById=new Map();

      if(ageGroupIds.length){
        const {data:teamRows}=await supabase
          .from("age_groups")
          .select("id,label,gender")
          .in("id",ageGroupIds);

        teamLabelById=new Map(
          (teamRows||[]).map(team=>{
            const base=String(team.label||"Team").trim();
            const gender=String(team.gender||"").toLowerCase();

            const suffix=
              gender==="boys"
                ? "Boys"
                : gender==="girls"
                  ? "Girls"
                  : "";

            const alreadyHasSuffix =
              suffix &&
              base.toLowerCase().endsWith(
                suffix.toLowerCase()
              );

            const label =
              suffix && !alreadyHasSuffix
                ? base + " " + suffix
                : base;

            return [team.id,label];
          })
        );
      }

      let attachmentsByMessage=new Map();

      if(messageIds.length){
        const {data:attachmentRows}=await supabase
          .from("connect_message_attachments")
          .select("*")
          .in("message_id",messageIds)
          .order("sort_order");

        const enriched=[];

        for(const attachment of attachmentRows||[]){
          const {data:signed}=await supabase.storage
            .from("connect-message-attachments")
            .createSignedUrl(
              attachment.storage_path,
              3600
            );

          enriched.push({
            ...attachment,
            signed_url:signed?.signedUrl||null
          });
        }

        attachmentsByMessage=new Map();

        enriched.forEach(a=>{
          if(!attachmentsByMessage.has(a.message_id)){
            attachmentsByMessage.set(a.message_id,[]);
          }

          attachmentsByMessage
            .get(a.message_id)
            .push(a);
        });
      }

      rows=rows
        .filter(n=>{
          const messageId=
            messageIdByNotification.get(n.id)||null;

          const isConnectNotification =
            String(n.type || "").startsWith("connect_");

          return isConnectNotification
            ? Boolean(messageId) && activeMessageIds.has(messageId)
            : true;
        })
        .map(n=>{
          const messageId=
            messageIdByNotification.get(n.id)||null;

          return {
            ...n,
            _message_id:messageId,
            _player_id:
              playerIdByNotification.get(n.id)||null,
            _team_label:
              teamLabelById.get(n.age_group_id)||null,
            _attachments:
              attachmentsByMessage.get(messageId)||[]
          };
        });
    }

    setNotifications(rows);

    setImportant(
      rows.find(
        n =>
          n.priority === "important" &&
          !n.modal_shown_at &&
          !n.read_at
      ) || null
    );
  }

  useEffect(() => {
    load();

    if (!userId) return;

    const channelName =
      `spraoi-notifications-${userId}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event:"INSERT",
          schema:"public",
          table:"notifications",
          filter:`user_id=eq.${userId}`
        },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },[userId]);

  async function markRead(notification) {
    if (!notification?.id) return null;

    const readAt =
      notification.read_at ||
      new Date().toISOString();

    if (!notification.read_at) {
      const {error} = await supabase
        .from("notifications")
        .update({read_at:readAt})
        .eq("id",notification.id);

      if (error) {
        console.error("Mark read error:",error.message);
        return null;
      }
    }

    await load();
    return readAt;
  }

  async function markModalShown(notification) {
    if (!notification?.id) return;

    await supabase
      .from("notifications")
      .update({
        modal_shown_at:new Date().toISOString()
      })
      .eq("id",notification.id);

    setImportant(null);
  }

  return {
    notifications,
    important,
    unread:notifications.filter(n=>!n.read_at).length,
    load,
    markRead,
    markModalShown
  };
}

export function ImportantNotificationModal({
  notification,
  onClose,
  onView
}) {
  if (!notification) return null;

  return (
    <div
      style={{
        position:"fixed",
        inset:0,
        zIndex:3000,
        background:"rgba(11,37,69,.58)",
        display:"grid",
        placeItems:"center",
        padding:18
      }}
      onClick={onClose}
    >
      <div
        onClick={e=>e.stopPropagation()}
        style={{
          width:"min(390px,100%)",
          background:"#fff",
          borderRadius:20,
          padding:20,
          boxShadow:"0 24px 70px rgba(0,0,0,.24)"
        }}
      >
        <div
          style={{
            fontSize:13,
            fontWeight:900,
            color:C.primary,
            textTransform:"uppercase"
          }}
        >
          New Spraoi update
        </div>

        <h2
          style={{
            fontFamily:"'League Spartan',sans-serif",
            fontSize:24,
            margin:"8px 0",
            color:C.text
          }}
        >
          {notification.title}
        </h2>

        <p
          style={{
            fontSize:15,
            lineHeight:1.55,
            color:C.muted,
            whiteSpace:"pre-line"
          }}
        >
          <RichMessageText text={notification.message}/>
        </p>

        <div style={{display:"flex",gap:8,marginTop:16}}>
          <button
            onClick={onClose}
            style={{
              flex:1,
              padding:11,
              borderRadius:10,
              border:`1px solid ${C.line}`,
              background:"#fff",
              fontWeight:800
            }}
          >
            Later
          </button>

          <button
            onClick={onView}
            style={{
              flex:1,
              padding:11,
              borderRadius:10,
              border:0,
              background:C.primary,
              color:"#fff",
              fontWeight:800
            }}
          >
            View message
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ParentUpdates({
  userId,
  players=[],
  selectedPlayer,
  view="all"
}) {
  const {
    notifications,
    markRead
  } = useParentNotifications(userId);

  const [events,setEvents] = useState([]);
  const [responses,setResponses] = useState([]);
  const [declineReasons,setDeclineReasons] = useState({});
  const [status,setStatus] = useState("");
  const [selectedMessage,setSelectedMessage] = useState(null);

  const teamIds = useMemo(
    () => [
      ...new Set(
        players.map(p=>p.age_group_id).filter(Boolean)
      )
    ],
    [players]
  );

  const childIds = useMemo(
    () => players.map(p=>p.id).filter(Boolean),
    [players]
  );

  const messageNotifications = useMemo(
    () =>
      notifications.filter(
        n => String(n.type||"").startsWith("connect_")
      ),
    [notifications]
  );

  async function loadEvents() {
    if (!teamIds.length) {
      setEvents([]);
      return;
    }

    const {data:eventRows,error:eventError} = await supabase
      .from("club_events")
      .select("*,facility:facilities(name)")
      .in("age_group_id",teamIds)
      .gte(
        "starts_at",
        new Date(Date.now()-86400000).toISOString()
      )
      .order("starts_at")
      .limit(50);

    if (eventError) {
      setStatus(eventError.message);
      setEvents([]);
      return;
    }

    const candidates = eventRows || [];
    const eventIds = candidates.map(e=>e.id).filter(Boolean);

    let recipientRows = [];

    if (eventIds.length) {
      const {data,error} = await supabase
        .from("connect_event_recipients")
        .select(
          "event_id,player_id,parent_user_id,audience_type,subgroup_key,sport_code,panel,require_decline_reason"
        )
        .in("event_id",eventIds);

      if (!error) {
        recipientRows = data || [];
      }
    }

    const snapshotEventIds = new Set(
      recipientRows.map(r=>r.event_id)
    );

    const myRecipientByEvent = new Map();

    recipientRows.forEach(row => {
      if (childIds.includes(row.player_id)) {
        myRecipientByEvent.set(row.event_id,row);
      }
    });

    const visibleEvents = candidates
      .filter(
        event =>
          !snapshotEventIds.has(event.id) ||
          myRecipientByEvent.has(event.id)
      )
      .map(event => {
        const recipient =
          myRecipientByEvent.get(event.id);

        const legacyChild = players.find(
          p => p.age_group_id === event.age_group_id
        );

        return {
          ...event,
          _has_recipient_snapshot:
            snapshotEventIds.has(event.id),
          _recipient_player_id:
            recipient?.player_id ||
            legacyChild?.id ||
            null,
          _audience_type:
            recipient?.audience_type || null,
          _subgroup_key:
            recipient?.subgroup_key || null,
          _sport_code:
            recipient?.sport_code || null,
          _panel:
            recipient?.panel || null,
          _require_decline_reason:
            Boolean(recipient?.require_decline_reason)
        };
      });

    setEvents(visibleEvents);

    if (userId) {
      const {data} = await supabase
        .from("availability_responses")
        .select("*")
        .eq("parent_user_id",userId);

      setResponses(data || []);
    }
  }

  useEffect(() => {
    loadEvents();
  },[
    userId,
    teamIds.join(","),
    childIds.join(",")
  ]);

  async function openMessage(notification) {
    if (!notification) return;

    const readAt = await markRead(notification);

    setSelectedMessage({
      ...notification,
      read_at:readAt || notification.read_at
    });
  }

  async function respond(event,response,note="") {
    if (event?.status === "cancelled") {
      setStatus(
        "This event has been cancelled. Availability can no longer be changed."
      );
      return;
    }

    if (!userId) {
      setStatus("Please sign in again before responding.");
      return;
    }

    const child =
      players.find(
        p => p.id === event._recipient_player_id
      ) ||
      players.find(
        p => p.age_group_id === event.age_group_id
      ) ||
      selectedPlayer;

    const playerId =
      event._recipient_player_id ||
      child?.id ||
      null;

    if (!playerId) {
      setStatus(
        "No linked child was found for this event."
      );
      return;
    }

    setStatus("Saving availability...");

    const {data,error} = await supabase
      .from("availability_responses")
      .upsert(
        {
          event_id:event.id,
          player_id:playerId,
          parent_user_id:userId,
          response,
          note:
            response === "declined"
              ? (String(note).trim() || null)
              : null,
          responded_at:new Date().toISOString()
        },
        {
          onConflict:
            "event_id,player_id,parent_user_id"
        }
      )
      .select("id,event_id,player_id,parent_user_id,response,note,responded_at")
      .single();

    if (error) {
      console.error(
        "Availability save error:",
        error
      );
      setStatus(
        `Could not save availability: ${error.message}`
      );
      return;
    }

    setResponses(current => {
      const remaining = (current || []).filter(
        row =>
          !(
            row.event_id === event.id &&
            row.player_id === playerId &&
            row.parent_user_id === userId
          )
      );

      return [
        ...remaining,
        data
      ];
    });

    setStatus(
      response === "accepted"
        ? "Accepted - availability saved."
        : "Declined - availability saved."
    );

    await loadEvents();
  }

  return (
    <div style={{paddingBottom:20}}>
      <div
        style={{
          fontFamily:"'League Spartan',sans-serif",
          fontWeight:900,
          fontSize:24,
          color:C.text,
          marginBottom:12
        }}
      >
        {view === "calendar" ? "Events" : "Messages"}
      </div>

      {status &&
        <div
          style={{
            padding:10,
            borderRadius:10,
            background:"#e0f2fe",
            fontSize:14,
            marginBottom:10
          }}
        >
          {status}
        </div>
      }

      {view === "calendar" && (
        <>

      <div
        style={{
          background:"#fff",
          border:`1px solid ${C.line}`,
          borderRadius:16,
          padding:14,
          marginBottom:14
        }}
      >
        <div
          style={{
            fontWeight:900,
            fontSize:16,
            marginBottom:8
          }}
        >
          Upcoming training & matches
        </div>

        {events.length === 0 ?
          <div style={{fontSize:14,color:C.muted}}>
            No upcoming team events.
          </div>
        :
          events.map(event => {
            const response = responses.find(
              r =>
                r.event_id === event.id &&
                (
                  !event._recipient_player_id ||
                  r.player_id === event._recipient_player_id
                )
            );

            const responseValue = response?.response || "";

            const statusLabel =
              event.status === "cancelled"
                ? "CANCELLED"
                : responseValue === "accepted"
                  ? "✓ ACCEPTED"
                  : responseValue === "declined"
                    ? "✕ DECLINED"
                    : "⚠ RESPONSE NEEDED";

            const statusColor =
              event.status === "cancelled" || responseValue === "declined"
                ? "#dc2626"
                : responseValue === "accepted"
                  ? "#15803d"
                  : "#b45309";

            const statusBg =
              event.status === "cancelled" || responseValue === "declined"
                ? "#fef2f2"
                : responseValue === "accepted"
                  ? "#f0fdf4"
                  : "#fffbeb";

            const eventTitle =
              event.event_type === "match"
                ? event.opponent
                  ? `Match vs ${event.opponent}`
                  : "Match"
                : "Training";

            return (
              <details
                key={event.id}
                style={{
                  borderTop:`1px solid ${C.line}`,
                  padding:"12px 0"
                }}
              >
                <summary
                  style={{
                    cursor:"pointer",
                    listStyle:"none"
                  }}
                >
                  <div style={{
                    display:"flex",
                    justifyContent:"space-between",
                    alignItems:"center",
                    gap:12
                  }}>
                    <div style={{minWidth:0}}>
                      <div style={{
                        fontWeight:900,
                        fontSize:16
                      }}>
                        {eventTitle}
                      </div>

                      <div style={{
                        fontSize:13,
                        color:C.muted,
                        marginTop:3
                      }}>
                        {fmt(event.starts_at)}
                        {" · "}
                        {event.facility?.name ||
                          event.location ||
                          "Location TBC"}
                      </div>

                      <div style={{
                        display:"inline-flex",
                        marginTop:7,
                        padding:"5px 8px",
                        borderRadius:999,
                        background:statusBg,
                        color:statusColor,
                        fontSize:12,
                        fontWeight:900
                      }}>
                        {statusLabel}
                      </div>
                    </div>

                    <div style={{
                      color:C.muted,
                      fontSize:18,
                      fontWeight:900
                    }}>
                      ›
                    </div>
                  </div>
                </summary>

                <div style={{
                  marginTop:12,
                  paddingTop:12,
                  borderTop:`1px solid ${C.line}`
                }}>
                  {event.notes &&
                    <div style={{
                      fontSize:14,
                      lineHeight:1.5,
                      marginBottom:10
                    }}>
                      {event.notes}
                    </div>
                  }

                  {event.status !== "cancelled" &&
                    <div style={{
                      display:"flex",
                      gap:8
                    }}>
                      <button
                        type="button"
                        onClick={async (e)=>{
                          e.stopPropagation();
                          await respond(event,"accepted","");
                        }}
                        style={{
                          flex:1,
                          padding:"9px 12px",
                          borderRadius:9,
                          border:`1px solid ${responseValue==="accepted" ? "#15803d" : C.line}`,
                          background:responseValue==="accepted" ? "#f0fdf4" : "#fff",
                          color:responseValue==="accepted" ? "#15803d" : C.text,
                          fontSize:14,
                          fontWeight:900,
                          cursor:"pointer",
                          pointerEvents:"auto",
                          touchAction:"manipulation",
                          position:"relative",
                          zIndex:2
                        }}
                      >
                        ✓ Accept
                      </button>

                      <button
                        type="button"
                        onClick={async (e)=>{
                          e.stopPropagation();
                          const reason =
                            String(
                              declineReasons[event.id] ??
                              response?.note ??
                              ""
                            ).trim();

                          if (
                            event._require_decline_reason &&
                            !reason
                          ) {
                            setStatus(
                              "Please enter a reason before declining."
                            );
                            return;
                          }

                          await respond(
                            event,
                            "declined",
                            reason
                          );
                        }}
                        style={{
                          flex:1,
                          padding:"9px 12px",
                          borderRadius:9,
                          border:`1px solid ${responseValue==="declined" ? "#dc2626" : C.line}`,
                          background:responseValue==="declined" ? "#fef2f2" : "#fff",
                          color:responseValue==="declined" ? "#dc2626" : C.text,
                          fontSize:14,
                          fontWeight:900,
                          cursor:"pointer",
                          pointerEvents:"auto",
                          touchAction:"manipulation",
                          position:"relative",
                          zIndex:2
                        }}
                      >
                        ✕ Decline
                      </button>
                    </div>
                  }

                  {event.status !== "cancelled" &&
                    event._require_decline_reason &&
                    <div style={{marginTop:10}}>
                      <label style={{
                        display:"block",
                        fontSize:13,
                        fontWeight:900,
                        color:C.text,
                        marginBottom:5
                      }}>
                        Reason if unavailable
                      </label>

                      <textarea
                        value={
                          declineReasons[event.id] ??
                          response?.note ??
                          ""
                        }
                        onChange={e=>
                          setDeclineReasons(current=>({
                            ...current,
                            [event.id]:e.target.value
                          }))
                        }
                        placeholder="Please let us know why they cannot attend"
                        style={{
                          width:"100%",
                          boxSizing:"border-box",
                          minHeight:70,
                          resize:"vertical",
                          padding:"9px 10px",
                          border:`1px solid ${C.line}`,
                          borderRadius:9,
                          fontFamily:"inherit",
                          fontSize:14
                        }}
                      />

                      <div style={{
                        fontSize:12,
                        color:C.muted,
                        marginTop:4
                      }}>
                        Required only if you select Decline.
                      </div>
                    </div>
                  }
                </div>
              </details>
            );
          })
        }
      </div>
        </>
      )}

      {view !== "calendar" && (
      <div
        style={{
          background:"#fff",
          border:`1px solid ${C.line}`,
          borderRadius:16,
          padding:14
        }}
      >
        <div
          style={{
            display:"flex",
            justifyContent:"space-between",
            alignItems:"center",
            marginBottom:8
          }}
        >
          <div
            style={{
              fontWeight:900,
              fontSize:16
            }}
          >
            Messages
          </div>

          {messageNotifications.filter(n=>!n.read_at).length > 0 &&
            <span
              style={{
                fontSize:12,
                fontWeight:900,
                background:C.primary,
                color:"#fff",
                padding:"4px 7px",
                borderRadius:999
              }}
            >
              {
                messageNotifications.filter(
                  n=>!n.read_at
                ).length
              } new
            </span>
          }
        </div>

        {messageNotifications.length === 0 ?
          <div style={{fontSize:14,color:C.muted}}>
            No messages yet.
          </div>
        :
          messageNotifications.map(notification =>
            <button
              key={notification.id}
              type="button"
              onClick={() =>
                openMessage(notification)
              }
              style={{
                width:"100%",
                textAlign:"left",
                padding:"13px 14px",
                border:`1px solid ${C.line}`,
                borderRadius:12,
                background:"#fff",
                cursor:"pointer",
                marginBottom:8,
                boxShadow:"0 2px 8px rgba(15,23,42,.035)"
              }}
            >
              <div
                style={{
                  fontSize:12,
                  fontWeight:900,
                  letterSpacing:".04em",
                  textTransform:"uppercase",
                  color:C.primary,
                  marginBottom:5
                }}
              >
                {notification._team_label || "Team"}
                {" · "}
                {
                  (
                    (players||[]).find(
                      p=>p.id===notification._player_id
                    )?.name ||
                    selectedPlayer?.name ||
                    "Child"
                  )
                }
              </div>

              <div
                style={{
                  display:"flex",
                  gap:8,
                  alignItems:"center"
                }}
              >
                {!notification.read_at &&
                  <span
                    style={{
                      width:7,
                      height:7,
                      borderRadius:"50%",
                      background:C.primary,
                      flexShrink:0
                    }}
                  />
                }

                <b
                  style={{
                    fontSize:14,
                    color:C.text
                  }}
                >
                  {notification.title}
                </b>

                <span
                  style={{
                    marginLeft:"auto",
                    color:C.muted,
                    fontSize:18,
                    fontWeight:900,
                    lineHeight:1
                  }}
                  aria-hidden="true"
                >
                  ›
                </span>
              </div>

              <div
                style={{
                  fontSize:13,
                  color:C.muted,
                  marginTop:4,
                  whiteSpace:"nowrap",
                  overflow:"hidden",
                  textOverflow:"ellipsis"
                }}
              >
                {notification.message}
              </div>

              <div
                style={{
                  fontSize:12,
                  color:C.muted,
                  marginTop:4
                }}
              >
                {notification.read_at
                  ? `Read ${fmt(notification.read_at)}`
                  : "Unread"
                }
              </div>
            </button>
          )
        }
      </div>

      )}

      {selectedMessage &&
        <div
          onClick={()=>setSelectedMessage(null)}
          style={{
            position:"fixed",
            inset:0,
            zIndex:3200,
            background:"rgba(11,37,69,.58)",
            display:"grid",
            placeItems:"center",
            padding:18
          }}
        >
          <div
            onClick={e=>e.stopPropagation()}
            style={{
              width:"min(420px,100%)",
              maxHeight:"82vh",
              overflow:"auto",
              background:"#fff",
              borderRadius:20,
              padding:20,
              boxShadow:
                "0 24px 70px rgba(0,0,0,.24)"
            }}
          >
            <div
              style={{
                fontSize:13,
                fontWeight:900,
                color:C.primary,
                textTransform:"uppercase"
              }}
            >
              Spraoi message
            </div>

            <h2
              style={{
                fontFamily:"'League Spartan',sans-serif",
                fontSize:24,
                margin:"8px 0",
                color:C.text
              }}
            >
              {selectedMessage.title}
            </h2>

            <div
              style={{
                fontSize:13,
                color:C.muted,
                marginBottom:14
              }}
            >
              {fmt(selectedMessage.created_at)}
            </div>

            <div
              style={{
                fontSize:15,
                lineHeight:1.65,
                color:C.text,
                whiteSpace:"pre-line"
              }}
            >
              <RichMessageText text={selectedMessage.message}/>
            </div>

            {(selectedMessage._attachments||[]).map(attachment=>
              attachment.signed_url&&
                <img
                  key={attachment.id}
                  src={attachment.signed_url}
                  alt={attachment.file_name||"Message attachment"}
                  style={{
                    width:"100%",
                    maxHeight:360,
                    objectFit:"contain",
                    borderRadius:14,
                    marginTop:14,
                    border:`1px solid ${C.line}`
                  }}
                />
            )}

            <button
              type="button"
              onClick={()=>setSelectedMessage(null)}
              style={{
                width:"100%",
                marginTop:18,
                padding:11,
                borderRadius:10,
                border:0,
                background:C.primary,
                color:"#fff",
                fontWeight:900,
                cursor:"pointer"
              }}
            >
              Done
            </button>
          </div>
        </div>
      }
    </div>
  );
}
