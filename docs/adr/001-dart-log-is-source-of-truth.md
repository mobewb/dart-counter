# ADR-001: The dart log is the source of truth

- Status: Accepted
- Date: 2026-10-27

## Context

A match changes state one dart at a time. Players make input mistakes and need to undo, across turns, legs and sets, and even after the match is won. Crazy Cricket rerolls targets during the match.

## Decision

The only stored state of a match is its configuration and the ordered log of darts. Match state is always derived by replaying the log through the game mode's rules. Undo removes the last dart from the log and replays.

Everything the replay needs must be in the configuration, so replay is deterministic: Crazy Cricket's starting targets and reroll pool are dealt before the match starts.

## Consequences

- Undo is trivial and always correct, with no inverse operations to maintain.
- Persisting a match later only means storing the configuration and the dart log.
- Domain functions must be pure and deterministic; randomness is injected from outside the domain.
- Replay cost grows with match length; this is negligible for darts (a few hundred darts at most).
