# DUFFERS SIGN-UP APP — MEMORY
last updated: 2026-09-16
This file is the handoff for the Duffers corndog booth sign-up app. Read it first in any session that touches
`C:\Jarvis\deploy\duffers-signup`. It is NOT part of JARVIS/VendFlow — keep it out of `Cluade JSON\`.

## 1. What it is
A single-page, mobile-first, real-time sign-up sheet that replaces the Excel-style paper sheet the South
Plains Duffers (Branden's Shriners group, Khiva Lubbock) use for the corndog booth at the South Plains Fair.
Anyone with the lodge code can sign up, see everyone's sign-ups live, leave notes, save shifts to their
calendar, and print a sheet that looks like the 2025 Excel original. Admin (code) loads names, sets
headcounts, enters daily deposits, and locks the sheet.

- **Live URL:** https://duffers-signup-app.vercel.app
- **Lodge code:** 0841 · **Admin code:** 0399 (both are soft gates in page source — not security, just a door)
- **Source on disk:** `C:\Jarvis\deploy\duffers-signup\` (`index.html`, `api\cal.js`, `firestore.rules`, `SETUP.md`, `vercel.json`)
- **Git:** `github.com/Arms341/duffers-signup` (private). Vercel project `duffers-signup-app` auto-deploys on push.
  Deploy = `cd C:\Jarvis\deploy\duffers-signup; git add -A; git commit -m "..."; git push`
- **Stale Vercel projects to delete:** `duffers-signup`, `duffers-signup1` (folder uploads, old code).
- **Firebase project:** `duffers-signup` — Firestore + Anonymous Auth. Web config (public by design):
  apiKey `AIzaSyBrp5AceFhQx6UicUYyQ5dSQ9MUPTeZ9_8`, projectId `duffers-signup`, appId `1:637713852918:web:f497bd898c7ebb56063fd7`.
- **Stack:** vanilla JS in one `index.html`, Firebase compat SDK 10.12.2, Firestore `onSnapshot` realtime
  (other phones update in ~1 s). One Vercel serverless function for the calendar feed. No build step.

## 2. Fair dates and the schedule shape
- The booth runs **10 days, Thursday → Saturday**, around the last week of September. 2025: Sept 18–27.
  **2026: Sept 24 – Oct 3** (the printed 2026 paper sheet said Sept 19–28 and was hand-corrected +5 days).
- Default date rule in code = last Thursday of September; that is wrong some years, so admin has
  **"Set opening Thursday"** which stores `startDate` on the year doc and rebuilds the days. 2026 is set.
- Shift template: opening Thursday 7:00 PM–Close (+ a separate **"Non-Theta Volunteers - If Needed"** block,
  free-typed names, 4 lines); Fri 9:30–2 / 2–5 / 5–Close; Sat & Sun 9:30–3 / 3–7 / 7–Close; Mon–Thu 9:30–2 / 5–Close.
  "Close" = 11 PM for calendar purposes.
- **Headcounts (per Branden):** every lunch 4, every evening/Close 5, midday 4, except Fri 25 2–5 = 3,
  Fri Oct 2 2–5 = 3, Sat 26 3–7 = 5, Sun 27 3–7 = 5. Encoded as `DEFAULT_NEEDS` + `DEFAULT_SLOT_NEEDS`
  (keys like `"1|2:00 PM–5:00 PM":3` = day index | time label). Admin can tap any count to override one slot,
  or "Set people needed per shift" for the types. Open slots show as blank yellow lines so it looks like the paper.
- Names pre-loaded from the 2026 paper sheet via admin "Load 2026 paper sheet" (one-time). Crew on the sheet:
  Turner, JS, Tony, Nate, Paden Watson, Matt, Clay, Garland T, Branden, and others.
- Branden's own 2026 shifts (6) are on his Outlook `analysis@` calendar.

## 3. Money
- Green **+** on each day = admin enters that day's deposit. Totals table shows this year vs last year with
  **percentages** (not dollar deltas) and a running total.
- **2025 nightly totals** (loaded into `sheets/2025.totals`; carry-forward reads `sheets/{YEAR-1}`):
  9302, 6137, 10711, 11557, 4990, 8857, 6240, 12314, 13116, 12703 — sum 95,927. Scott Blount's GroupMe
  wrap-up said $95,672. These came from GroupMe photos of the nightly "Daily Cash Count" sheets (with
  Scott's corrections), **not bank records** — the page carries a disclaimer under the totals saying so.
- GroupMe: "Khiva Lubbock Duffers" group id 27169087. Scott Blount = cash/deposits, Jeremy Jones = schedule.

## 4. Firestore layout and rules
- `sheets/{year}` doc: `{locked, needs, totals, startDate}` (rules: keys hasOnly those four; published 09-15).
  Rules do NOT deploy with git push — any change to `firestore.rules` has to be pasted into Firebase console →
  Firestore → Rules → Publish.
- `sheets/{year}/signups/{id}`: `{slot, name, device, uid, ts}` — create needs uid match, name ≤40, not locked;
  delete by any signed-in user; no update.
- `sheets/{year}/notes/{id}`: `{slot, name, text(≤140), device, uid, ts}`.
- `slotId(dayKey, shift)` = `YYYY-MM-DD_9:30AM-2:00PM` with spaces/colons stripped, `_vol` suffix for the
  volunteer block. Calendar UIDs are `${slotId}-${name}@duffers-signup`, so re-adding does not duplicate.

## 5. Features shipped (in order they were asked for)
notes per shift · green + deposit entry · last year vs this year as % · lodge/admin codes · pre-loaded paper
names · admin types straight onto a yellow line (replaced "add someone else") · larger phone fonts, bold names ·
blank yellow lines hold open slots · exact headcounts · 2025 totals loader · Set opening Thursday · **Print**
button at top, anyone logged in can print, sheet matches the 2025 Excel (orange italic date bars, grey shift
bars, #fff45c yellow lines, dark grey #595959 closed-time filler on Mon–Thu, one landscape page, no timestamp,
"Sign up online: duffers-signup-app.vercel.app" footer, closing shifts aligned across both rows) · Non-Theta
Volunteers - If Needed block on opening Thursday · hardened lodge gate (whole page hidden until code; Escape /
in-app browsers can't skip it) · header scrolls away on phones · **Save My Shifts To My Calendar** · reworded
name instructions · totals disclaimer · "Running late? Add a note" tip.

## 6. Calendar
- Button opens a dialog: iPhone → `webcal://` subscribe to `api/cal?name=...` (live, updates hourly);
  Android → downloads an `.ics`; Google Calendar on a computer → copies the feed link with
  Settings → Add calendar → From URL instructions. Client-side `buildIcs()` also exists.
