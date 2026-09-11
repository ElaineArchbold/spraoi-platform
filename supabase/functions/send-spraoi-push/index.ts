import { withSupabase } from "npm:@supabase/server";
import webpush from "npm:web-push@3.6.7";

type PushRequest = {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: cors,
  });
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: cors });
    }

    if (req.method !== "POST") {
      return json(
        { ok: false, error: "Method not allowed." },
        405
      );
    }

    try {
      const callerUserId = String(
        ctx.userClaims?.sub || ""
      ).trim();

      if (!callerUserId) {
        return json(
          {
            ok: false,
            error: "Authentication required.",
          },
          401
        );
      }

      const vapidPublicKey =
        Deno.env.get("WEB_PUSH_VAPID_PUBLIC_KEY") || "";

      const vapidPrivateKey =
        Deno.env.get("WEB_PUSH_VAPID_PRIVATE_KEY") || "";

      const vapidSubject =
        Deno.env.get("WEB_PUSH_VAPID_SUBJECT") || "";

      if (
        !vapidPublicKey ||
        !vapidPrivateKey ||
        !vapidSubject
      ) {
        return json(
          {
            ok: false,
            error:
              "Web Push is not configured on the server.",
          },
          503
        );
      }

      const { data: subscriptions, error: subscriptionError } =
        await ctx.supabaseAdmin
          .from("push_subscriptions")
          .select(
            "id, endpoint, p256dh, auth_key"
          )
          .eq("user_id", callerUserId);

      if (subscriptionError) {
        console.error(
          "Unable to load push subscriptions:",
          subscriptionError
        );

        return json(
          {
            ok: false,
            error: subscriptionError.message,
          },
          500
        );
      }

      if (!subscriptions?.length) {
        return json(
          {
            ok: false,
            error:
              "No push-enabled device is registered for this account.",
          },
          404
        );
      }

      const requestBody =
        (await req.json().catch(() => ({}))) as PushRequest;

      const title =
        String(
          requestBody.title ||
            "Spraoi notifications are working"
        ).trim();

      const body =
        String(
          requestBody.body ||
            "You will receive club updates on this device."
        ).trim();

      const url =
        String(
          requestBody.url ||
            "https://app.spraoisports.com/"
        ).trim();

      const tag =
        String(
          requestBody.tag ||
            "spraoi-push-test"
        ).trim();

      webpush.setVapidDetails(
        vapidSubject,
        vapidPublicKey,
        vapidPrivateKey
      );

      const payload = JSON.stringify({
        title,
        body,
        url,
        tag,
      });

      let sent = 0;
      let expired = 0;
      const failures: string[] = [];

      for (const subscription of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth_key,
              },
            },
            payload,
            {
              TTL: 60,
            }
          );

          sent += 1;
        } catch (error) {
          const statusCode =
            typeof error === "object" &&
            error !== null &&
            "statusCode" in error
              ? Number(
                  (error as { statusCode?: number })
                    .statusCode
                )
              : 0;

          if (
            statusCode === 404 ||
            statusCode === 410
          ) {
            expired += 1;

            const { error: cleanupError } =
              await ctx.supabaseAdmin
                .from("push_subscriptions")
                .delete()
                .eq("id", subscription.id)
                .eq("user_id", callerUserId);

            if (cleanupError) {
              console.error(
                "Unable to remove expired push subscription:",
                cleanupError
              );
            }

            continue;
          }

          const message =
            error instanceof Error
              ? error.message
              : "Unknown push delivery error.";

          console.error(
            "Push delivery failed:",
            message
          );

          failures.push(message);
        }
      }

      if (!sent && failures.length) {
        return json(
          {
            ok: false,
            sent,
            expired,
            failed: failures.length,
            error:
              "Push delivery failed for all active subscriptions.",
          },
          502
        );
      }

      return json({
        ok: true,
        sent,
        expired,
        failed: failures.length,
      });
    } catch (error) {
      console.error(
        "Unexpected push error:",
        error
      );

      return json(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Unexpected push error.",
        },
        500
      );
    }
  }),
};
