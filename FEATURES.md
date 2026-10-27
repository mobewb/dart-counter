# Dart Counter — Features

A mobile-first dart scoring web app. Pick a game, enter the players, and tap the dartboard (or a keypad) to record each dart. All rules, scoring and stats are computed automatically.

## Table of contents

1. [Game modes](#1-game-modes)
2. [Match setup](#2-match-setup)
3. [X01 (301 / 501 / 701)](#3-x01-301--501--701)
4. [Cricket](#4-cricket)
5. [Crazy Cricket](#5-crazy-cricket)
6. [Dart input](#6-dart-input)
7. [In-game controls](#7-in-game-controls)
8. [End of game](#8-end-of-game)
9. [Languages](#9-languages)
10. [Mobile and display](#10-mobile-and-display)
11. [Technical overview](#11-technical-overview)
12. [Build, test and deploy](#12-build-test-and-deploy)

---

## 1. Game modes

| Mode | Summary |
| --- | --- |
| **X01** | Count down from 301, 501 or 701 to exactly zero, with optional double-in / double-out, legs and sets. |
| **Cricket** | Close 20 → 15 and the bull with 3 marks each, and score points on numbers your opponents have not closed. |
| **Crazy Cricket** | Cricket with six random numbers plus the bull; numbers nobody hits are rerolled each round. |

## 2. Match setup

- **Game selector** — switch between X01, Cricket and Crazy Cricket; a short rules hint is shown for the two Cricket variants.
- **Players** — 1 to 8 players, with a stepper to add or remove players.
- **Player names** — optional, up to 16 characters. Empty names default to "Player N" / "Joueur N".
- **X01 options**
  - Start score: 301, 501 or 701.
  - Double in (off by default).
  - Double out (on by default).
  - Legs to win a set: 1 to 11 (default 3).
  - Sets to win the match: 1 to 7 (default 1).
- **Settings memory** — after a game, the setup screen is pre-filled with the previous game's mode, rules and names.
- **Language toggle** — FR / EN button on the setup screen.

## 3. X01 (301 / 501 / 701)

### Scoring rules
- Each player starts at the chosen score; darts are subtracted from the remaining score.
- 3 darts per turn, then the turn passes to the next player.
- A leg is won by reaching exactly 0 (on a double when double-out is enabled).
- **Double in** — a player's score does not move until they hit a double; the "Needs a double to start" badge is shown meanwhile.
- **Bust** — going below 0, reaching 0 without a valid finish, or leaving 1 with double-out. The score and double-in status are restored to the start of the turn, the turn ends, and a "BUST" banner is shown. The darts thrown still count towards the player's average.
- **Bull** — the bull is worth 25 (outer) or 50 (inner, counts as a double); there is no triple bull.

### Legs and sets
- Win the configured number of legs to win a set, and the configured number of sets to win the match.
- The leg-starting player rotates after every leg, and a dot marks the current leg starter.
- Legs and sets counters are shown only when the match uses more than 1 leg or 1 set.

### Live information
- Remaining score for every player, with the active player highlighted (and scrolled into view on small screens).
- **3-dart average** per player (points per 3 darts; busted turns count their darts but not their points).
- The 3 dart slots of the current turn, showing each dart as `20`, `D16`, `T19`, `25`, `BULL` or a miss.
- **Checkout suggestions** — when the remaining score is 170 or less and the player is in, a recommended finish is shown, adapted to the number of darts left in the turn and to the double-out setting. It is a heuristic: fewest darts first, avoid bull setups, prefer the easiest finishing double (D20, D16, D8, …), and throw the highest-scoring setup dart first.
- Match info in the top bar: start score, `DI`/`DO`/`SO` (double in / double out / straight out) and "First to N" when relevant.

## 4. Cricket

- **Targets**: 20, 19, 18, 17, 16, 15 and the bull.
- **Marks** — a single counts 1 mark, a double 2, a triple 3 (the bull counts 1 or 2). A number is *closed* at 3 marks. The marks are drawn as `／`, `✕` and `⊗`.
- **Scoring** — extra marks beyond the third on a number score its value in points, but only while at least one opponent has not closed it.
- **Dead numbers** — a number closed by every player is greyed out and labelled "Dead".
- **Win condition** — close every number while having at least as many points as every opponent.
- A scoreboard shows, per player, their points and their marks on each target, with the active player highlighted.
- Non-target numbers are faded on the dartboard and keypad so it is clear what counts.
- Works with 1 to 8 players.

## 5. Crazy Cricket

Same scoring and win condition as Cricket, with a random twist:

- **Random start** — six random numbers from 1 to 20 (sorted high to low) plus the bull.
- **Reroll** — after every full round (once all players have thrown), each number that nobody hit during that round is replaced by a fresh number from the remaining pool. The bull is never replaced. Marks on a replaced number are discarded; points are kept.
- **Roulette animation** — a slot-machine style reel spins for the opening numbers and for every reroll, with staggered landings, a "slam" effect and sparks. Input is disabled while the roulette is spinning.
- **Fresh deal on rematch** — "Rematch" deals a new set of random numbers.
- The animation is skipped when the device has *reduced motion* enabled.

## 6. Dart input

Two interchangeable input methods, switchable at any time during a game:

### Board
- Interactive SVG dartboard with the real number order, and the colored segments (red/green, black/cream).
- Tap the single, double or triple ring of any number, the outer bull (25) or the bull's eye (50).
- Radii are stylised (not to scale) so that doubles and triples are finger-sized.
- A dedicated **Miss** button below the board.

### Pad
- Multiplier tabs: Single / Double / Triple.
- Number buttons 1–20, a Bull button (a triple on the bull falls back to a single) and a Miss button.
- The multiplier resets to Single after each dart.
- In Cricket modes, non-target numbers are faded.

## 7. In-game controls

- **Undo** — removes the last dart, repeatedly and across turns, legs and sets (the whole game is rebuilt from the dart log). It can also be used from the winner screen to correct the last throw.
- **Quit** — returns to the setup screen after a confirmation prompt.
- **Screen wake lock** — in X01, the screen is kept on during the game (where the browser supports it).

## 8. End of game

A winner overlay shows:
- the winner's name and a trophy,
- stats for every player — 3-dart average and darts thrown in X01, points and darts thrown in Cricket,
- three actions: **Undo** (reopen the game), **Rematch** (same settings, same players) and **New game** (back to setup).

## 9. Languages

- English and French, with the language auto-detected from the browser (French if the browser language is French, English otherwise).
- Can be switched manually on the setup screen.
- All UI texts, hints and rule explanations are translated.

## 10. Mobile and display

- Designed first for phones: compact layouts for game and setup screens on small screens.
- Landscape layout for short viewports.
- Safe-area insets supported (notch, home indicator).
- Responsive layout capped at a comfortable width on tablets and desktops.
- Respects `prefers-reduced-motion`.

## 11. Technical overview

| Area | Details |
| --- | --- |
| Stack | React 19, TypeScript, Vite, Vitest |
| Dependencies | Only `react` and `react-dom` at runtime |
| Persistence | None — the game state lives in memory; a refresh resets the game |
| Backend | None — fully static front-end |

### Architecture

```
src/
├── engine/          Pure, UI-independent game logic (unit-tested)
│   ├── types.ts       Darts, X01 config and state
│   ├── match.ts       X01 rules: bust, double in/out, legs, sets, replay
│   ├── cricket.ts     Cricket and Crazy Cricket rules, reroll, replay
│   ├── checkout.ts    Checkout route suggestions
│   └── stats.ts       3-dart average
└── ui/              React components
    ├── Setup.tsx        Game selection and options
    ├── Game.tsx         X01 game screen
    ├── CricketGame.tsx  Cricket / Crazy Cricket game screen
    ├── Dartboard.tsx    SVG dartboard input
    ├── Keypad.tsx       Numeric pad input
    ├── TargetsStrip.tsx Cricket targets and roulette animation
    ├── dartLabel.ts     Dart display labels (D16, T20, BULL…)
    ├── i18n.tsx         EN / FR translations
    └── styles.css
```

Design notes:
- **Event-sourced state** — each game is a log of darts; the state is derived with `replay` / `replayCricket`. Undo is simply replaying one dart fewer.
- **Deterministic Crazy Cricket** — the reroll pool is fixed at the start of the game, so replaying the log always yields the same targets.
- **Engine tests** — unit tests cover X01 rules, Cricket, checkout suggestions and stats.

## 12. Build, test and deploy

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | Type-check only |
| `npm test` | Run the unit tests |

CI/CD: the app is type-checked, tested and built on every push, and deployed to **GitHub Pages** (`.github/workflows/pages.yml`) and **GitLab Pages** (`.gitlab-ci.yml`) from the main branch.
