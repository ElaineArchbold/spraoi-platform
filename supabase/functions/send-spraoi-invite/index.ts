import { withSupabase } from "npm:@supabase/server";

type InviteType =
  | "club_admin"
  | "lead_coach"
  | "coach"
  | "team_admin"
  | "club_staff"
  | "parent_guardian"
  | "cup_helper";

type InviteRequest = {
  clubId?: string;
  email?: string;
  name?: string;
  inviteType?: InviteType;
  role?: string;
  teamIds?: string[];
  childIds?: string[];
  redirectTo?: string;
};

const ALLOWED_INVITE_TYPES: InviteType[] = [
  "club_admin",
  "lead_coach",
  "coach",
  "team_admin",
  "club_staff",
  "parent_guardian",
  "cup_helper",
];

const ROLE_MAP: Record<InviteType, string | null> = {
  club_admin: "club_admin",
  lead_coach: "lead_coach",
  coach: "coach_mentor",
  team_admin: "team_admin",
  club_staff: "club_staff",
  parent_guardian: null,
  cup_helper: "cup_helper",
};

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    },
  });
}

function normaliseEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function cleanIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .map((item) => String(item || "").trim())
        .filter(Boolean),
    ),
  ];
}

async function findAuthUserByEmail(
  supabaseAdmin: any,
  email: string,
) {
  let page = 1;

  while (page <= 20) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw new Error(`Could not check existing users: ${error.message}`);
    }

    const users = data?.users || [];

    const match = users.find(
      (user: any) =>
        String(user.email || "").trim().toLowerCase() === email,
    );

    if (match) return match;

    if (users.length < 1000) break;

    page += 1;
  }

  return null;
}

