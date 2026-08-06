import React, { useState } from "react"
import spraioIcon from "./imports/spraoi-icon.png"
import { ICON_GROUPS, IconSearch, IconX, IconBell, type IconProps } from "./Icons"

const F = {
  display: { fontFamily: "'Nunito', system-ui, sans-serif" },
  body: { fontFamily: "'Work Sans', system-ui, sans-serif" },
  mono: { fontFamily: "'JetBrains Mono', monospace" },
}

const SIZES = [16, 20, 24, 32, 40]

const MODULE_COLORS: Record<string, string> = {
  Club: "#d32f2f",
  Coach: "#8e24aa",
  Journey: "#0277bd",
  Challenge: "#2e7d32",
  Blitz: "#e65100",
  Connect: "#fbc02d",
}

export default function IconShowcase() {
  const [query, setQuery] = useState("")
  const [activeSize, setActiveSize] = useState(24)
  const [activeStroke, setActiveStroke] = useState(1.75)
  const [copied, setCopied] = useState<string | null>(null)

  const q = query.trim().toLowerCase()

  const filtered = ICON_GROUPS
    .map((g) => ({
      ...g,
      icons: g.icons.filter(
        (i) => i.name.toLowerCase().includes(q) || g.label.toLowerCase().includes(q)
      ),
    }))
    .filter((g) => g.icons.length > 0)

  function copy(name: string) {
    const exportName = "Icon" + name.replace(/[^a-zA-Z]/g, "")
    navigator.clipboard.writeText(`<${exportName} size={${activeSize}} />`)
    setCopied(exportName)
    setTimeout(() => setCopied(null), 1800)
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f6f9fc", ...F.body }}>

      {/* ── Header ── */}
      <header
        style={{
          background: "#0b2545",
          padding: "0 32px",
          height: 64,
          display: "flex",
          alignItems: "center",
          gap: 16,
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 2px 12px rgba(0,0,0,.18)",
        }}
      >
        <img
          src={spraioIcon}
          alt="Spraoi Sports"
          style={{ width: 40, height: 40, objectFit: "contain", flexShrink: 0 }}
        />
        <div>
          <div
            style={{
              ...F.display,
              fontSize: 18,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              whiteSpace: "nowrap",
            }}
          >
            Spraoi Sports
          </div>
          <div
            style={{
              ...F.body,
              fontSize: 10,
              color: "rgba(255,255,255,.4)",
              marginTop: 2,
              whiteSpace: "nowrap",
            }}
          >
            Icon Library
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Search */}
        <div style={{ position: "relative", width: 280 }}>
          <IconSearch
            size={16}
            color="rgba(255,255,255,.5)"
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search icons…"
            style={{
              width: "100%",
              background: "rgba(255,255,255,.1)",
              border: "1px solid rgba(255,255,255,.15)",
              borderRadius: 8,
              padding: "8px 12px 8px 36px",
              color: "#fff",
              fontSize: 13,
              ...F.body,
              outline: "none",
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "rgba(255,255,255,.5)",
                padding: 2,
                display: "flex",
              }}
            >
              <IconX size={14} />
            </button>
          )}
        </div>
      </header>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 32px 80px" }}>

        {/* ── Controls ── */}
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: "20px 24px",
            marginBottom: 32,
            display: "flex",
            alignItems: "center",
            gap: 32,
            boxShadow: "0 2px 8px rgba(0,0,0,.06)",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#627187", letterSpacing: "0.08em", marginBottom: 8, ...F.mono }}>
              SIZE
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveSize(s)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 6,
                    border: activeSize === s ? "none" : "1px solid #dfe7ef",
                    background: activeSize === s ? "#0b2545" : "#fff",
                    color: activeSize === s ? "#fff" : "#4a5e78",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    ...F.mono,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#627187", letterSpacing: "0.08em", marginBottom: 8, ...F.mono }}>
              STROKE WEIGHT
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {[1.25, 1.5, 1.75, 2, 2.25].map((w) => (
                <button
                  key={w}
                  onClick={() => setActiveStroke(w)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 6,
                    border: activeStroke === w ? "none" : "1px solid #dfe7ef",
                    background: activeStroke === w ? "#0b2545" : "#fff",
                    color: activeStroke === w ? "#fff" : "#4a5e78",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    ...F.mono,
                  }}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                background: "#f6f9fc",
                border: "1px solid #dfe7ef",
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 12,
                color: "#4a5e78",
                ...F.mono,
              }}
            >
              {"import { IconName } from './Icons'"}
            </div>
            <div
              style={{
                background: copied ? "#e8f5e9" : "#f6f9fc",
                border: `1px solid ${copied ? "#a5d6a7" : "#dfe7ef"}`,
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 12,
                color: copied ? "#2e7d32" : "#4a5e78",
                transition: "all .2s",
                ...F.mono,
                minWidth: 180,
              }}
            >
              {copied ? `✓ Copied ${copied}` : "Click any icon to copy"}
            </div>
          </div>
        </div>

        {/* ── Icon groups ── */}
        {filtered.map((group) => (
          <section key={group.label} style={{ marginBottom: 48 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 4, height: 20, borderRadius: 2, background: group.color }} />
              <h2
                style={{
                  ...F.display,
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#0b2545",
                  margin: 0,
                  letterSpacing: "-0.01em",
                }}
              >
                {group.label}
              </h2>
              <span style={{ ...F.mono, fontSize: 11, color: "#8fa0b0", fontWeight: 500 }}>
                {group.icons.length} icons
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                gap: 8,
              }}
            >
              {group.icons.map((icon) => {
                const exportName = "Icon" + icon.name.replace(/[^a-zA-Z]/g, "")
                const isCopied = copied === exportName
                return (
                  <button
                    key={icon.name}
                    onClick={() => copy(icon.name)}
                    title={`Copy <${exportName} />`}
                    style={{
                      background: isCopied ? "#e8f5e9" : "#fff",
                      border: `1.5px solid ${isCopied ? "#a5d6a7" : "#dfe7ef"}`,
                      borderRadius: 10,
                      padding: "16px 8px 12px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                      transition: "all .15s",
                      boxShadow: isCopied ? "0 0 0 2px #a5d6a7" : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!isCopied) {
                        ;(e.currentTarget as HTMLButtonElement).style.borderColor = group.color
                        ;(e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 0 1px ${group.color}20`
                        ;(e.currentTarget as HTMLButtonElement).style.background = `${group.color}06`
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isCopied) {
                        ;(e.currentTarget as HTMLButtonElement).style.borderColor = "#dfe7ef"
                        ;(e.currentTarget as HTMLButtonElement).style.boxShadow = "none"
                        ;(e.currentTarget as HTMLButtonElement).style.background = "#fff"
                      }
                    }}
                  >
                    <icon.component
                      size={activeSize}
                      color={isCopied ? "#2e7d32" : group.color}
                      strokeWidth={activeStroke}
                    />
                    <span
                      style={{
                        ...F.mono,
                        fontSize: 10,
                        color: isCopied ? "#2e7d32" : "#627187",
                        fontWeight: 500,
                        textAlign: "center",
                        lineHeight: 1.3,
                        wordBreak: "break-word",
                      }}
                    >
                      {icon.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#8fa0b0" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
            <div style={{ ...F.display, fontSize: 18, fontWeight: 700, color: "#4a5e78", marginBottom: 8 }}>
              No icons match &ldquo;{query}&rdquo;
            </div>
            <div style={{ ...F.body, fontSize: 14 }}>Try a different search term</div>
          </div>
        )}

        {/* ── Module color swatches ── */}
        <section style={{ marginTop: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ width: 4, height: 20, borderRadius: 2, background: "#0b2545" }} />
            <h2 style={{ ...F.display, fontSize: 16, fontWeight: 800, color: "#0b2545", margin: 0 }}>
              Module Colour Palette
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
            {Object.entries(MODULE_COLORS).map(([mod, color]) => (
              <div
                key={mod}
                style={{
                  background: "#fff",
                  border: "1.5px solid #dfe7ef",
                  borderRadius: 12,
                  padding: "20px 16px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: color + "15",
                    border: `1.5px solid ${color}30`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <IconSearch size={22} color={color} strokeWidth={activeStroke} />
                </div>
                <div>
                  <div style={{ ...F.display, fontSize: 13, fontWeight: 800, color: "#0b2545", textAlign: "center" }}>
                    {mod}
                  </div>
                  <div style={{ ...F.mono, fontSize: 10, color: "#8fa0b0", textAlign: "center", marginTop: 2 }}>
                    {color}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                  {[16, 20, 24].map((s) => (
                    <div
                      key={s}
                      style={{
                        width: s + 12,
                        height: s + 12,
                        borderRadius: 6,
                        background: color + "12",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <IconBell size={s} color={color} strokeWidth={activeStroke} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Usage guide ── */}
        <section style={{ marginTop: 48, background: "#0b2545", borderRadius: 16, padding: "32px 36px" }}>
          <h2 style={{ ...F.display, fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 20px" }}>
            Usage
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { label: "Basic", code: "import { IconBall } from './Icons'\n\n<IconBall />" },
              { label: "Custom size & color", code: "<IconJersey\n  size={32}\n  color=\"#d32f2f\"\n/>" },
              { label: "Stroke weight", code: "<IconPitch\n  size={24}\n  strokeWidth={2.25}\n/>" },
              { label: "With Tailwind", code: "<IconWhistle\n  size={20}\n  className=\"text-green-600\"\n/>" },
            ].map(({ label, code }) => (
              <div
                key={label}
                style={{
                  background: "rgba(255,255,255,.06)",
                  borderRadius: 10,
                  padding: "16px 20px",
                  border: "1px solid rgba(255,255,255,.1)",
                }}
              >
                <div
                  style={{
                    ...F.body,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "rgba(255,255,255,.5)",
                    letterSpacing: "0.07em",
                    marginBottom: 10,
                    textTransform: "uppercase",
                  }}
                >
                  {label}
                </div>
                <pre
                  style={{
                    ...F.mono,
                    fontSize: 12,
                    color: "#93c5fd",
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.7,
                  }}
                >
                  {code}
                </pre>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 20,
              padding: "14px 18px",
              background: "rgba(255,255,255,.06)",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,.1)",
              ...F.body,
              fontSize: 13,
              color: "rgba(255,255,255,.55)",
              lineHeight: 1.6,
            }}
          >
            All icons accept{" "}
            <code style={{ ...F.mono, color: "#93c5fd" }}>size</code>,{" "}
            <code style={{ ...F.mono, color: "#93c5fd" }}>color</code>,{" "}
            <code style={{ ...F.mono, color: "#93c5fd" }}>strokeWidth</code>,{" "}
            <code style={{ ...F.mono, color: "#93c5fd" }}>style</code>, and{" "}
            <code style={{ ...F.mono, color: "#93c5fd" }}>className</code> props.
            Color defaults to{" "}
            <code style={{ ...F.mono, color: "#93c5fd" }}>currentColor</code>{" "}
            — set it via <code style={{ ...F.mono, color: "#93c5fd" }}>color</code> in a parent to inherit.
          </div>
        </section>

      </div>
    </div>
  )
}
