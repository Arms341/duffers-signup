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
- Stale Vercel projects `duffers-signup` and `duffers-signup1` were deleted 09-16; only `duffers-signup-app` remains.
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

- **Daily Cash Count (09-16):** the green + is now the paper "Daily Cash Count" sheet, line for line: worksheet
  by bill (1's…100's as BILL COUNTS × denomination — TWO count columns, one per counter, headed by the
  counters' first names; the two cash piles are split, not double-counted; stored as `split{b:[a,b]}` plus
  summed `counts` → amount per line → line 1 auto-sums and locks), line 2 card sales, line 3 starting bank
  (defaults 2000, remembers last), line 4 total sales = 1+2−3 computed. Two printed names required + two
  finger-signature canvases (blank signature = confirm). Stored on `totals[di]` as
  `{amount(=line 4), cash, card, bank, bills{1..100 $}, counts{1..100 bills}, counters[2], sigs[2 PNG data URLs ~8KB], by, ts}` —
  same year doc, no rules change. Totals table shows "cash · card · counted by A & B"; CSV has the split;
  (Count-sheet Print removed 09-16.) **Share** button (shows once a count is saved) draws a 1080px PNG card — lines 1–4,
  bill counts, both signatures, Square photo — and hands it to the phone share sheet (`navigator.share` with files)
  so it goes straight into GroupMe; computers/unsupported browsers download the PNG + copy the summary text.
  **Square screen photo:** dialog has "Add photo of the Square screen" (camera/file); shrunk to ≤1000px JPEG
  (~50–150 KB) and stored in `sheets/{year}/counts/{di}` = `{photo, by, uid, ts}` — its own doc so the year
  doc stays small; year doc only gets `totals[di].photo = true`. Totals table shows a "📷 Square screen"
  link that fetches on tap. **Needs the `counts` rule pasted into Firebase console.**
  Found while testing: the 09/24/25 paper sheet's worksheet sums to 5,781 but line 1 was written 5,281 —
  the total (6,455) used 5,781. Exactly the arithmetic the app now does.

## 4. Firestore layout and rules
- `sheets/{year}` doc: `{locked, needs, totals, startDate}` (rules: keys hasOnly those four; published 09-15).
  Rules do NOT deploy with git push — any change to `firestore.rules` has to be pasted into Firebase console →
  Firestore → Rules → Publish.
- `sheets/{year}/counts/{di}`: `{photo(string <900KB), by, uid, ts}` — any signed-in user writes/deletes (rule added 09-16, must be published by hand).
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
name instructions · totals disclaimer · "Running late? Add a note" tip · **Daily Cash Count** dialog with signatures + print.

- **09-16 crew-facing adds:** real `manifest.webmanifest` + `icon-192/512.png` + `apple-touch-icon.png` (corndog on
  maroon) and an "Add to home screen" nudge (phones only, hides when installed or after "Not now" →
  `localStorage duffers.a2hs`); **"Your shifts" strip** under the name (chips, tap scrolls to the shift;
  shift divs have `id="slot-<slotId>"`); admin **"Copy open shifts for GroupMe"** → editable text of every
  under-headcount shift + link + lodge code, Copy button.

- **"Right now" card** (dark maroon, top of page, fair days only, refreshes every minute): current shift + names +
  "N open", and Up next; between shifts shows Up next / Then. Tap a row to jump to that shift. Volunteer block excluded.
- **Clear day** button in the count dialog wipes a night (numbers, sigs, photo) after confirm.
- **Home-screen guide** (`guide/ios-1..3.jpg` = Branden's real iPhone screenshots cropped with red circles;
  `guide/and-1..3.jpg` = drawn Android mock-ups): nudge has "Show me how", footer has "📲 Add to home screen";
  dialog with iPhone/Android tabs, auto-picks by user agent.
- Branden said NO "need a sub" feature — don't build one. Also rejected (09-17): "tap your name" chips in the header — built, shown, not deployed, reverted. Also no general-purpose calculator on the count sheet — the two count columns are the calculator.

## 6. Calendar
- Button opens a dialog: iPhone → `webcal://` subscribe to `api/cal?name=...` (live, updates hourly);
  Android → downloads an `.ics`; Google Calendar on a computer → copies the feed link with
  Settings → Add calendar → From URL instructions. Client-side `buildIcs()` also exists.
- `api/cal.js` signs in anonymously via the identitytoolkit REST API, reads Firestore REST, emits ICS with a
  VTIMEZONE for America/Chicago and a 2-hour alarm. Verified live returning Branden's 6 shifts.
- **Name matching is exact (case-insensitive).** The page tells people to type their name exactly as it
  already appears on the sheet, or the calendar / shift count won't find them.
- **Print on phones/tablets** (the president asked first thing): `sheetModel()` feeds both the HTML print layout (computers → window.print) and `drawSheet()` (3300×2550 canvas PNG of the same paper sheet) → `navigator.share` so the iOS/Android share sheet offers Print / AirDrop / Save / Messages — works from the home-screen app too. iOS standalone cannot window.print and Safari blocks repeat print() calls, hence this route (09-16).
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
- **Paste the new `firestore.rules` (adds `counts/{day}`) into Firebase console → Firestore → Rules → Publish** — photos fail with permission-denied until then.
- ~~Re-publish `firestore.rules`~~ — confirmed 09-16 the published rules (09-15 3:34 PM) already include `startDate`.
- ~~Delete the two stale Vercel projects~~ — done 09-16.
- Send the link + codes to the Duffers GroupMe once he's happy.
- After the fair: enter the 2026 deposits nightly via the green +; next year "Set opening Thursday" and
  reload names — 2026 totals become "last year" automatically.
