# DDD migration plan

Move Dart Counter to a lightweight domain-driven design, so that adding game modes and persistence later is cheap.

## Ground rules

- **No behaviour change.** Every step is a pure refactor.
- **Small steps.** One conventional commit per step; `npm run typecheck` and `npm test` stay green after each.
- **Out of scope:** new game modes, persistence, backend, UI redesign. The migration only prepares their seams.
- **Language:** names come from [`GLOSSARY.md`](../GLOSSARY.md).

## Decisions

| Topic | Decision | Record |
| --- | --- | --- |
| Source of truth | Config + dart log; state derived by replay; undo = replay one dart fewer | [ADR-001](adr/001-dart-log-is-source-of-truth.md) |
| Modelling style | Immutable state + pure functions; no classes; moves return `{ state, events }` | [ADR-002](adr/002-functional-domain-model.md) |
| Boundaries | One bounded context; `shared-kernel`, `x01`, `cricket`; shared `GameMode` contract; UI registry | [ADR-003](adr/003-single-context-with-game-mode-contract.md) |
| Umbrella terms | **Match** = the contest, **Game mode** = the variant, **Leg/Set** = X01 only | Glossary |
| Crazy Cricket | Cricket with a *reroll* target policy, same module | ADR-003 |
| Randomness | Dealt in the application layer with an injected random source; domain stays deterministic | ADR-001 |
| Checkout | Domain service in `x01` | — |
| Stats | Per-mode `results` in the contract (average for X01, points for Cricket) | — |
| Application layer | Plain TypeScript use cases; React only in a thin `useMatch` hook | — |

## Target structure

```
src/
├── domain/                     Pure, deterministic, no React
│   ├── shared-kernel/            Dart, Segment, Multiplier, GameMode contract, events
│   ├── x01/                      X01 match aggregate, checkout service, results
│   └── cricket/                  Cricket match aggregate, target policies (fixed, reroll)
├── application/                Plain TypeScript use cases
│   ├── match-session.ts          { mode, config, darts }
│   ├── start-match.ts            builds config, deals Crazy Cricket targets
│   ├── record-dart.ts
│   ├── undo.ts
│   └── rematch.ts
└── ui/                         React, i18n, wake lock
    ├── use-match.ts              adapts use cases to React
    ├── registry.ts               one entry per game mode
    ├── GameScreen.tsx            generic: turn slots, input, undo, overlay
    ├── modes/x01/                Scoreboard, SetupOptions, ResultStats, CheckoutChip
    ├── modes/cricket/            Scoreboard, SetupOptions, ResultStats, TargetsStrip
    └── Setup.tsx, Dartboard.tsx, Keypad.tsx, i18n.tsx, styles.css
```

Dependency rule: `ui → application → domain`. The domain imports nothing from the other layers.

### `GameMode` contract (sketch)

```ts
interface GameMode<Config, State> {
  id: 'x01' | 'cricket' | 'crazy'
  start(config: Config): State
  applyDart(state: State, dart: Dart): { state: State; events: DomainEvent[] }
  status(state: State): 'playing' | 'finished'
  winner(state: State): number | null
  currentPlayer(state: State): number
  turnDarts(state: State): Dart[]
  results(state: State): PlayerResult[]
}

type DomainEvent =
  | { type: 'TurnEnded'; player: number }
  | { type: 'Bust'; player: number }
  | { type: 'LegWon'; player: number }
  | { type: 'SetWon'; player: number }
  | { type: 'MatchWon'; player: number }
  | { type: 'TargetsRerolled'; replaced: number[] }
```

## Steps

Each step is one commit.

### 1. Glossary and ADRs — `docs: add glossary and DDD ADRs`
- `GLOSSARY.md`, `docs/adr/001–003`, this plan.
- ✅ Done.

