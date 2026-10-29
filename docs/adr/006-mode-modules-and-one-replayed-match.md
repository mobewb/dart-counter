# ADR-006: Mode modules in the application layer, and one replayed match

- Status: Accepted
- Date: 2026-10-29
- Amends: ADR-003

## Context

ADR-003 promised that adding a game mode means implementing the `GameMode` contract and adding one UI registry entry. Killer showed otherwise: it touched the `MatchSetup` and `MatchRequest` unions, `rulesFor`, `startMatch`, `matchStats`, the `PlayerRecord` shape, the history aggregation and the caller. Each of those switched on `setup.mode`, and read match states typed as `MatchCore` through casts (`as x01.X01Match`).

Reading a match was spread the same way. `replaySession`, `steps` and `teamPlay` each replayed the dart log for one slice (state, thrower, per-player results, stats, calls, the outcome to save), so the log was replayed about six times per dart, and the game screen and `App` had to know which function gave which slice.

## Decision

- **A mode module per game mode id** in `src/application/modes/`, one adapter of a `ModeModule<K>` interface: the mode's rules, the fewest sides it needs, how its config is dealt (and re-dealt for a rematch), its stats, its calls, and how its stats add up in the history. Cricket and Crazy Cricket are two modules sharing everything but the deal.
- **One type map.** `Families` gives each rule family (x01, cricket, clock, killer) its config, state, options, stats and record types; `FAMILY` maps each game mode id to its family. `MatchSetup`, `MatchRequest` and every per-mode type are derived from it. Generic code is written against `ModeModule<K>` and looks modules up in `modules: { [K in GameModeId]: ModeModule<K> }`, so TypeScript correlates a setup's mode with its config, state and stats without casts.
- **One replayed match.** `openMatch(setup, darts)` replays the log once and returns a plain, immutable `Match<K>`: state, events of the last dart, thrower, side names, results per side and per player, round, stats and calls. `throwDart` and `undoDart` open the new log. Every caller holds a `Match` instead of re-deriving slices.
- **Widenings live at the edges.** A setup read from storage is checked by `parseSetup`; a `Setup<K>` built by generic code becomes a `MatchSetup` through `toMatchSetup`. No other code casts between modes.
- The UI registry stays separate (it holds React views and i18n keys) and is keyed the same way: `{ [K in GameModeId]: ModeView<K> }`. Views receive their mode's typed state and stats.

## Consequences

- Adding a game mode means: the domain rules and `mode.ts`, a `Families`/`FAMILY` entry, one mode module, one view. Missing entries in `modules` or the registry are compile errors. New kinds of calls still extend the `Call` union and its phrases.
- Each log is replayed once per change; stats and calls are computed with it, which is negligible at a few hundred darts (ADR-001).
- Tests go through `startMatch` and `openMatch` rather than per-slice functions, and a contract suite runs over every mode module.
- Player records keep one section per rule family, present only once the player has played it.
