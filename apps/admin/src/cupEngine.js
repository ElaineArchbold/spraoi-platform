// apps/cup/src/cupEngine.js
// Reusable tournament logic extracted from the original Fingallians Blitz app.
//
// IMPORTANT:
// generateGroupFixtures() below preserves the proven original format:
// - 8 clubs
// - an A and B team per club
// - two groups of 4 clubs
// - 3 pitches
// - 25-minute schedule slots
// - Cup + Shield finals
//
// We will generalise this later for other tournament formats. For now, this
// deliberately preserves the working Blitz scheduling logic rather than
// rewriting it during the first Cup migration.

export const DEFAULT_PITCHES = ["Pitch 1", "Pitch 2", "Pitch 3"];
export const DEFAULT_SLOT_MINUTES = 25;
export const DEFAULT_START_HOUR = 10;
export const DEFAULT_START_MINUTE = 0;

export const LUNCH_MINUTES = 25;
export const MATCH_DURATION_MINUTES = 23;
export const PRESENTATION_MINUTES = 15;

export function scoreTotal(goals = 0, points = 0) {
  return Number(goals || 0) * 3 + Number(points || 0);
}

export function scoreLabel(goals = 0, points = 0) {
  return `${Number(goals || 0)}-${String(Number(points || 0)).padStart(2, "0")}`;
}

export function computeStandings(teams = [], matches = []) {
  const table = {};

  teams.forEach((team) => {
    table[team.id] = {
      id: team.id,
      name: team.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      points: 0,
    };
  });

  const headToHead = {};

  matches
    .filter((match) => match.status === "finished")
    .forEach((match) => {
      const teamA = table[match.teamA];
      const teamB = table[match.teamB];

      if (!teamA || !teamB) return;

      const scoreA = scoreTotal(match.goalsA, match.pointsA);
      const scoreB = scoreTotal(match.goalsB, match.pointsB);

      teamA.played += 1;
      teamB.played += 1;

      if (scoreA > scoreB) {
        teamA.won += 1;
        teamA.points += 3;
        teamB.lost += 1;
        headToHead[`${match.teamA}-${match.teamB}`] = match.teamA;
        headToHead[`${match.teamB}-${match.teamA}`] = match.teamA;
      } else if (scoreB > scoreA) {
        teamB.won += 1;
        teamB.points += 3;
        teamA.lost += 1;
        headToHead[`${match.teamA}-${match.teamB}`] = match.teamB;
        headToHead[`${match.teamB}-${match.teamA}`] = match.teamB;
      } else {
        teamA.drawn += 1;
        teamB.drawn += 1;
        teamA.points += 1;
        teamB.points += 1;
      }
    });

  return Object.values(table).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;

    const headToHeadWinner = headToHead[`${a.id}-${b.id}`];
    if (headToHeadWinner === a.id) return -1;
    if (headToHeadWinner === b.id) return 1;

    return 0;
  });
}

export function computeGroups(teams = [], matches = []) {
  const groupMatches = matches.filter(
    (match) =>
      !match.finalLabel &&
      match.teamA &&
      match.teamB
  );

  const parent = {};
  teams.forEach((team) => {
    parent[team.id] = team.id;
  });

  const find = (id) => {
    if (!parent[id]) return id;

    let current = id;
    while (parent[current] !== current) {
      current = parent[current];
    }
    return current;
  };

  const union = (a, b) => {
    if (!parent[a] || !parent[b]) return;

    const rootA = find(a);
    const rootB = find(b);

    if (rootA !== rootB) {
      parent[rootA] = rootB;
    }
  };

  groupMatches.forEach((match) => {
    union(match.teamA, match.teamB);
  });

  const groups = {};

  teams.forEach((team) => {
    const root = find(team.id);
    groups[root] = groups[root] || [];
    groups[root].push(team);
  });

  return Object.values(groups).filter((group) => group.length > 1);
}

