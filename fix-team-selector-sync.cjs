const fs = require("fs");

const path = "./apps/coach/src/App.jsx";
let text = fs.readFileSync(path, "utf8");

fs.copyFileSync(
  path,
  path + ".before-team-selector-sync-fix.bak"
);

/* ------------------------------------------------------------
   1. MobileHeader gets userRole
   ------------------------------------------------------------ */

text = text.replace(
`function MobileHeader({ activeModule, setActiveModule, onNav, enabledModules, club, selectedTeam, ageGroups = [], myTeams = [], onSelectTeam, onShowProfile , profileInitials = "U" }) {
  const [open, setOpen] = useState(false);
  const mod = MODULES[activeModule];
  const clubName = club?.name || "Club Spraoi";
  const mobileTeams = myTeams?.length ? ageGroups.filter((ag) => myTeams.includes(ag.id)) : ageGroups;`,
`function MobileHeader({ activeModule, setActiveModule, onNav, enabledModules, club, selectedTeam, ageGroups = [], myTeams = [], onSelectTeam, onShowProfile, userRole, profileInitials = "U" }) {
  const [open, setOpen] = useState(false);
  const mod = MODULES[activeModule];
  const clubName = club?.name || "Club Spraoi";

  const canSeeAllTeams = ["super_admin", "admin", "club_admin"]
    .includes(String(userRole?.role || "").toLowerCase());

  const mobileTeams = canSeeAllTeams
    ? ageGroups
    : myTeams?.length
      ? ageGroups.filter((ag) =>
          myTeams.some((id) => String(id) === String(ag.id))
        )
      : ageGroups;`
);

console.log("OK: Mobile team scope fixed");

/* ------------------------------------------------------------
   2. Desktop sidebar gets the same rule
   ------------------------------------------------------------ */

text = text.replace(
`function Sidebar({ activeModule, setActiveModule, activeScreen, onNav, club, selectedTeam, onSelectTeam, enabledModules, onLogout, ageGroups, myTeams, onShowProfile, userRole, profileInitials = "U" }) {
  const visibleTeams = myTeams?.length ? (ageGroups || []).filter((ag) => myTeams.includes(ag.id)) : (ageGroups || []);`,
`function Sidebar({ activeModule, setActiveModule, activeScreen, onNav, club, selectedTeam, onSelectTeam, enabledModules, onLogout, ageGroups, myTeams, onShowProfile, userRole, profileInitials = "U" }) {
  const canSeeAllTeams = ["super_admin", "admin", "club_admin"]
    .includes(String(userRole?.role || "").toLowerCase());

  const visibleTeams = canSeeAllTeams
    ? (ageGroups || [])
    : myTeams?.length
      ? (ageGroups || []).filter((ag) =>
          myTeams.some((id) => String(id) === String(ag.id))
        )
      : (ageGroups || []);`
);

console.log("OK: Desktop team scope fixed");

/* ------------------------------------------------------------
   3. Pass actual account role into selectors
   ------------------------------------------------------------ */

text = text.replace(
`<MobileHeader activeModule={activeModule} setActiveModule={setActiveModule} onNav={setScreen} enabledModules={enabledModules} club={club} selectedTeam={selectedTeam} ageGroups={ageGroups} myTeams={myTeams} onSelectTeam={selectTeam} onShowProfile={()=>setShowProfile(true)} profileInitials={signedInInitials} />`,
`<MobileHeader activeModule={activeModule} setActiveModule={setActiveModule} onNav={setScreen} enabledModules={enabledModules} club={club} selectedTeam={selectedTeam} ageGroups={ageGroups} myTeams={myTeams} onSelectTeam={selectTeam} onShowProfile={()=>setShowProfile(true)} userRole={userRole} profileInitials={signedInInitials} />`
);

text = text.replace(
`userRole={selectedTeamUserRole} profileInitials={signedInInitials} />`,
`userRole={userRole} profileInitials={signedInInitials} />`
);

console.log("OK: selector role wiring fixed");

/* ------------------------------------------------------------
   4. Make team switching clear stale screen data immediately
   ------------------------------------------------------------ */

const oldSelectTeam = `  function selectTeam(ag) {
    setSelectedTeam(ag);
    saveActiveContext(ag, club);
    loadUpcoming(ag.id);
    loadAcademyCoachPlan(ag.id);
  }`;

const newSelectTeam = `  function selectTeam(ag) {
    if (!ag?.id) return;

    setSelectedTeam(ag);
    setUpcomingSessions([]);
    setWeeklyPlan(null);
    setPlanSessions([]);
    setSessionDetail(null);
    setEditingSession(null);

    saveActiveContext(ag, club);

    loadUpcoming(ag.id);
    loadAcademyCoachPlan(ag.id);
  }`;

if (text.includes(oldSelectTeam)) {
  text = text.replace(oldSelectTeam, newSelectTeam);
  console.log("OK: selected-team switching synchronised");
} else {
  console.log("WARNING: selectTeam block not matched");
}

/* ------------------------------------------------------------
   5. Ensure stored team is valid after teams/role load
   ------------------------------------------------------------ */

const marker = `  useEffect(() => {
    if (club?.id) localStorage.setItem(ACTIVE_CLUB_KEY, String(club.id));
  }, [club?.id]);`;

if (text.includes(marker)) {
  text = text.replace(
    marker,
`${marker}

  useEffect(() => {
    if (!ageGroups.length || !userRole) return;

    const isAdmin = ["super_admin", "admin", "club_admin"]
      .includes(String(userRole?.role || "").toLowerCase());

    const allowedTeams = isAdmin
      ? ageGroups
      : myTeams?.length
        ? ageGroups.filter((ag) =>
            myTeams.some((id) => String(id) === String(ag.id))
          )
        : ageGroups;

    if (!allowedTeams.length) {
      if (selectedTeam) {
        setSelectedTeam(null);
        saveActiveContext(null, club);
      }
      return;
    }

    const currentAllowed = allowedTeams.some(
      (ag) => String(ag.id) === String(selectedTeam?.id || "")
    );

    if (!currentAllowed) {
      const storedId =
        localStorage.getItem(ACTIVE_TEAM_KEY) ||
        localStorage.getItem("spraoi_team_id");

      const storedAllowed = allowedTeams.find(
        (ag) => String(ag.id) === String(storedId || "")
      );

      const nextTeam = storedAllowed || allowedTeams[0];

      setSelectedTeam(nextTeam);
      saveActiveContext(nextTeam, club);
      loadUpcoming(nextTeam.id);
      loadAcademyCoachPlan(nextTeam.id);
    }
  }, [
    ageGroups,
    myTeams,
    userRole?.role
  ]);`
  );

  console.log("OK: stale stored-team mismatch fixed");
}

fs.writeFileSync(path, text, "utf8");

console.log("");
console.log("==============================");
console.log("TEAM SELECTOR SYNC FIX COMPLETE");
console.log("==============================");
