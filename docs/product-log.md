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

## Iteration 2 — Match stats

**Why:** darts players judge a match by a handful of standard numbers. The app only showed the 3-dart average, while the dart log holds everything needed to compute the rest.

**What was built**
- `matchStats(setup, darts)` in the application layer computes per-player stats from the dart log. It works in team play too: each dart is credited to the team member who threw it.
  - **X01:** first-9 average (each leg's first three visits), highest visit, 100+/140+/180 counts, checkout rate (checkouts / darts thrown at a finishing double), highest checkout, best leg.
  - **Cricket:** marks per round (MPR), total marks.
- `steps(setup, darts)` was extracted from team play: a replay that tags each dart with its side, its thrower and the state before and after. Team play and the stats share it.
- The winner screen shows the stats as compact chips under each player; zero counts are hidden.

**Decisions**
- *Computed from the dart log, not stored.* The history keeps the full log, so stats can be recomputed, and later corrected, for every saved match. No migration is needed.
- *Standard definitions:*
  - A busted visit counts its darts and scores 0.
  - "Darts at a double" means darts thrown while the score left is finishable with one dart (2–40 even, or 50) and the player is in.
  - MPR counts every mark hit on a target, scoring marks included.
- *Best leg is credited to the player who checked out*, counting their side's darts in that leg. In team play, the side's darts are the honest measure of how fast the leg went.
- *Stats live on the winner screen only*, for now. During play the board stays uncluttered; the live 3-dart average already exists.

**Verified:** 8 unit tests with hand-checked numbers (a 9-dart 501 with two 180s and a 141 checkout, a bust, the first nine across legs, no double-out, team attribution, cricket MPR). Browser check of the winner screen in X01 solo and cricket teams.

**Challenge — what could be better**
- *A test was wrong, not the code.* The first-nine-across-legs expectation forgot one visit. Hand-computed fixtures are error-prone, so I added a second test whose data can only pass if the per-leg reset works.
- *Checkout rate ignores double-in.* Darts at a double for getting in are not tracked ("double-in %"). Rare format. **Skipped.**
- *Stats are per match only.* Their real value is over time (is my average improving?). **That's iteration 3.**
- *No live highlight.* A 180 passes silently. **Iteration 5 (caller) covers it.**

## Iteration 3 — History and player stats

**Why:** every finished match was already saved, but nobody could see it. A player's numbers over time ("is my average going up?") are what keeps people coming back to a darts app.

**What was built**
- `playerRecords(history)` groups the history by player name. For each player it counts matches and wins, and aggregates:
  - **X01:** average (total points / total darts, not an average of averages), highest visit, 180s, checkout rate, best checkout, best leg.
  - **Cricket:** MPR.
- A **History** screen, opened from a button on the setup screen, with *Players* and *Matches* tabs. Each match can be deleted, after a confirmation.
- `points` was added to the X01 match stats so the history aggregates exact totals.

**Decisions**
- *Players are identified by name* (trimmed, case-insensitive), showing the latest spelling. There are no accounts or player profiles: setting up a match stays typing names, which suits a shared phone at the board.
- *Everything is recomputed from the dart logs* when the screen opens. It's simple and always consistent with the stats definitions. Hundreds of matches replay in milliseconds.
- *Team wins count for every member.* In team play, each member's own stats count toward their record.

**Verified:** 5 unit tests (aggregation across matches, name matching, team wins, cricket kept apart from X01). Browser check: the empty state, two matches in two modes with a "Bob"/"bob" merge, delete with persistence across a reload.

**Challenge — what could be better**
- *Bug caught in the browser:* the screen is a full-height grid, so with few cards the tabs and chips stretched to fill the page. Fixed by packing rows at the top. Unit tests can't see this; the screenshot did.
- *Process slip:* the placeholder-name fix was first committed with a failing test, because my commit command was chained after a `grep` of the test output (which succeeds whatever the result). The commit was amended once fixed (the test only had the wrong order). Commits are now gated on the test command's exit code.
- *Two of my test expectations were wrong again* (checkout darts on misses at a finishable double). The definitions are subtle; the comments in the tests now spell out the reasoning.
- *Default names polluted the records:* "Player 1" in different matches was treated as one person. **Fixed right after:** placeholder names ("Player N", "Joueur N") are left out of the Players tab; their matches still appear in the Matches tab.
- *No trends or charts.* Average per match over time would be the natural next view. **Later:** needs a chart, and enough data to be meaningful.
- *No export or backup.* History lives in one browser. An export/import JSON file would protect it. **Backlog.**

## Iteration 4 — New game mode: Around the Clock

**Why this mode:** it is the most widely played practice game, and it doubles as a simple race for mixed-level groups. It is also the best test of the architecture: a mode with different rules, a different scoreboard and different stats.

**What was built**
- `src/domain/clock/`: the rules. A side advances one target per hit of its current target (any multiplier), and the first to hit the bull wins at once. It implements the `GameMode` contract and passes the shared contract suite.
- The target order is part of the config (`sequence`). The app uses 1–20 then the bull; tests use short sequences, and variants (reverse order, doubles only) become a config change.
- UI: next-target cards with progress bars, an *Aim at* chip, and every non-target number faded on the board and the pad.
- Stats: targets hit and hit rate, on the winner screen and in the player records.

**What the architecture gave for free:** team play, undo, resume after a refresh, history, offline use and the per-player stats plumbing. The new code is the rules (~70 lines), one view, one stats function and translations. The registry's type check refused to compile until the mode had a UI entry: the "adding a mode = contract + registry entry" promise from ADR-003 held.

**Decisions**
- *Any multiplier counts as a single hit* (the classic rules). The "doubles and triples skip ahead" variant is popular but changes the game. **Kept for later** as an option.
- *Instant win*, no "finish the round" rule, so the starter has an edge. That's standard for casual play.
- *Short label "Clock" / "Horloge"* so four game modes fit on one row at phone width; the hint gives the full name.

**Verified:** 6 rule tests, plus the contract suite for the new mode and a stats test (160 tests). Browser check of a full match (21 targets), the faded pad, the *Aim at* chip and the winner screen.

**Challenge — what could be better**
- *Bug found:* the setup screen stretched its cards and the *Throw!* button to fill the screen whenever the X01 cards were hidden (Cricket modes included, so it predates this iteration). Fixed with the same rule as the history screen. **Lesson:** the full-height grid in `.screen` is a trap; any new screen must set `align-content`.
- *The progress bar looked wrong in a screenshot.* Measuring showed the width is correct at rest; it was mid-transition because the test tapped faster than the 0.3 s animation. **No change needed.**
- *No variant options yet* (skip ahead, doubles only, reverse). The config is ready for them. **Backlog.**
- *Other party games* (Killer, Shanghai) are still missing. Killer needs per-player "assigned numbers" and lives: a bigger domain change. **Backlog**, now low-risk thanks to the contract.

## Iteration 5 — Caller voice and haptics

**Why:** players look at the board, not the phone. On TV and in leagues a caller announces every visit; the app can do the same, and a vibration confirms a tap registered without looking.

**What was built**
- `calls(setup, darts)` in the application layer: a pure function that decides what a caller says after the last dart.
  - **X01:** the visit score (or *No score*), *Bust*, *Game shot!*, *Game shot, and the match!*, then "*Ann, you require 81*" when the next thrower is on a finish. In team play that's the right team member.
  - **Other modes:** only the winner.
- `useCaller` speaks the calls with the browser's speech synthesis, in the app's language (en-GB / fr-FR), and vibrates: a tick per dart, a double buzz on a bust, a long pattern on a win.
- A *Sound* card on the setup screen, with *Caller voice* and *Vibration* toggles saved in `localStorage`.

**Decisions**
- *What to say* (application, pure, unit-tested) *is separate from how* (UI: words, voice, vibration). Wording lives in the translations; a future "chime only" mode would only touch the UI.
- *Caller off by default:* a phone that suddenly talks in a pub is a bad surprise. *Vibration on by default:* it's discreet.
- *Undo and resume are silent:* only a newly thrown dart triggers feedback, so correcting a mistake doesn't re-announce scores.
- *"You require" only when a checkout exists* (it uses the checkout engine), as real callers do. "You require 171" is never said.
- *No recorded audio:* the device's voice works offline and in both languages, at zero size.

**Verified:** 8 caller tests (visit, no score, bust, game shot, match shot, require, the team member who's next, other modes) and a settings test (169 tests). Browser check with speech and vibration replaced by recorders: defaults, the setting remembered, 180, no score + require, bust, a silent undo, and French.

**Challenge — what could be better**
- *Device voices vary a lot.* Some Android voices read "180" flatly; there is no caller "personality". Recorded clips would sound better but would add megabytes and need FR and EN recordings. **Accepted.**
- *iOS Safari has no vibration API*, so haptics silently do nothing on iPhones. Nothing can be done in a web app. **Documented.**
- *No volume or voice picker.* The system volume and the device's default voice are used. **Backlog** if users ask.
- *Cricket could call more* (e.g. "Triple 20, three marks"). Cricket callers rarely do this; the winner call is enough. **Skipped.**

## Iteration 6 — New game mode: 321

**Why this mode:** a quick party game that anyone can play without knowing checkouts, with a twist that keeps every player in the race until the end.

**What was built**
- `src/domain/three21/`: the rules. Sides count up from 0; the first to reach exactly 321 wins at once. Going over bounces back by the excess (360 → 282). Landing on an opponent's score sends them back to 0. Two new domain events, `Bounced` and `KnockedBack`, drive the banners and the stats.
- UI: score cards with a progress bar towards 321 and the points to go, and *BOUNCE* / *KNOCKED BACK* banners in the style of the X01 bust banner. The progress bar class is now shared with Around the Clock.
- Stats: final score, darts thrown and knock-backs, on the winner screen and in the player records.

**Decisions**
- *Bounce instead of bust:* chosen over "bust, turn reset" and "back to 0". It keeps a player near the finish moving, without a hard penalty.
- *Knock-back always on*, as in the pub game; no setup option to keep the setup screen short.
- *Any dart finishes*, no round limit: a party game, not a checkout drill.
- *Mode id `three21`, not `'321'`:* integer-like object keys are listed first by `Object.keys`, which would have put the mode first on the setup screen.
- *Headline is the current score*, so team members are credited the net change of their darts, bounces included; a knock-back by an opponent is not charged to anyone.

**Verified:** 8 rule tests, the contract suite for the new mode and 2 stats tests (188 tests). Browser check at phone width: five modes fit on the selector, bounce and knock-back banners, the winner screen, undo of a knock-back and resume after a reload.

**Challenge — what could be better**
- *The banners last one dart:* a knock-back on the first dart of a turn disappears on the next dart, as the bust banner does. **Accepted** for consistency.
- *The caller stays silent on knock-backs*, which are the funniest moment of the game. **Backlog:** a "Back to zero!" call.
- *No variants* (bust instead of bounce, double out, round limit). The rules would take them as config. **Backlog.**

## Where the app stands, and what's next

After six iterations the app covers what a pub, club or garage session needs: it works offline, gives pro-level stats and a history, has five game modes with team play, and a caller.

**Next candidates, by value:**
1. **Backup and restore** (export/import the history as a file). History lives in one browser; losing it hurts more as it grows.
2. **Killer** party game (assigned numbers, lives). The most requested party mode; the contract makes it low-risk.
3. **Around the Clock variants** (skip ahead with doubles/triples, doubles only); config-only.
4. **Trends** in player records (average per match over time, as a small chart).
5. **Visit total entry** for X01 (type "60" instead of three darts). It needs a rule for the checkout dart: a total entry can't know whether the last dart was a double, so the app would have to ask.