export function groupIsComplete(groupTeams = [], matches = []) {
  const ids = groupTeams.map((team) => team.id);

  const groupMatches = matches.filter(
    (match) =>
      !match.finalLabel &&
      ids.includes(match.teamA) &&
      ids.includes(match.teamB)
  );

  const expectedMatches =
    (groupTeams.length * (groupTeams.length - 1)) / 2;

  if (groupMatches.length < expectedMatches) return false;

  return groupMatches.every((match) => match.status === "finished");
}

export function qualifiersForGrade(teams = [], matches = [], grade) {
  const groupedTeams = computeGroups(teams, matches).filter(
    (group) =>
      group.length > 0 &&
      String(group[0].id || "").endsWith(grade)
  );

  if (groupedTeams.length < 2) return null;

  for (const group of groupedTeams) {
    if (!groupIsComplete(group, matches)) return null;
  }

  const standingsPerGroup = groupedTeams.map((group) =>
    computeStandings(group, matches)
  );

  return {
    winners: standingsPerGroup.map((rows) => rows[0]?.id).filter(Boolean),
    runnersUp: standingsPerGroup.map((rows) => rows[1]?.id).filter(Boolean),
  };
}

export function autoFillFinals(matches = [], teams = []) {
  const qualifiersA = qualifiersForGrade(teams, matches, "A");
  const qualifiersB = qualifiersForGrade(teams, matches, "B");

  const finalTeams = {
    "A Cup Final": qualifiersA?.winners,
    "A Shield Final": qualifiersA?.runnersUp,
    "B Cup Final": qualifiersB?.winners,
    "B Shield Final": qualifiersB?.runnersUp,
  };

  return matches.map((match) => {
    if (!match.finalLabel || (match.teamA && match.teamB)) {
      return match;
    }

    const pair = finalTeams[match.finalLabel];

    if (pair?.[0] && pair?.[1]) {
      return {
        ...match,
        teamA: pair[0],
        teamB: pair[1],
      };
    }

    return match;
  });
}

