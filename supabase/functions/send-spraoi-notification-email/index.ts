import { withSupabase } from "npm:@supabase/server";

type NotificationEmailRequest = {
  recipients?: string[];
  subject?: string;
  title?: string;
  message?: string;
  actionUrl?: string;
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: cors });
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (req.method !== "POST") return json({ ok: false, error: "Method not allowed." }, 405);

    try {
      const callerEmail = String(ctx.userClaims?.email || "").trim().toLowerCase();
      if (!callerEmail) return json({ ok: false, error: "Authentication required." }, 401);

      const { data: callerRoles, error: roleError } = await ctx.supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_email", callerEmail);

      if (roleError) {
        console.error("Unable to load caller roles:", roleError);
        return json({ ok: false, error: roleError.message }, 500);
      }

      const roles = (callerRoles || [])
        .map((row) => String(row?.role || "").toLowerCase())
        .filter(Boolean);

      const canSendClubNotifications = roles.some((role) =>
        ["super_admin", "admin", "club_admin"].includes(role)
      );

      if (!canSendClubNotifications) {
        return json({
          ok: false,
          error: "You do not have permission to send club notification emails."
        }, 403);
      }

      const body = (await req.json()) as NotificationEmailRequest;
      const recipients = [...new Set((body.recipients || []).map((x) => String(x || "").trim().toLowerCase()).filter((x) => x.includes("@")))];
      if (!recipients.length) return json({ ok: false, error: "No valid recipients were provided." }, 400);

      const apiKey = Deno.env.get("RESEND_API_KEY") || "";
      const from = Deno.env.get("SPRAOI_EMAIL_FROM") || "";
      if (!apiKey || !from) {
        return json({ ok: false, error: "Email service is not configured. Set RESEND_API_KEY and SPRAOI_EMAIL_FROM in Supabase Edge Function secrets." }, 503);
      }

      const subject = String(body.subject || "Spraoi Sports notification").trim();
      const title = String(body.title || subject).trim();
      const message = String(body.message || "").trim();
      const actionUrl = String(body.actionUrl || "").trim();
      const htmlMessage = escapeHtml(message).replaceAll("\n", "<br />");
      const action = actionUrl
        ? `<div style="margin-top:24px"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#10243e;color:#fff;text-decoration:none;padding:11px 16px;border-radius:10px;font-weight:700">Open Spraoi Sports</a></div>`
        : "";
      const html = `<!doctype html><html><body style="margin:0;background:#f6f9fc;font-family:Arial,sans-serif;color:#13243b"><div style="max-width:620px;margin:0 auto;padding:28px 18px"><div style="background:#fff;border:1px solid #dfe7ef;border-radius:16px;padding:24px"><h2 style="margin:0 0 14px">${escapeHtml(title)}</h2><div style="font-size:14px;line-height:1.65">${htmlMessage}</div>${action}<div style="margin-top:26px;color:#627187;font-size:12px">Spraoi Sports</div></div></div></body></html>`;

      const results = await Promise.all(recipients.map(async (recipient) => {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from, to: [recipient], subject, html }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) return { recipient, ok: false, error: payload?.message || `HTTP ${response.status}` };
        return { recipient, ok: true, id: payload?.id || null };
      }));

      const failures = results.filter((r) => !r.ok);
      if (failures.length) {
        return json({ ok: false, sent: results.length - failures.length, failed: failures.length, error: failures.map((f) => `${f.recipient}: ${f.error}`).join("; ") }, 502);
      }

      return json({ ok: true, sent: results.length });
    } catch (error) {
      return json({ ok: false, error: error instanceof Error ? error.message : "Unexpected email error." }, 500);
    }
  }),
};

