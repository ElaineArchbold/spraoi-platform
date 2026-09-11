import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { supabase } from "./supabaseClient";

const CARD = {
  surface: "#ffffff",
  border: "#d6e8f5",
  text: "#1a2a3a",
  muted: "#5a7a8f",
  primary: "#2563EB",
};

function base64UrlToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const raw = window.atob(base64);
  return Uint8Array.from(
    [...raw].map((character) => character.charCodeAt(0))
  );
}

function keyToBase64Url(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return window
    .btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function getSubscription() {
  if (!("serviceWorker" in navigator)) return null;

  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}
function isInstalledApp() {
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true
  );
}

async function saveSubscription(subscription, userId) {
  const json = subscription?.toJSON?.() || {};
  const p256dhBuffer = subscription?.getKey?.("p256dh");
  const authBuffer = subscription?.getKey?.("auth");

  const p256dh =
    json.keys?.p256dh ||
    (p256dhBuffer ? keyToBase64Url(p256dhBuffer) : "");

  const authKey =
    json.keys?.auth ||
    (authBuffer ? keyToBase64Url(authBuffer) : "");

  if (!subscription?.endpoint || !p256dh || !authKey) {
    throw new Error("Incomplete push subscription on this device.");
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh,
        auth_key: authKey,
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );

  if (error) throw error;
}

export default function PushNotificationsCard({ userId }) {
  const [state, setState] = useState("checking");
  const [message, setMessage] = useState("");
  const [testing, setTesting] = useState(false);
  const installed = isInstalledApp();

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!supported) {
        if (!cancelled) setState("unsupported");
        return;
      }

      try {
        const subscription = await getSubscription();

        if (
          subscription &&
          userId &&
          Notification.permission === "granted"
        ) {
          try {
            await saveSubscription(subscription, userId);
          } catch (syncError) {
            console.error("Push subscription sync failed:", syncError);
          }
        }

        if (!cancelled) {
          setState(subscription ? "enabled" : "disabled");

          if (subscription && installed) {
            setMessage(
              "Notifications are enabled for the installed Spraoi app on this device."
            );
          }
        }
      } catch (error) {
        console.error("Push subscription check failed:", error);
        if (!cancelled) {
          setState("disabled");
          setMessage("Could not check notification status.");
        }
      }
    }

    check();

    return () => {
      cancelled = true;
    };
  }, [supported, userId]);

  async function enablePush() {
    if (!supported || !userId) return;

    setMessage("");

    const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

    if (!publicKey) {
      setMessage(
        "Push notifications are not configured on this environment yet."
      );
      return;
    }

    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setState("blocked");
        setMessage(
          "Notifications are blocked. Enable them in your browser or device settings."
        );
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      let subscription =
        await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription =
          await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey:
              base64UrlToUint8Array(publicKey),
          });
      }

      await saveSubscription(subscription, userId);

      setState("enabled");
      setMessage(
        "Push notifications are enabled on this device."
      );
    } catch (error) {
      console.error("Enable push failed:", error);
      setState("disabled");
      setMessage(
        `Could not enable notifications: ${error.message}`
      );
    }
  }

  async function disablePush() {
    if (!userId) return;

    setMessage("");

    try {
      const subscription = await getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;

        await subscription.unsubscribe();

        const { error } = await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", endpoint)
          .eq("user_id", userId);

        if (error) throw error;
      }

      setState("disabled");
      setMessage(
        "Push notifications are disabled on this device."
      );
    } catch (error) {
      console.error("Disable push failed:", error);
      setMessage(
        `Could not disable notifications: ${error.message}`
      );
    }
  }
  async function sendTestPush() {
    if (!userId) return;

    setTesting(true);
    setMessage("");

    try {
      const { data, error } = await supabase.functions.invoke(
        "send-spraoi-push",
        {
          body: {
            title: "Spraoi test",
            body: "Push notifications are working on this installed app.",
            url: "https://app.spraoisports.com/",
            tag: "spraoi-installed-test",
          },
        }
      );

      if (error) throw error;

      if (!data?.ok || !data?.sent) {
        throw new Error(
          data?.error || "No active subscription received the test."
        );
      }

      setMessage(
        "Test notification sent. You should receive it on this device now."
      );
    } catch (error) {
      console.error("Test push failed:", error);
      setMessage(
        `Could not send test notification: ${error.message}`
      );
    } finally {
      setTesting(false);
    }
  }

  const enabled = state === "enabled";

  return (
    <div
      style={{
        background: CARD.surface,
        borderRadius: 16,
        padding: 18,
        border: `1px solid ${CARD.border}`,
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            background: enabled
              ? "#eff6ff"
              : "#f8fafc",
            color: enabled
              ? CARD.primary
              : CARD.muted,
            flexShrink: 0,
          }}
        >
          {enabled
            ? <Bell size={21} />
            : <BellOff size={21} />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'League Spartan',sans-serif",
              fontWeight: 800,
              fontSize: 16,
              color: CARD.text,
            }}
          >
            Push notifications
          </div>

          <div
            style={{
              fontSize: 13,
              color: CARD.muted,
              lineHeight: 1.5,
              marginTop: 4,
            }}
          >
            Get team messages, event invites, reminders
            and cancellations on this device.
          </div>
        </div>
      </div>

      {!supported ? (
        <div
          style={{
            marginTop: 12,
            fontSize: 13,
            lineHeight: 1.5,
            color: CARD.muted,
          }}
        >
          Push notifications are not supported in this
          browser. On iPhone, install Spraoi to the Home
          Screen and open it from there.
        </div>
      ) : (
        <button
          type="button"
          onClick={
            enabled
              ? disablePush
              : enablePush
          }
          disabled={state === "checking"}
          style={{
            width: "100%",
            marginTop: 14,
            boxSizing: "border-box",
            padding: "12px 14px",
            borderRadius: 12,
            border: enabled
              ? `1px solid ${CARD.border}`
              : 0,
            background: enabled
              ? "#fff"
              : CARD.primary,
            color: enabled
              ? CARD.text
              : "#fff",
            fontFamily: "'League Spartan',sans-serif",
            fontWeight: 800,
            fontSize: 14,
            cursor:
              state === "checking"
                ? "default"
                : "pointer",
            opacity:
              state === "checking"
                ? 0.65
                : 1,
          }}
        >
          {state === "checking"
            ? "Checking..."
            : enabled
              ? "Disable notifications"
              : "Enable notifications"}
        </button>
      )}
      {enabled && (
        <button
          type="button"
          onClick={sendTestPush}
          disabled={testing}
          style={{
            width: "100%",
            marginTop: 10,
            padding: "12px 14px",
            borderRadius: 12,
            border: `1px solid ${CARD.border}`,
            background: "#eff6ff",
            color: CARD.primary,
            fontFamily: "'League Spartan',sans-serif",
            fontWeight: 800,
            fontSize: 14,
            cursor: testing ? "default" : "pointer",
            opacity: testing ? 0.65 : 1,
          }}
        >
          {testing ? "Sending test..." : "Send test notification"}
        </button>
      )}

      {message && (
        <div
          style={{
            marginTop: 10,
            padding: "10px 12px",
            borderRadius: 10,
            background: "#f8fafc",
            color: CARD.text,
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}
