# Duffers Corndog Booth Sign-Up — setup (about 20 minutes, once)

What you end up with: one link (e.g. `duffers-signup.vercel.app`) you text to the crew every August.
Everyone sees the same sheet, live, on their phone. No accounts. Free tier on both services.

## 1. Firebase (the live database)

1. Go to https://console.firebase.google.com → **Add project** → name it `duffers-signup` → turn Google Analytics **off** → Create.
2. Left menu **Build → Authentication** → Get started → **Sign-in method** tab → enable **Anonymous** → Save.
   (This is what lets phones write to the sheet without anyone making an account.)
3. Left menu **Build → Firestore Database** → Create database → **Production mode** → pick `nam5 (us-central)` → Enable.
4. Firestore → **Rules** tab → delete what's there, paste the whole contents of `firestore.rules` → **Publish**.
5. Project overview (gear icon) → **Project settings** → scroll to **Your apps** → click the `</>` web icon →
   nickname `duffers` → (leave Hosting unchecked) → Register app. It shows a `firebaseConfig = { ... }` block.
   Copy the four values `apiKey`, `authDomain`, `projectId`, `appId` into the CONFIG block near the top of `index.html`.
6. Still in `index.html`, set `LODGE_CODE` (what you text the crew) and `ADMIN_CODE` (yours).

## 2. Vercel (the link)

1. Put `index.html` in a folder by itself. Go to https://vercel.com/new → **Browse** / drag the folder → Deploy.
   (Or add it as a repo like `vendflow` — same flow; every push redeploys.)
2. Optional: Settings → Domains → add something like `signup.myvendflow.com` or a `.com` you buy for the club.

## 3. Firebase — one last click

Authentication → **Settings** tab → **Authorized domains** → Add domain → paste the Vercel host
(e.g. `duffers-signup.vercel.app`). Without this, sign-in from the live site is refused.

## Using it

- Text the crew: the link + the lodge code. They open it, type their name once, tap **+ Sign me up** on shifts.
- Yellow = short-handed (fewer than the "people needed" number). Green count = covered.
- A Shriner can remove only himself (× next to his name). You, after tapping **Admin** in the footer and entering the admin code, can remove anyone, **lock** the sheet, change **people needed** (Close shifts vs. others), and **export** a CSV roster for printing.
- The dates set themselves: last Thursday of September, ten days through the second Saturday. After the fair is ~2 weeks past, the page automatically shows next year's blank sheet. No edits needed year to year.
- Each year's sign-ups live under `sheets/<year>` in Firestore, so past years are kept.

## Changing the shifts

They're in `TEMPLATE` near the top of `index.html` — one line per day type (opening Thursday, Friday, Saturday, Sunday, weekday). Edit, redeploy.

## Honest limits

- The lodge code and admin code are typed into the page, so anyone who reads the page source can find them. Fine for a corndog booth; not for money.
- Firebase's free tier allows 50,000 reads/day. Thirty Shriners refreshing all day is nowhere near that.
- It needs a signal to update; a phone with no service shows the last thing it saw.
