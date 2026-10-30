# ADR-003: One bounded context, a shared GameMode contract and a UI registry

- Status: Accepted, amended by ADR-006
- Date: 2026-10-27

## Context

X01 and Cricket share a small kernel (darts, multipliers, turns of 3 darts, players taking turns) but have different rules, state and scoreboards. The UI duplicates the match lifecycle (dart log, undo, input, winner overlay) in `Game.tsx` and `CricketGame.tsx`. More game modes are expected.

## Decision

- One bounded context, "Darts Match", split into modules: `shared-kernel`, `x01`, `cricket`.
- Crazy Cricket is not a separate module: it is Cricket with a *reroll* target policy.
- Every game mode implements one `GameMode` contract: `newMatch` from a config, `applyDart` (returning state and events) and per-player `results`. Every match state shares a `MatchCore` shape: current player, turn darts, status and winner.
- Layers: `domain ← application ← ui`. Dependencies only point inward.
- The UI has one registry entry per game mode (a `ModeView`), bundling its rules with its label, hint, result format and a `useView` hook that fills the mode-specific parts of the screen (scoreboard, top bar info, turn extras, faded targets, input lock). A generic `GameScreen` handles turn slots, input, undo and the winner overlay.

## Consequences

- Adding a game mode means implementing the contract and adding one registry entry.
- A single contract test suite runs against every mode.
- Splitting into several bounded contexts stays possible later if a mode diverges strongly (e.g. a team or online mode).
