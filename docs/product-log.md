# Product log

How Dart Counter is being improved, one feature at a time. Each iteration records what was built, the decisions behind it, and a self-challenge: what is weak, what is missing, what comes next.

Work happens on the `develop` branch, one commit per feature.

## Starting point (2026-10-28)

Dart Counter already does the core job well: X01 (301/501/701, double in/out, legs and sets, checkout hints), Cricket and Crazy Cricket, 1–8 players or 2–4 teams, a tap-friendly dartboard and keypad, unlimited undo, resume after a refresh, a saved match history, EN/FR, and an installable icon.

### Product review — who uses it and where it falls short

The typical user throws in a pub, a garage or a club: one phone on a table or a shelf, several players, often patchy Wi-Fi, hands busy with darts.

| Gap | Why it matters to a darts player | Priority |
| --- | --- | --- |
| Not usable offline | Pubs and basements have bad signal; the app is "installable" but dies without network. | **High** — reliability before features |
| Shallow stats | Darts players live by their numbers: 3-dart average, first-9 average, 180s, ton-plus visits, checkout %, best leg. Today only the 3-dart average is shown. | **High** |
| History is invisible | Every finished match is saved, but there is no screen to see it. | **High** (cheap now that data exists) |
| Few game modes | Practice games (Around the Clock) and party games (Killer, Shanghai) are what people play between X01 matches. | Medium |
| No feedback away from the screen | Players don't look at the phone while throwing; a caller voice ("one hundred and eighty!") and haptics help. | Medium |
| Fast visit entry | Experienced players type the visit total ("60") instead of three darts. | Medium — conflicts with per-dart rules (double-out, cricket marks), needs care |

### Order of work

1. Offline support
2. Match stats (darts-player stats from the dart log)
3. History and player stats screen
4. A new game mode
5. Caller voice and haptics

The order is reliability first, then the stats players care about, then reach (new modes) and delight (voice).

## Iteration 1 — Offline support

**Why first:** a scoring app that dies on bad Wi-Fi fails at the one moment it is needed. Matches were already saved locally (IndexedDB), so the only missing piece was loading the app itself offline.

**What was built**
- A hand-written service worker (`public/sw.js`), registered only in production builds (`src/infrastructure/service-worker.ts`).
- The page is fetched **network-first**: online users always get the latest deploy; offline, the cached page is served.
- Build files and icons are served **cache-first**. They are cached at install time by reading the files `index.html` links to, so even the very first visit is fully cached.
- Every online page load re-syncs the cache with the current build and deletes files from older deploys.

**Decisions**
- *No `vite-plugin-pwa` / Workbox:* the app has two runtime dependencies and a ~60-line worker covers the need. Adding a build plugin for this would cost more to maintain than it saves.
- *Relative URLs everywhere* so the same worker works on GitHub Pages (`/dart-counter/`) and at the root.
- *Disabled in dev* to avoid stale-cache confusion while developing.

**Verified** (production build served under `/dart-counter/`, headless Chromium): the page reloads offline and plays; a new tab opened offline resumes the saved match; after a simulated deploy, the cache holds only the new build and offline still works.

**Challenge — what could be better**
- *No "new version available" prompt.* Network-first means an update applies on the next load. That's acceptable for a scoring app, but a match can't be interrupted by a reload anyway, so a prompt adds little. **Kept as is.**
- *Manifest icons (192/512) are not precached.* They are only used when installing to the home screen, which needs a network anyway. **Kept as is.**
- *The worker has no automated test* (Vitest runs in Node, without service workers). It is covered by the headless-browser check only. **Accepted:** this is the main risk of this iteration.
- *Missing:* nothing tells the user the app works offline. Low value. **Skipped.**
