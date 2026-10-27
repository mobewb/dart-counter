# ADR-005: Teams are sides; throwers are derived from the dart log

- Status: Accepted
- Date: 2026-10-28

## Context

Every game mode should support team play: 2 to 4 teams, possibly uneven, sharing one score, with members taking turns, while still showing each player's own stats.

## Decision

- The game rules don't know about teams. They score **sides**; in team play each team is one side (`playerCount` = number of teams).
- `MatchSetup` gains optional `teams` (player indexes per side, in throwing order). Without it, each player is a side.
- Who throws is derived in the application layer (`teamPlay`) by replaying the dart log: each `TurnEnded` event of a side passes the turn to its next member, across legs.
- To split a side's stats between its members, the `GameMode` contract exposes an additive `tally` per side (points and darts) and a `headline` stat computed from a tally. Each dart's change to its side's tally is credited to its thrower.

## Consequences

- No game rule changed; undo, resume and history work for teams as they are.
- Any future game mode gets team play by implementing `tally` and `headline`.
- The domain's "players" are really sides; the glossary records this rather than renaming the domain code.
