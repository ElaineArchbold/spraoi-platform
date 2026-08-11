export const CLUB_SPRAOI = {
  id: "club-spraoi",
  name: "Club Spraoi",
  shortName: "Spraoi",
  crest: "/club-spraoi-crest.svg",
};

export const CLUB_SPRAOI_THEME = {
  navy: "#10243E",
  navy2: "#0A1D35",
  teal: "#2E9D74",
  orange: "#E65100",
  gold: "#F4B400",
  cream: "#FFF8EE",
  white: "#FFFFFF",
  ink: "#13243B",
  muted: "#66758A",
  line: "#E1E8EF",
  soft: "#F5F8FB",
};

export function getClubBrand(club) {
  const primary =
    club?.primary_color ||
    club?.primaryColor ||
    CLUB_SPRAOI_THEME.navy;

  const secondary =
    club?.secondary_color ||
    club?.secondaryColor ||
    CLUB_SPRAOI_THEME.white;

  const accent =
    club?.accent_color ||
    club?.accentColor ||
    primary ||
    CLUB_SPRAOI_THEME.teal;

  return {
    id: club?.id || "",
    name: club?.name || "Club",

    shortName:
      club?.short_name ||
      club?.shortName ||
      club?.name ||
      "Club",

    logoUrl:
      club?.logo_url ||
      club?.logoUrl ||
      club?.crest_url ||
      club?.crestUrl ||
      null,

    primary,
    secondary,
    accent,
  };
}