export default {
  fetch: withSupabase(
    { auth: "user" },
    async (req, ctx) => {
      if (req.method === "OPTIONS") {
        return new Response("ok", {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers":
              "authorization, x-client-info, apikey, content-type",
          },
        });
      }

      if (req.method !== "POST") {
        return json(
          { ok: false, error: "Method not allowed." },
          405,
        );
      }

      try {
        const callerId = ctx.userClaims?.id;
        const callerEmail = normaliseEmail(ctx.userClaims?.email);

        if (!callerId) {
          return json(
            { ok: false, error: "Authentication required." },
            401,
          );
        }

        const body = (await req.json()) as InviteRequest;

        const clubId = String(body.clubId || "").trim();
        const email = normaliseEmail(body.email);
        const name = String(body.name || "").trim();
        const inviteType = body.inviteType as InviteType;
        const teamIds = cleanIds(body.teamIds);
        const childIds = cleanIds(body.childIds);
        const firstName = (name.split(/\s+/).filter(Boolean)[0] || "").trim();
        let teamNames: string[] = [];

        if (!clubId) {
          return json(
            { ok: false, error: "Club is required." },
            400,
          );
        }

        if (!email || !email.includes("@")) {
          return json(
            { ok: false, error: "A valid email address is required." },
            400,
          );
        }

        if (!ALLOWED_INVITE_TYPES.includes(inviteType)) {
          return json(
            { ok: false, error: "Invalid invitation type." },
            400,
          );
        }

        if (email === callerEmail) {
          return json(
            {
              ok: false,
              error: "You cannot invite your own account.",
            },
            400,
          );
        }

        if (
          ["lead_coach", "coach", "team_admin"].includes(inviteType) &&
          teamIds.length === 0
        ) {
          return json(
            {
              ok: false,
              error:
                "Lead Coaches, Coaches and Team Admins must be assigned to at least one team.",
            },
            400,
          );
        }

        if (
          inviteType === "parent_guardian" &&
          childIds.length === 0
        ) {
          return json(
            {
              ok: false,
              error:
                "Parent or Guardian invitations must include at least one child.",
            },
            400,
          );
        }

        // ----------------------------------------------------
        // Verify the caller can manage this club.
        //
        // Current Spraoi user_roles is email-based rather than
        // club-scoped, so we combine that with the club/team
        // data already used by the platform.
        // ----------------------------------------------------

        const { data: callerRoles, error: callerRoleError } =
          await ctx.supabaseAdmin
            .from("user_roles")
            .select("role, user_email")
            .eq("user_email", callerEmail);

        if (callerRoleError) {
          return json(
            {
              ok: false,
              error: `Could not verify your role: ${callerRoleError.message}`,
            },
            500,
          );
        }

        const roleRows = Array.isArray(callerRoles) ? callerRoles : [];
        const roles = roleRows
          .map((row: any) => String(row?.role || "").trim().toLowerCase())
          .filter(Boolean);

        const canInviteByRole = roles.some((role: string) => [
          "super_admin",
          "admin",
          "club_admin",
        ].includes(role));

        if (!canInviteByRole) {
          return json(
            {
              ok: false,
              error:
                "You do not have permission to invite people to this club.",
            },
            403,
          );
        }

        const { data: club, error: clubError } =
          await ctx.supabaseAdmin
            .from("clubs")
            .select("id, name")
            .eq("id", clubId)
            .maybeSingle();

        if (clubError || !club) {
          return json(
            {
              ok: false,
              error: "Club could not be found.",
            },
            404,
          );
        }

        // ----------------------------------------------------
        // Validate selected team IDs really belong to this club.
        // ----------------------------------------------------

        if (teamIds.length > 0) {
          const { data: teams, error: teamsError } =
            await ctx.supabaseAdmin
              .from("age_groups")
              .select("id, club_id, label")
              .in("id", teamIds);

          if (teamsError) {
            return json(
              {
                ok: false,
                error: `Could not validate teams: ${teamsError.message}`,
              },
              500,
            );
          }

          const validIds = new Set(
            (teams || [])
              .filter((team: any) => team.club_id === clubId)
              .map((team: any) => team.id),
          );

          const invalidTeam = teamIds.some(
            (teamId) => !validIds.has(teamId),
          );

          teamNames = (teams || [])
            .filter((team: any) => team.club_id === clubId)
            .map((team: any) => String(team.label || "").trim())
            .filter(Boolean);

          if (invalidTeam) {
            return json(
              {
                ok: false,
                error:
                  "One or more selected teams do not belong to this club.",
              },
              400,
            );
          }
        }

        // ----------------------------------------------------
        // Validate selected children exist.
        // ----------------------------------------------------

        if (childIds.length > 0) {
          const { data: children, error: childrenError } =
            await ctx.supabaseAdmin
              .from("journey_players")
              .select("id")
              .in("id", childIds);

          if (childrenError) {
            return json(
              {
                ok: false,
                error:
                  `Could not validate children: ${childrenError.message}`,
              },
              500,
            );
          }

          const validChildIds = new Set(
            (children || []).map((child: any) => child.id),
          );

          const invalidChild = childIds.some(
            (childId) => !validChildIds.has(childId),
          );

          if (invalidChild) {
            return json(
              {
                ok: false,
                error:
                  "One or more selected children could not be found.",
              },
              400,
            );
          }
        }

        // ----------------------------------------------------
        // Prevent a second live invitation for the same
        // email/type/club.
        // ----------------------------------------------------

        const { data: existingInvite, error: duplicateError } =
          await ctx.supabaseAdmin
            .from("spraoi_invitations")
            .select("id, status, expires_at")
            .eq("club_id", clubId)
            .eq("email", email)
            .eq("invite_type", inviteType)
            .eq("status", "pending")
            .maybeSingle();

        if (duplicateError) {
          return json(
            {
              ok: false,
              error:
                `Could not check pending invitations: ${duplicateError.message}`,
            },
            500,
          );
        }

        if (existingInvite) {
          return json(
            {
              ok: false,
              code: "PENDING_INVITE_EXISTS",
              error:
                "There is already a pending invitation for this person.",
              invitationId: existingInvite.id,
            },
            409,
          );
        }

        // ----------------------------------------------------
        // Create the Spraoi invitation first.
        // ----------------------------------------------------

        const invitationRole =
          String(body.role || "").trim() ||
          ROLE_MAP[inviteType];

        const { data: invitation, error: invitationError } =
          await ctx.supabaseAdmin
            .from("spraoi_invitations")
            .insert({
              club_id: clubId,
              email,
              name: name || null,
              invite_type: inviteType,
              role: invitationRole,
              status: "pending",
              invited_by: callerId,
              sent_at: new Date().toISOString(),
            })
            .select(
              "id, club_id, email, name, invite_type, role, token, expires_at",
            )
            .single();

        if (invitationError || !invitation) {
          return json(
            {
              ok: false,
              error:
                `Could not create invitation: ${
                  invitationError?.message || "Unknown error"
                }`,
            },
            500,
          );
        }

        // ----------------------------------------------------
        // Attach teams.
        // ----------------------------------------------------

        if (teamIds.length > 0) {
          const rows = teamIds.map((ageGroupId) => ({
            invitation_id: invitation.id,
            age_group_id: ageGroupId,
          }));

          const { error: teamInsertError } =
            await ctx.supabaseAdmin
              .from("spraoi_invitation_teams")
              .insert(rows);

          if (teamInsertError) {
            await ctx.supabaseAdmin
              .from("spraoi_invitations")
              .delete()
              .eq("id", invitation.id);

            return json(
              {
                ok: false,
                error:
                  `Could not assign invitation teams: ${teamInsertError.message}`,
              },
              500,
            );
          }
        }

        if (childIds.length > 0) {
          const childRows = childIds.map((playerId) => ({
            invitation_id: invitation.id,
            player_id: playerId,
          }));

          const { error: childInsertError } =
            await ctx.supabaseAdmin
              .from("spraoi_invitation_children")
              .insert(childRows);

          if (childInsertError) {
            await ctx.supabaseAdmin
              .from("spraoi_invitations")
              .delete()
              .eq("id", invitation.id);

            return json(
              {
                ok: false,
                error:
                  `Could not assign invitation children: ${childInsertError.message}`,
              },
              500,
            );
          }
        }

        // ----------------------------------------------------
        // Existing account vs brand-new Supabase Auth account.
        // ----------------------------------------------------

        const authUser = await findAuthUserByEmail(
          ctx.supabaseAdmin,
          email,
        );

        const defaultRedirect =
          "https://admin.spraoisports.com/?invite=" +
          encodeURIComponent(invitation.token);

        const redirectTo =
          String(body.redirectTo || "").trim() ||
          defaultRedirect;

        if (authUser) {
          // Existing Spraoi account:
          // send a passwordless Auth email that returns the
          // recipient to this specific Spraoi invitation.
          //
          // shouldCreateUser:false guarantees this path can
          // never create a second account for the recipient.

          const { error: existingUserEmailError } =
            await ctx.supabaseAdmin.auth.signInWithOtp({
              email,
              options: {
                shouldCreateUser: false,
                emailRedirectTo: redirectTo,
              },
            });

          if (existingUserEmailError) {
            // Do not leave the invitation looking as though it
            // was successfully delivered when Auth rejected it.
            await ctx.supabaseAdmin
              .from("spraoi_invitations")
              .update({
                status: "cancelled",
                cancelled_at: new Date().toISOString(),
              })
              .eq("id", invitation.id);

            return json(
              {
                ok: false,
                error:
                  `Invitation email could not be sent: ${existingUserEmailError.message}`,
              },
              500,
            );
          }

          return json({
            ok: true,
            delivery: "existing_user_email",
            invitationId: invitation.id,
            inviteToken: invitation.token,
            inviteUrl: redirectTo,
            recipient: {
              email,
              name: name || null,
            },
            club: {
              id: club.id,
              name: club.name,
            },
            inviteType,
            role: invitationRole,
            teamIds,
            teamNames,
            childIds,
            message:
              "Invitation created and sign-in email sent to existing Spraoi account.",
          });
        }
        // ----------------------------------------------------
        // New user:
        // send Supabase Auth invite email.
        // ----------------------------------------------------

        const { data: authInvite, error: authInviteError } =
          await ctx.supabaseAdmin.auth.admin.inviteUserByEmail(
            email,
            {
              data: {
                name: name || undefined,
                first_name: firstName || undefined,
                club_name: club.name || undefined,
                team_names: teamNames,
                spraoi_account_setup_required: true,
                spraoi_invitation_id: invitation.id,
                spraoi_invitation_token: invitation.token,
                club_id: clubId,
                invite_type: inviteType,
              },
              redirectTo,
            },
          );

        if (authInviteError) {
          // Do not leave an unusable "sent" invitation behind.
          await ctx.supabaseAdmin
            .from("spraoi_invitations")
            .update({
              status: "cancelled",
              cancelled_at: new Date().toISOString(),
            })
            .eq("id", invitation.id);

          return json(
            {
              ok: false,
              error:
                `Invitation email could not be sent: ${authInviteError.message}`,
            },
            500,
          );
        }

        return json({
          ok: true,
          delivery: "new_user_email",
          invitationId: invitation.id,
          recipient: {
            email,
            name: name || null,
          },
          club: {
            id: club.id,
            name: club.name,
          },
          inviteType,
          role: invitationRole,
          teamIds,
          teamNames,
          childIds,
          authUserId: authInvite?.user?.id || null,
          message:
            "Invitation created and account invitation email sent.",
        });
      } catch (error) {
        console.error("send-spraoi-invite failed", error);

        return json(
          {
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : "Unexpected invitation error.",
          },
          500,
        );
      }
    },
  ),
};

