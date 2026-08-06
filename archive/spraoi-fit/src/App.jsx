import { useEffect, useState } from "react";

const OLD_APP_KEY = "2014-boys"; // change per old app: 2014-boys, 2015-girls, 2017-boys, 2017-girls
const NEW_APP_URL = `https://fingallians-shared-platform.vercel.app/?mode=signup&from_app=${OLD_APP_KEY}`;
const LOGO = "/favicon.png";

export default function App() {
  const [seconds, setSeconds] = useState(8);

  function continueToNewApp() {
    window.location.replace(NEW_APP_URL);
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          clearInterval(timer);
          window.location.replace(NEW_APP_URL);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg,#7A0017 0%,#99001D 40%,#54000F 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        fontFamily:
          "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 680,
          background: "#ffffff",
          borderRadius: 28,
          padding: 36,
          textAlign: "center",
          border: "5px solid #D4AF37",
          boxShadow: "0 25px 70px rgba(0,0,0,.35)",
        }}
      >
        <img
          src={LOGO}
          alt="Fingallians Summer Fitness Challenge"
          style={{
            width: 220,
            maxWidth: "80%",
            marginBottom: 18,
          }}
        />

        <h1
          style={{
            margin: 0,
            color: "#9B001C",
            fontSize: 36,
            fontWeight: 900,
          }}
        >
          We’ve Updated the App!
        </h1>

        <p
          style={{
            fontSize: 20,
            color: "#444",
            lineHeight: 1.55,
            marginTop: 18,
          }}
        >
          The Fingallians Fitness Challenge has moved to one shared app.
        </p>

        <div
          style={{
            marginTop: 26,
            marginBottom: 26,
            background: "#FFF8EF",
            border: "2px solid #D4AF37",
            borderRadius: 18,
            padding: 24,
            textAlign: "left",
          }}
        >
          <p style={{ margin: "12px 0", fontSize: 18, fontWeight: 800 }}>
            👉 On the next screen:
          </p>

          <p style={{ margin: "12px 0", fontSize: 17 }}>
            1. Enter the <strong>same email address</strong> you used before.
          </p>

          <p style={{ margin: "12px 0", fontSize: 17 }}>
            2. Add a <strong>new password</strong>.
          </p>

          <p style={{ margin: "12px 0", fontSize: 17 }}>
            3. Click <strong>Create Password / Continue</strong>.
          </p>

          <p style={{ margin: "12px 0", fontSize: 17 }}>
            ✅ Your children, progress, runs, XP and badges should still be there.
          </p>
        </div>

        <button
          onClick={continueToNewApp}
          style={{
            width: "100%",
            padding: "18px",
            borderRadius: 16,
            border: "none",
            background: "#B30024",
            color: "#fff",
            fontSize: 22,
            fontWeight: 900,
            cursor: "pointer",
            boxShadow: "0 10px 30px rgba(179,0,36,.35)",
          }}
        >
          Continue and Add Password →
        </button>

        <p
          style={{
            marginTop: 20,
            color: "#666",
            fontSize: 15,
          }}
        >
          Redirecting automatically in{" "}
          <strong>{seconds}</strong> second{seconds === 1 ? "" : "s"}...
        </p>
      </div>
    </div>
  );
}