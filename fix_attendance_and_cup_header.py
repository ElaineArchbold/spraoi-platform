from pathlib import Path
import re

# ============================================================
# 1. COACH ATTENDANCE ICON
# Remove external SVG dependency entirely.
# ============================================================

path = Path(r"apps/coach/src/App.jsx")
text = path.read_text(encoding="utf-8")

pattern = re.compile(
    r'''  if \(key\.includes\("attendance"\)\) \{
    return \(
      <img
        src="/icons/coach/coach-attendance\.svg"
        alt=""
        aria-hidden="true"
        style=\{\{
          width: size,
          height: size,
          objectFit: "contain",
          display: "block",
        \}\}
      />
    \);
  \}

''',
    re.S
)

# There are currently two duplicate attendance blocks.
text, count = pattern.subn("", text)

print(f"Removed {count} old Attendance image block(s)")

anchor = '''  const common = { width:size, height:size, viewBox:"0 0 24 24", fill:"none", stroke:"currentColor", strokeWidth:1.9, strokeLinecap:"round", strokeLinejoin:"round", "aria-hidden":true };
  let shape;
'''

replacement = '''  const common = { width:size, height:size, viewBox:"0 0 24 24", fill:"none", stroke:"currentColor", strokeWidth:1.9, strokeLinecap:"round", strokeLinejoin:"round", "aria-hidden":true };
  let shape;

  if (key.includes("attendance")) {
    shape = (
      <>
        <rect
          x="5"
          y="4"
          width="14"
          height="17"
          rx="2"
        />
        <path d="M9 4V2.8h6V4" />
        <path d="m8.5 9 1.4 1.4L12 8.3" />
        <path d="M13.5 9.5H16" />
        <path d="m8.5 14 1.4 1.4 2.1-2.1" />
        <path d="M13.5 14.5H16" />
      </>
    );
  }
'''

if anchor not in text:
    raise SystemExit(
        "ERROR: SpraoiNavIcon common block not found"
    )

text = text.replace(
    anchor,
    replacement,
    1
)

# Change the following dashboard IF into ELSE IF so Attendance
# does not get overwritten.
text = text.replace(
    '''  if (key.includes("dashboard")) shape=''', 
    '''  else if (key.includes("dashboard")) shape=''', 
    1
)

path.write_text(text, encoding="utf-8")

print("SUCCESS: Attendance icon is now inline SVG")


# ============================================================
# 2. COACH SECONDARY SIDEBAR
# Make Attendance explicitly use SpraoiNavIcon rather than img.
# ============================================================

path = Path(r"apps/coach/src/App.jsx")
text = path.read_text(encoding="utf-8")

old = '''function SecondarySidebarIcon({ moduleKey, id }) {
  return (
    <img
      className="spraoi-secondary-nav-icon"
      src={secondaryNavAsset(moduleKey, id)}
      alt=""
      aria-hidden="true"
    />
  );
}'''

new = '''function SecondarySidebarIcon({ moduleKey, id }) {
  if (
    moduleKey === "coach" &&
    id === "coach-attendance"
  ) {
    return (
      <span
        className="spraoi-secondary-nav-icon"
        style={{
          display: "grid",
          placeItems: "center",
          color: "#7C3AED"
        }}
      >
        <SpraoiNavIcon
          name="attendance"
          size={25}
        />
      </span>
    );
  }

  return (
    <img
      className="spraoi-secondary-nav-icon"
      src={secondaryNavAsset(moduleKey, id)}
      alt=""
      aria-hidden="true"
    />
  );
}'''

if old not in text:
    raise SystemExit(
        "ERROR: SecondarySidebarIcon block not found"
    )

text = text.replace(old, new, 1)

path.write_text(text, encoding="utf-8")

print("SUCCESS: Attendance sidebar cannot 404 anymore")


# ============================================================
# 3. STANDARDISE CUP TOP HEADER
# Keep Cup gold accent for actions/icons, but use the shared
# white SaaS header used by the other modules.
# ============================================================

path = Path(r"apps/cup/src/App.jsx")
text = path.read_text(encoding="utf-8")

old = '''    <div className="spraoi-page-header" style={{ height: 118, minHeight: 118, boxSizing: "border-box", padding: "20px 28px", background, borderBottom: `1px solid ${module.color}28`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>'''

new = '''    <div
      className="spraoi-page-header"
      style={{
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16
      }}
    >'''

if old not in text:
    raise SystemExit(
        "ERROR: Cup header container not found"
    )

text = text.replace(old, new, 1)

# Remove Cup-specific title colouring.
old = '''<div className="spraoi-page-header-title" style={{ fontFamily: F.display, fontSize: 24, fontWeight: 800, color: isConnect ? "#332800" : P.ink, lineHeight: 1.1 }}>{title}</div>'''

new = '''<div className="spraoi-page-header-title">{title}</div>'''

if old in text:
    text = text.replace(old, new, 1)

# Standardise subtitle too.
old = '''{sub && <div className="spraoi-page-header-sub" style={{ fontFamily: F.body, fontSize: 12, color: isConnect ? "rgba(51,40,0,.72)" : P.muted, marginTop: 6 }}>{sub}</div>}'''

new = '''{sub && (
            <div
              className="spraoi-page-header-sub"
              style={{ marginTop: 5 }}
            >
              {sub}
            </div>
          )}'''

if old in text:
    text = text.replace(old, new, 1)

path.write_text(text, encoding="utf-8")

print("SUCCESS: Cup header now uses shared Admin styling")

print("")
print("ALL PATCHES APPLIED")
