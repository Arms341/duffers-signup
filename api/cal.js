// Live calendar feed: GET /api/cal?name=Paden%20Watson[&year=2026]
// Serves that person's shifts as an iCalendar the phone SUBSCRIBES to, so it updates itself.
// Reads Firestore through the public REST API with an anonymous sign-in (same access the page has).
// No secrets: the Firebase web API key is public by design and the rules only allow reads.

const PROJECT = "duffers-signup";
const API_KEY = "AIzaSyBrp5AceFhQx6UicUYyQ5dSQ9MUPTeZ9_8";
const SITE_URL = "duffers-signup-app.vercel.app";
const CLOSE_HOUR = 23;

// Mirror of the page's template + headcounts (only the times matter here).
const TEMPLATE = {
  opening:  [["7:00 PM", "Close"], ["7:00 PM", "Close", { key: "vol", title: "Non-Theta Volunteers - If Needed" }]],
  friday:   [["9:30 AM", "2:00 PM"], ["2:00 PM", "5:00 PM"], ["5:00 PM", "Close"]],
  saturday: [["9:30 AM", "3:00 PM"], ["3:00 PM", "7:00 PM"], ["7:00 PM", "Close"]],
  sunday:   [["9:30 AM", "3:00 PM"], ["3:00 PM", "7:00 PM"], ["7:00 PM", "Close"]],
  weekday:  [["9:30 AM", "2:00 PM"], ["5:00 PM", "Close"]],
};
function fairStart(year) { const d = new Date(year, 8, 30); while (d.getDay() !== 4) d.setDate(d.getDate() - 1); return d; }
function buildDays(year, startDate) {
  let start = fairStart(year);
  if (startDate) { const [y, m, d] = startDate.split("-").map(Number); start = new Date(y, m - 1, d); }
  const days = [];
  for (let i = 0; i < 10; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const dow = d.getDay();
    const shifts = i === 0 ? TEMPLATE.opening : dow === 5 ? TEMPLATE.friday : dow === 6 ? TEMPLATE.saturday : dow === 0 ? TEMPLATE.sunday : TEMPLATE.weekday;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    days.push({ date: d, key, shifts });
  }
  return days;
}
function slotId(dayKey, s) { return (`${dayKey}_${s[0]}-${s[1]}` + (s[2]?.key ? "_" + s[2].key : "")).replace(/[\s:]/g, ""); }
function to24(t) { const m = /(\d+):(\d+) (AM|PM)/.exec(t); if (!m) return null; let h = +m[1] % 12; if (m[3] === "PM") h += 12; return [h, +m[2]]; }
function stamp(d, h, mi) { const p = n => String(n).padStart(2, "0"); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(h)}${p(mi)}00`; }
function esc(s) { return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); }

async function anonToken() {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ returnSecureToken: true }) });
  if (!r.ok) throw new Error("auth " + r.status);
  return (await r.json()).idToken;
}
async function fsGet(path, token) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${path}?pageSize=1000`,
    { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("firestore " + r.status);
  return r.json();
}
const fv = v => v?.stringValue ?? v?.integerValue ?? v?.doubleValue ?? v?.booleanValue ?? null;

module.exports = async (req, res) => {
  const name = String(req.query.name || "").trim();
  const now = new Date();
  const year = +(req.query.year || (now > new Date(fairStart(now.getFullYear()).getTime() + 24 * 864e5) ? now.getFullYear() + 1 : now.getFullYear()));
  if (!name) { res.status(400).send("name required"); return; }
  try {
    const token = await anonToken();
    const [sheet, signupsDoc] = await Promise.all([fsGet(`sheets/${year}`, token), fsGet(`sheets/${year}/signups`, token)]);
    const startDate = sheet?.fields?.startDate?.stringValue;
    const DAYS = buildDays(year, startDate);
    const signups = (signupsDoc?.documents || []).map(d => ({ slot: fv(d.fields.slot), name: fv(d.fields.name) }));
    const lower = name.toLowerCase();
    const events = [];
    for (const day of DAYS) for (const s of day.shifts) {
      const id = slotId(day.key, s);
      if (!signups.some(x => x.slot === id && (x.name || "").toLowerCase() === lower)) continue;
      const st = to24(s[0]) || [9, 30], en = s[1] === "Close" ? [CLOSE_HOUR, 0] : (to24(s[1]) || [23, 0]);
      const others = signups.filter(x => x.slot === id && (x.name || "").toLowerCase() !== lower).map(x => x.name).join(", ");
      events.push([
        "BEGIN:VEVENT",
        `UID:${id}-${name.replace(/\W+/g, "")}@duffers-signup`,
        `DTSTAMP:${stamp(now, now.getUTCHours(), now.getUTCMinutes())}Z`,
        `DTSTART;TZID=America/Chicago:${stamp(day.date, st[0], st[1])}`,
        `DTEND;TZID=America/Chicago:${stamp(day.date, en[0], en[1])}`,
        `SUMMARY:${esc("Duffers Corndog Booth — " + (s[2]?.title ? s[2].title + " " : "") + s[0] + " to " + s[1])}`,
        "LOCATION:South Plains Fair — Duffers Corndog Booth",
        `DESCRIPTION:${esc("Working with: " + (others || "(nobody else yet)") + "\nLive sheet: https://" + SITE_URL)}`,
        "BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", "DESCRIPTION:Corndog booth shift in 2 hours", "END:VALARM",
        "END:VEVENT",
      ].join("\r\n"));
    }
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Duffers//Corndog Booth//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      `X-WR-CALNAME:${esc("Duffers Corndog Booth — " + name)}`, "X-WR-TIMEZONE:America/Chicago", "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H",
      "BEGIN:VTIMEZONE", "TZID:America/Chicago",
      "BEGIN:STANDARD", "DTSTART:19701101T020000", "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU", "TZOFFSETFROM:-0500", "TZOFFSETTO:-0600", "END:STANDARD",
      "BEGIN:DAYLIGHT", "DTSTART:19700308T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU", "TZOFFSETFROM:-0600", "TZOFFSETTO:-0500", "END:DAYLIGHT",
      "END:VTIMEZONE", ...events, "END:VCALENDAR"].join("\r\n") + "\r\n";
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.status(200).send(ics);
  } catch (e) {
    res.status(500).send("calendar unavailable: " + e.message);
  }
};
