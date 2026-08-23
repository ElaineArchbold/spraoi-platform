import { withSupabase } from "npm:@supabase/server";

const POLICY_VERSION = "beta-1.0";

type AcceptInviteRequest = {
  token?: string;
  acceptedPolicyKeys?: string[];
  policyVersion?: string;
  parentGuardianConfirmation?: boolean;
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

function uniqueStrings(value: unknown) {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .map((item) => String(item || "").trim())
        .filter(Boolean),
    ),
  ];
}

function requiredPolicies(inviteType: string) {
  if (inviteType === "parent_guardian") {
    return ["terms", "privacy", "parent_guardian"];
  }

  return ["terms", "privacy", "acceptable_use"];
}

function rolePriority(role: string) {
  const priorities: Record<string, number> = {
    super_admin: 100,
    admin: 90,
    club_admin: 80,
    lead_coach: 60,
    coach_mentor: 50,
    club_staff: 40,
    cup_helper: 30,
  };

  return priorities[String(role || "").toLowerCase()] || 0;
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
          {
            ok: false,
            error: "Method not allowed.",
          },
          405,
        );
      }

      try {
        const userId = ctx.userClaims?.id;
        const userEmail = normaliseEmail(ctx.userClaims?.email);

        if (!userId || !userEmail) {
          return json(
            {
              ok: false,
              error: "Authentication required.",
            },
            401,
          );
        }

        const body = (await req.json()) as AcceptInviteRequest;

        const token = String(body.token || "").trim();

        if (!token) {
          return json(
            {
              ok: false,
              error: "Invitation token is required.",
            },
            400,
          );
        }

        // ----------------------------------------------------
        // Load invitation
        // ----------------------------------------------------

        const { data: invitation, error: invitationError } =
          await ctx.supabaseAdmin
            .from("spraoi_invitations")
            .select(`
              id,
              club_id,
              email,
              name,
              invite_type,
              role,
              status,
              token,
              expires_at,
              accepted_at,
              accepted_by
            `)
            .eq("token", token)
            .maybeSingle();

        if (invitationError) {
          return json(
            {
              ok: false,
              error:
                `Could not load invitation: ${invitationError.message}`,
            },
            500,
          );
        }

        if (!invitation) {
          return json(
            {
              ok: false,
              error: "This invitation could not be found.",
            },
            404,
          );
        }

        // ----------------------------------------------------
        // The invite must belong to the authenticated email
        // ----------------------------------------------------

        if (normaliseEmail(invitation.email) !== userEmail) {
          return json(
            {
              ok: false,
              code: "EMAIL_MISMATCH",
              error:
                "This invitation was sent to a different email address.",
            },
            403,
          );
        }

        // ----------------------------------------------------
        // Idempotent accepted response
        // ----------------------------------------------------

        if (
          invitation.status === "accepted" &&
          invitation.accepted_by === userId
        ) {
          return json({
            ok: true,
            alreadyAccepted: true,
            invitationId: invitation.id,
            inviteType: invitation.invite_type,
            message: "This invitation has already been accepted.",
          });
        }

        if (invitation.status === "cancelled") {
          return json(
            {
              ok: false,
              code: "INVITE_CANCELLED",
              error: "This invitation has been cancelled.",
            },
            410,
          );
        }

        if (invitation.status === "expired") {
          return json(
            {
              ok: false,
              code: "INVITE_EXPIRED",
              error: "This invitation has expired.",
            },
            410,
          );
        }

        if (invitation.status !== "pending") {
          return json(
            {
              ok: false,
              error: "This invitation is no longer available.",
            },
            409,
          );
        }

        if (
          invitation.expires_at &&
          new Date(invitation.expires_at).getTime() < Date.now()
        ) {
          await ctx.supabaseAdmin
            .from("spraoi_invitations")
            .update({
              status: "expired",
            })
            .eq("id", invitation.id);

          return json(
            {
              ok: false,
              code: "INVITE_EXPIRED",
              error: "This invitation has expired.",
            },
            410,
          );
        }

        // ----------------------------------------------------
        // Verify legal acceptance
        // ----------------------------------------------------

        const required = requiredPolicies(invitation.invite_type);
        const accepted = uniqueStrings(body.acceptedPolicyKeys);

        const missingPolicies = required.filter(
          (key) => !accepted.includes(key),
        );

        if (missingPolicies.length > 0) {
          return json(
            {
              ok: false,
              code: "POLICIES_REQUIRED",
              error:
                "All required Spraoi policies must be accepted.",
              missingPolicies,
            },
            400,
          );
        }

        if (
          body.policyVersion &&
          body.policyVersion !== POLICY_VERSION
        ) {
          return json(
            {
              ok: false,
              code: "POLICY_VERSION_MISMATCH",
              error:
                "The policies have changed. Please review the current version before continuing.",
              expectedVersion: POLICY_VERSION,
            },
            409,
          );
        }

        if (
          invitation.invite_type === "parent_guardian" &&
          body.parentGuardianConfirmation !== true
        ) {
          return json(
            {
              ok: false,
              code: "GUARDIAN_CONFIRMATION_REQUIRED",
              error:
                "Parent or guardian confirmation is required.",
            },
            400,
          );
        }

        // ----------------------------------------------------
        // Load team + child relationships from invitation
        // ----------------------------------------------------

        const { data: inviteTeams, error: inviteTeamsError } =
          await ctx.supabaseAdmin
            .from("spraoi_invitation_teams")
            .select("age_group_id")
            .eq("invitation_id", invitation.id);

        if (inviteTeamsError) {
          return json(
            {
              ok: false,
              error:
                `Could not load invitation teams: ${inviteTeamsError.message}`,
            },
            500,
          );
        }

        const { data: inviteChildren, error: inviteChildrenError } =
          await ctx.supabaseAdmin
            .from("spraoi_invitation_children")
            .select("player_id")
            .eq("invitation_id", invitation.id);

        if (inviteChildrenError) {
          return json(
            {
              ok: false,
              error:
                `Could not load invitation children: ${inviteChildrenError.message}`,
            },
            500,
          );
        }

        const teamIds = uniqueStrings(
          (inviteTeams || []).map((row: any) => row.age_group_id),
        );

        const childIds = uniqueStrings(
          (inviteChildren || []).map((row: any) => row.player_id),
        );

        if (
          ["lead_coach", "coach"].includes(invitation.invite_type) &&
          teamIds.length === 0
        ) {
          return json(
            {
              ok: false,
              error:
                "This staff invitation does not contain a team assignment.",
            },
            409,
          );
        }

        if (
          invitation.invite_type === "parent_guardian" &&
          childIds.length === 0
        ) {
          return json(
            {
              ok: false,
              error:
                "This parent invitation does not contain a child assignment.",
            },
            409,
          );
        }

        // ----------------------------------------------------
        // Record missing policy acceptances.
        //
        // We deliberately query first rather than blindly
        // inserting, because the existing table currently
        // has no uniqueness constraint.
        // ----------------------------------------------------

        const { data: existingAcceptances, error: acceptanceReadError } =
          await ctx.supabaseAdmin
            .from("spraoi_policy_acceptances")
            .select("policy_key, policy_version")
            .eq("user_id", userId)
            .eq("club_id", invitation.club_id);

        if (acceptanceReadError) {
          return json(
            {
              ok: false,
              error:
                `Could not check policy acceptance: ${acceptanceReadError.message}`,
            },
            500,
          );
        }

        const alreadyAccepted = new Set(
          (existingAcceptances || [])
            .filter(
              (row: any) =>
                row.policy_version === POLICY_VERSION,
            )
            .map((row: any) => row.policy_key),
        );

        const policyRows = required
          .filter((key) => !alreadyAccepted.has(key))
          .map((key) => ({
            club_id: invitation.club_id,
            user_id: userId,
            child_id: null,
            policy_key: key,
            policy_version: POLICY_VERSION,
            actor_type:
              invitation.invite_type === "parent_guardian"
                ? "parent_guardian"
                : "adult_user",
            parent_guardian_confirmation:
              invitation.invite_type === "parent_guardian",
          }));

        if (policyRows.length > 0) {
          const { error: acceptanceInsertError } =
            await ctx.supabaseAdmin
              .from("spraoi_policy_acceptances")
              .insert(policyRows);

          if (acceptanceInsertError) {
            return json(
              {
                ok: false,
                error:
                  `Could not record policy acceptance: ${acceptanceInsertError.message}`,
              },
              500,
            );
          }
        }

        // ----------------------------------------------------
        // ACTIVATE STAFF
        // ----------------------------------------------------

        if (
          invitation.invite_type === "lead_coach" ||
          invitation.invite_type === "coach"
        ) {
          const staffRole =
            invitation.invite_type === "lead_coach"
              ? "lead_coach"
              : "coach_mentor";

          // --------------------------------------------------
          // Keep the Club coaching directory aligned with the
          // authenticated account.
          // --------------------------------------------------

          const { data: existingCoachRows, error: coachReadError } =
            await ctx.supabaseAdmin
              .from("coaches")
              .select("id,name,email,user_id")
              .eq("club_id", invitation.club_id)
              .ilike("email", userEmail)
              .limit(1);

          if (coachReadError) {
            return json(
              {
                ok: false,
                error:
                  `Could not check coaching directory: ${coachReadError.message}`,
              },
              500,
            );
          }

          let coachDirectory = existingCoachRows?.[0] || null;

          if (coachDirectory) {
            const { data: updatedCoach, error: coachUpdateError } =
              await ctx.supabaseAdmin
                .from("coaches")
                .update({
                  user_id: userId,
                  name: invitation.name || coachDirectory.name || userEmail,
                  email: userEmail,
                })
                .eq("id", coachDirectory.id)
                .select("id,name,email,user_id")
                .single();

            if (coachUpdateError) {
              return json(
                {
                  ok: false,
                  error:
                    `Could not link coaching directory account: ${coachUpdateError.message}`,
                },
                500,
              );
            }

            coachDirectory = updatedCoach;
          } else {
            const { data: createdCoach, error: coachCreateError } =
              await ctx.supabaseAdmin
                .from("coaches")
                .insert({
                  club_id: invitation.club_id,
                  name: invitation.name || userEmail,
                  email: userEmail,
                  user_id: userId,
                  age_group_id: teamIds[0] || null,
                  role: "coach",
                })
                .select("id,name,email,user_id")
                .single();

            if (coachCreateError) {
              return json(
                {
                  ok: false,
                  error:
                    `Could not create coaching directory record: ${coachCreateError.message}`,
                },
                500,
              );
            }

            coachDirectory = createdCoach;
          }

          // team_staff
          //
          // Multi-role installations can contain more than one historical row for
          // the same user/team. Do not use maybeSingle() here: it throws when more
          // than one row exists. Reuse the oldest row and keep the new roles[]
          // column aligned with the legacy scalar role.
          for (const ageGroupId of teamIds) {
            const { data: existingStaffRows, error: existingStaffError } =
              await ctx.supabaseAdmin
                .from("team_staff")
                .select("id, status, role, roles, created_at")
                .eq("user_id", userId)
                .eq("age_group_id", ageGroupId)
                .order("created_at", { ascending: true });

            if (existingStaffError) {
              return json(
                {
                  ok: false,
                  error:
                    `Could not check team assignment: ${existingStaffError.message}`,
                },
                500,
              );
            }

            const existingStaff = existingStaffRows?.[0] || null;
            const existingRoles = uniqueStrings([
              ...(existingStaff?.roles || []),
              existingStaff?.role,
              staffRole,
            ]);

            if (existingStaff) {
              const { error: updateStaffError } =
                await ctx.supabaseAdmin
                  .from("team_staff")
                  .update({
                    club_id: invitation.club_id,
                    coach_id: coachDirectory.id,
                    user_id: userId,
                    role: staffRole,
                    roles: existingRoles,
                    status: "active",
                  })
                  .eq("id", existingStaff.id);

              if (updateStaffError) {
                return json(
                  {
                    ok: false,
                    error:
                      `Could not activate team assignment: ${updateStaffError.message}`,
                  },
                  500,
                );
              }
            } else {
              const { error: insertStaffError } =
                await ctx.supabaseAdmin
                  .from("team_staff")
                  .insert({
                    club_id: invitation.club_id,
                    age_group_id: ageGroupId,
                    coach_id: coachDirectory.id,
                    user_id: userId,
                    role: staffRole,
                    roles: [staffRole],
                    status: "active",
                  });

              if (insertStaffError) {
                return json(
                  {
                    ok: false,
                    error:
                      `Could not create team assignment: ${insertStaffError.message}`,
                  },
                  500,
                );
              }
            }

            // Keep legacy coach_assignments in sync because existing Spraoi
            // modules still read this table. Avoid upsert/onConflict because older
            // production schemas may not have the matching unique constraint.
            const { data: legacyAssignments, error: legacyReadError } =
              await ctx.supabaseAdmin
                .from("coach_assignments")
                .select("id")
                .eq("user_id", userId)
                .eq("age_group_id", ageGroupId)
                .limit(1);

            if (legacyReadError) {
              return json(
                {
                  ok: false,
                  error:
                    `Could not check coach assignment: ${legacyReadError.message}`,
                },
                500,
              );
            }

            const legacyAssignment = legacyAssignments?.[0] || null;
            const legacyPayload = {
              user_id: userId,
              club_id: invitation.club_id,
              age_group_id: ageGroupId,
            };

            const { error: coachAssignmentError } = legacyAssignment
              ? await ctx.supabaseAdmin
                  .from("coach_assignments")
                  .update(legacyPayload)
                  .eq("id", legacyAssignment.id)
              : await ctx.supabaseAdmin
                  .from("coach_assignments")
                  .insert(legacyPayload);

            if (coachAssignmentError) {
              return json(
                {
                  ok: false,
                  error:
                    `Could not sync coach assignment: ${coachAssignmentError.message}`,
                },
                500,
              );
            }
          }

          // user_roles
          //
          // Never downgrade an existing administrator.
          const { data: roleRows, error: roleReadError } =
            await ctx.supabaseAdmin
              .from("user_roles")
              .select("id, role")
              .eq("user_email", userEmail)
              .order("created_at", { ascending: true });

          if (roleReadError) {
            return json(
              {
                ok: false,
                error:
                  `Could not check account role: ${roleReadError.message}`,
              },
              500,
            );
          }

          const strongestExisting = (roleRows || [])
            .map((row: any) => row.role)
            .sort(
              (a: string, b: string) =>
                rolePriority(b) - rolePriority(a),
            )[0];

          if (!strongestExisting) {
            const { error: roleInsertError } =
              await ctx.supabaseAdmin
                .from("user_roles")
                .insert({
                  user_email: userEmail,
                  role: staffRole,
                });

            if (roleInsertError) {
              return json(
                {
                  ok: false,
                  error:
                    `Could not create user role: ${roleInsertError.message}`,
                },
                500,
              );
            }
          } else if (
            rolePriority(staffRole) >
            rolePriority(strongestExisting)
          ) {
            const targetRow = (roleRows || []).find(
              (row: any) => row.role === strongestExisting,
            );

            if (targetRow?.id) {
              const { error: roleUpdateError } =
                await ctx.supabaseAdmin
                  .from("user_roles")
                  .update({
                    role: staffRole,
                  })
                  .eq("id", targetRow.id);

              if (roleUpdateError) {
                return json(
                  {
                    ok: false,
                    error:
                      `Could not update user role: ${roleUpdateError.message}`,
                  },
                  500,
                );
              }
            }
          }
        }

        // ----------------------------------------------------
        // ACTIVATE PARENT / GUARDIAN
        //
        // Academy uses journey_players.parent_user_id as the
        // live parent -> child relationship. Invitation child
        // IDs therefore point directly at journey_players.
        // ----------------------------------------------------

        if (invitation.invite_type === "parent_guardian") {
          for (const playerId of childIds) {
            const { data: journeyPlayer, error: playerReadError } =
              await ctx.supabaseAdmin
                .from("journey_players")
                .select("id,club_id,parent_user_id")
                .eq("id", playerId)
                .maybeSingle();

            if (playerReadError) {
              return json(
                {
                  ok: false,
                  error:
                    `Could not load invited child: ${playerReadError.message}`,
                },
                500,
              );
            }

            if (!journeyPlayer) {
              return json(
                {
                  ok: false,
                  error: "An invited child could not be found.",
                },
                409,
              );
            }

            if (
              journeyPlayer.club_id &&
              String(journeyPlayer.club_id) !== String(invitation.club_id)
            ) {
              return json(
                {
                  ok: false,
                  error:
                    "An invited child does not belong to this club.",
                },
                403,
              );
            }

            if (
              journeyPlayer.parent_user_id &&
              journeyPlayer.parent_user_id !==
                "00000000-0000-0000-0000-000000000000" &&
              journeyPlayer.parent_user_id !== userId
            ) {
              return json(
                {
                  ok: false,
                  code: "CHILD_ALREADY_LINKED",
                  error:
                    "This child is already linked to another parent or guardian account.",
                },
                409,
              );
            }

            const { error: parentLinkError } =
              await ctx.supabaseAdmin
                .from("journey_players")
                .update({
                  parent_user_id: userId,
                })
                .eq("id", playerId);

            if (parentLinkError) {
              return json(
                {
                  ok: false,
                  error:
                    `Could not link parent to child: ${parentLinkError.message}`,
                },
                500,
              );
            }
          }
        }
        // ----------------------------------------------------
        // Club Staff / Cup Helper
        //
        // These are valid invitation identities, but they do
        // not use team_staff because that table intentionally
        // only permits club_admin / lead_coach / coach_mentor.
        // Their dedicated capability records will be added
        // when those UI roles are enabled.
        // ----------------------------------------------------

        if (
          invitation.invite_type === "club_staff" ||
          invitation.invite_type === "cup_helper"
        ) {
          const desiredRole =
            invitation.invite_type === "club_staff"
              ? "club_staff"
              : "cup_helper";

          const { data: existingRole } =
            await ctx.supabaseAdmin
              .from("user_roles")
              .select("id, role")
              .eq("user_email", userEmail)
              .order("created_at", { ascending: true })
              .limit(1)
              .maybeSingle();

          if (!existingRole) {
            const { error: roleInsertError } =
              await ctx.supabaseAdmin
                .from("user_roles")
                .insert({
                  user_email: userEmail,
                  role: desiredRole,
                });

            if (roleInsertError) {
              return json(
                {
                  ok: false,
                  error:
                    `Could not activate account role: ${roleInsertError.message}`,
                },
                500,
              );
            }
          }
        }

        // ----------------------------------------------------
        // Mark accepted LAST.
        //
        // Everything above is written idempotently so a retry
        // is safe if the browser/network fails before here.
        // ----------------------------------------------------

        const acceptedAt = new Date().toISOString();

        const { error: finaliseError } =
          await ctx.supabaseAdmin
            .from("spraoi_invitations")
            .update({
              status: "accepted",
              accepted_at: acceptedAt,
              accepted_by: userId,
            })
            .eq("id", invitation.id)
            .eq("status", "pending");

        if (finaliseError) {
          return json(
            {
              ok: false,
              error:
                `Could not finalise invitation: ${finaliseError.message}`,
            },
            500,
          );
        }

        return json({
          ok: true,
          invitationId: invitation.id,
          inviteType: invitation.invite_type,
          role: invitation.role,
          clubId: invitation.club_id,
          teamIds,
          childIds,
          acceptedAt,
          message: "Welcome to Spraoi Sports.",
        });
      } catch (error) {
        console.error("accept-spraoi-invite failed", error);

        return json(
          {
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : "Unexpected invitation acceptance error.",
          },
          500,
        );
      }
    },
  ),
};