export function minutesToLabel(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

function roundRobin4(group) {
  if (!Array.isArray(group) || group.length !== 4) {
    throw new Error("The legacy Blitz generator requires exactly 4 teams per group.");
  }

  return [
    [
      [group[0], group[1]],
      [group[2], group[3]],
    ],
    [
      [group[0], group[2]],
      [group[1], group[3]],
    ],
    [
      [group[0], group[3]],
      [group[1], group[2]],
    ],
  ];
}

function fillSlots({
  pool,
  fixtures,
  startSlot,
  lastPlayedSlot,
  pitches,
  pitchCounts,
  slotMinutes,
  startHour,
  startMinute,
  minSlots = 0,
  excludeTeamIds = null,
  extraOffsetRef,
}) {
  let slotIndex = startSlot;
  let slotsUsed = 0;
  let guard = 0;

  while (guard < 200) {
    guard += 1;

    const usedThisSlot = new Set();
    const slotMatches = [];

    for (
      let index = 0;
      index < pool.length && slotMatches.length < pitches.length;
      index += 1
    ) {
      const match = pool[index];

      const teamARested =
        lastPlayedSlot[match.a.id] === undefined ||
        lastPlayedSlot[match.a.id] < slotIndex - 1;

      const teamBRested =
        lastPlayedSlot[match.b.id] === undefined ||
        lastPlayedSlot[match.b.id] < slotIndex - 1;

      const excluded =
        excludeTeamIds &&
        (excludeTeamIds.has(match.a.id) ||
          excludeTeamIds.has(match.b.id));

      if (
        !excluded &&
        !usedThisSlot.has(match.a.id) &&
        !usedThisSlot.has(match.b.id) &&
        teamARested &&
        teamBRested
      ) {
        slotMatches.push(match);
        usedThisSlot.add(match.a.id);
        usedThisSlot.add(match.b.id);
        pool.splice(index, 1);
        index -= 1;
      }
    }

    if (slotMatches.length > 0) {
      const time = minutesToLabel(
        startHour * 60 +
          startMinute +
          slotIndex * slotMinutes +
          extraOffsetRef.value
      );

      const pitchOrder = [...pitches].sort(
        (a, b) => pitchCounts[a] - pitchCounts[b]
      );

      slotMatches.forEach((match, pitchIndex) => {
        const pitch = pitchOrder[pitchIndex];

        pitchCounts[pitch] += 1;
        lastPlayedSlot[match.a.id] = slotIndex;
        lastPlayedSlot[match.b.id] = slotIndex;

        fixtures.push({
          id: `m${Date.now()}_${fixtures.length}_${Math.random()
            .toString(36)
            .slice(2, 6)}`,
          time,
          pitch,
          teamA: match.a.id,
          teamB: match.b.id,
          goalsA: 0,
          pointsA: 0,
          goalsB: 0,
          pointsB: 0,
          status: "scheduled",
        });
      });
    }

    slotIndex += 1;
    slotsUsed += 1;

    if (excludeTeamIds) {
      if (slotsUsed >= minSlots) break;
    } else if (pool.length === 0 && slotsUsed >= minSlots) {
      break;
    }
  }

  return slotIndex;
}

export function generateGroupFixtures(
  teams = [],
  options = {}
) {
  const pitches = options.pitches || DEFAULT_PITCHES;
  const slotMinutes =
    options.slotMinutes || DEFAULT_SLOT_MINUTES;
  const startHour =
    options.startHour ?? DEFAULT_START_HOUR;
  const startMinute =
    options.startMinute ?? DEFAULT_START_MINUTE;

  const clubIds = [
    ...new Set(teams.map((team) => team.clubId).filter(Boolean)),
  ];

  if (clubIds.length !== 8) {
    throw new Error(
      `The legacy Blitz generator currently expects 8 clubs. Received ${clubIds.length}.`
    );
  }

  const clubGroup1 = clubIds.slice(0, 4);
  const clubGroup2 = clubIds.slice(4, 8);

  const teamsFor = (clubList, grade) =>
    teams.filter(
      (team) =>
        clubList.includes(team.clubId) &&
        String(team.id || "").endsWith(grade)
    );

  const groupsA = [
    teamsFor(clubGroup1, "A"),
    teamsFor(clubGroup2, "A"),
  ];

  const groupsB = [
    teamsFor(clubGroup1, "B"),
    teamsFor(clubGroup2, "B"),
  ];

  [...groupsA, ...groupsB].forEach((group) => {
    if (group.length !== 4) {
      throw new Error(
        "Each legacy Blitz group must contain exactly 4 teams. Check that every club has one A and one B team."
      );
    }
  });

  const toMatches = (round) =>
    round.map(([a, b]) => ({ a, b }));

  const rrAg1 = roundRobin4(groupsA[0]);
  const rrAg2 = roundRobin4(groupsA[1]);
  const rrBg1 = roundRobin4(groupsB[0]);
  const rrBg2 = roundRobin4(groupsB[1]);

  const fixtures = [];
  const lastPlayedSlot = {};
  let slotIndex = 0;
  const extraOffset = { value: 0 };
  const pitchCounts = Object.fromEntries(
    pitches.map((pitch) => [pitch, 0])
  );

  const lunchMinSlots = Math.max(
    1,
    Math.floor(LUNCH_MINUTES / slotMinutes)
  );

  const lunchRemainderMinutes =
    LUNCH_MINUTES - lunchMinSlots * slotMinutes;

  const round1All = [
    ...toMatches(rrAg1[0]),
    ...toMatches(rrAg2[0]),
    ...toMatches(rrBg1[0]),
    ...toMatches(rrBg2[0]),
  ];

  slotIndex = fillSlots({
    pool: round1All,
    fixtures,
    startSlot: slotIndex,
    lastPlayedSlot,
    pitches,
    pitchCounts,
    slotMinutes,
    startHour,
    startMinute,
    extraOffsetRef: extraOffset,
  });

  const remainingPool = [
    ...toMatches(rrAg1[1]),
    ...toMatches(rrAg2[1]),
    ...toMatches(rrBg1[1]),
    ...toMatches(rrBg2[1]),
    ...toMatches(rrAg1[2]),
    ...toMatches(rrAg2[2]),
    ...toMatches(rrBg1[2]),
    ...toMatches(rrBg2[2]),
  ];

  const lunchGroups = [clubGroup1, clubGroup2];
  const lunchWindows = [];

  lunchGroups.forEach((clubGroup) => {
    const excludedTeamIds = new Set();

    clubGroup.forEach((clubId) => {
      excludedTeamIds.add(`${clubId}A`);
      excludedTeamIds.add(`${clubId}B`);
    });

    const phaseStart = slotIndex;

    const from = minutesToLabel(
      startHour * 60 +
        startMinute +
        phaseStart * slotMinutes +
        extraOffset.value
    );

    slotIndex = fillSlots({
      pool: remainingPool,
      fixtures,
      startSlot: slotIndex,
      lastPlayedSlot,
      pitches,
      pitchCounts,
      slotMinutes,
      startHour,
      startMinute,
      minSlots: lunchMinSlots,
      excludeTeamIds: excludedTeamIds,
      extraOffsetRef: extraOffset,
    });

    extraOffset.value += lunchRemainderMinutes;

    lunchWindows.push({
      from,
      to: minutesToLabel(
        startHour * 60 +
          startMinute +
          slotIndex * slotMinutes +
          extraOffset.value
      ),
      clubs: clubGroup,
    });
  });

  slotIndex = fillSlots({
    pool: remainingPool,
    fixtures,
    startSlot: slotIndex,
    lastPlayedSlot,
    pitches,
    pitchCounts,
    slotMinutes,
    startHour,
    startMinute,
    extraOffsetRef: extraOffset,
  });

  const shieldTime = minutesToLabel(
    startHour * 60 +
      startMinute +
      slotIndex * slotMinutes +
      extraOffset.value
  );

  fixtures.push(
    {
      id: `final-ashield-${Date.now()}`,
      time: shieldTime,
      pitch: pitches[1] || pitches[0],
      teamA: "",
      teamB: "",
      goalsA: 0,
      pointsA: 0,
      goalsB: 0,
      pointsB: 0,
      status: "scheduled",
      finalLabel: "A Shield Final",
    },
    {
      id: `final-bshield-${Date.now()}`,
      time: shieldTime,
      pitch: pitches[2] || pitches[0],
      teamA: "",
      teamB: "",
      goalsA: 0,
      pointsA: 0,
      goalsB: 0,
      pointsB: 0,
      status: "scheduled",
      finalLabel: "B Shield Final",
    }
  );

  const cupMinutes =
    startHour * 60 +
    startMinute +
    (slotIndex + 1) * slotMinutes +
    extraOffset.value;

  const cupTime = minutesToLabel(cupMinutes);

  fixtures.push(
    {
      id: `final-acup-${Date.now()}`,
      time: cupTime,
      pitch: pitches[1] || pitches[0],
      teamA: "",
      teamB: "",
      goalsA: 0,
      pointsA: 0,
      goalsB: 0,
      pointsB: 0,
      status: "scheduled",
      finalLabel: "A Cup Final",
    },
    {
      id: `final-bcup-${Date.now()}`,
      time: cupTime,
      pitch: pitches[2] || pitches[0],
      teamA: "",
      teamB: "",
      goalsA: 0,
      pointsA: 0,
      goalsB: 0,
      pointsB: 0,
      status: "scheduled",
      finalLabel: "B Cup Final",
    }
  );

  const presentationsFrom = minutesToLabel(
    cupMinutes + MATCH_DURATION_MINUTES
  );

  const presentationsTo = minutesToLabel(
    cupMinutes +
      MATCH_DURATION_MINUTES +
      PRESENTATION_MINUTES
  );

  fixtures.push({
    id: `presentations-${Date.now()}`,
    time: presentationsFrom,
    pitch: "",
    teamA: "",
    teamB: "",
    goalsA: 0,
    pointsA: 0,
    goalsB: 0,
    pointsB: 0,
    status: "scheduled",
    finalLabel: "Presentations",
  });

  return {
    fixtures,
    lunchWindows,
    presentations: {
      from: presentationsFrom,
      to: presentationsTo,
    },
  };
}