### 2. Move the engine into domain modules — `refactor(domain): split engine into modules`
- Create `src/domain/{shared-kernel,x01,cricket}`.
- Move `types.ts`, `match.ts`, `checkout.ts`, `stats.ts`, `cricket.ts` and their tests, unchanged except for imports.
- Keep a temporary `src/engine/index.ts` re-export so the UI compiles untouched.
- **Done when:** tests pass unmodified; UI imports unchanged.

### 3. Rename to the glossary — `refactor(domain): align names with glossary`
- X01: `MatchState` → `X01Match`, `MatchConfig` → `X01Config`, `throwDart` → `applyDart`.
- Cricket: `CricketState` → `CricketMatch`, `throwCricketDart` → `applyDart`.
- Rename "game" to "match" where it means the contest (UI components may keep names until step 8).
- **Done when:** no domain identifier contradicts the glossary.

### 4. Domain events — `refactor(domain): return domain events from moves`
- `applyDart` returns `{ state, events }`; replay keeps only `state`.
- Remove `busted` (X01), `rollCount` and `lastRoll` (Cricket) from state; emit `Bust` and `TargetsRerolled`.
- UI reads the events of the last dart instead of the flags (bust banner, roulette).
- **Done when:** bust banner and roulette behave as before; tests assert events.

### 5. Target policy for Crazy Cricket — `refactor(cricket): model crazy cricket as a target policy`
- `CricketConfig` gets `targetPolicy: { kind: 'fixed' } | { kind: 'reroll'; pool: number[] }`.
- Move `crazyDeal` out of the domain into `application/` with an injected random source.
- `Setup.tsx` and `App.tsx` stop calling `crazyDeal` directly.
- **Done when:** the domain has no `Math.random`.

### 6. `GameMode` contract — `feat(domain): add GameMode contract`
- Define the contract and `DomainEvent` in `shared-kernel`.
- Implement it for X01, Cricket and Crazy Cricket; move the 3-dart average into X01 `results`.
- Add one contract test suite run against every mode (replay = sequential apply, finished matches reject darts, winner set iff finished, 3 darts per turn…).
- **Done when:** the contract suite passes for all three modes.

### 7. Application layer — `feat(app): add match use cases`
- `MatchSession = { mode, config, darts }`; use cases `startMatch`, `recordDart`, `undo`, `rematch` (rematch re-deals Crazy Cricket).
- Unit tests for each use case, with a seeded random source.
- `ui/use-match.ts` hook wrapping the session.
- **Done when:** use cases are tested without React.

### 8. UI registry and generic screen — `refactor(ui): generic game screen with mode registry`
- `ui/registry.ts` with one entry per mode: rules, `Scoreboard`, `SetupOptions`, `ResultStats`.
- `GameScreen.tsx` replaces `Game.tsx` and `CricketGame.tsx`; `Setup.tsx` renders the selected mode's `SetupOptions`.
- Wake lock moves to `GameScreen` (behaviour note: it then also applies to Cricket — keep X01-only if strict parity is required).
- **Done when:** both modes play identically by hand on mobile and desktop.

### 9. Cleanup — `chore: remove legacy engine and update docs`
- Delete `src/engine/` re-exports and dead code.
- Update the architecture section of `FEATURES.md`.
- Check the dependency rule (e.g. `grep` for `react` and `ui/` imports in `src/domain` and `src/application`).

## Seams this prepares

- **New game mode:** implement `GameMode` + one registry entry + contract suite.
- **Persistence:** store a `MatchSession` (config + dart log); a `MatchRepository` port in `application/` with a `localStorage` adapter in `ui/`.

## Risks

| Risk | Mitigation |
| --- | --- |
| Behaviour drift during refactor | Tests moved unchanged in step 2; contract suite in step 6; manual play-through after steps 4 and 8 |
| Roulette timing depends on render-time derivation of `rollCount` | Step 4 keeps the same "derive during render" trick, keyed on the dart count + `TargetsRerolled` event |
| Over-engineering | No classes, no repositories until persistence is actually built |