- `api/cal.js` signs in anonymously via the identitytoolkit REST API, reads Firestore REST, emits ICS with a
  VTIMEZONE for America/Chicago and a 2-hour alarm. Verified live returning Branden's 6 shifts.
- **Name matching is exact (case-insensitive).** The page tells people to type their name exactly as it
  already appears on the sheet, or the calendar / shift count won't find them.
- Known limits: classic Outlook with a Gmail IMAP account can't add a URL calendar (not our bug); Google
  Calendar on iPhone must be subscribed via Google on a computer, then it shows on the phone.

## 7. Things that bit us (don't repeat)
- Uploading the folder to Vercel makes a new project every time with stale code → use the git repo.
- `meta.needs` initialised to `DEFAULT_NEEDS` silently shadowed the per-slot defaults → init to `{}`.
- `set(..., {merge:false})` on the year doc wiped totals → always `merge:true`.
- Print colours need `print-color-adjust: exact`; two pages fixed by 16px lines + 7.7in max-height.
- Google `?cid=` subscribe URL does not work for feeds; the iPhone UA on the Android button downloaded a file.
- Matt "got in without the code": he was already past it in an in-app browser / his code prompt showed on his
  iPad through iMessage sync. The code is static; the gate is now the full page.
- Ran git in the wrong repo once (`VendFlowPay-UN20`) — added `Claude outputs/` to its `.gitignore`.
- Cowork's `device_bash` was broken this session; edits went through stage/commit of whole files.

## 8. Open / to do
- ~~Re-publish `firestore.rules`~~ — confirmed 09-16 the published rules (09-15 3:34 PM) already include `startDate`.
- Branden: delete the two stale Vercel projects.
- Send the link + codes to the Duffers GroupMe once he's happy.
- After the fair: enter the 2026 deposits nightly via the green +; next year "Set opening Thursday" and
  reload names — 2026 totals become "last year" automatically.
