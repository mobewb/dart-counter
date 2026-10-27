# ADR-002: Functional, immutable domain model

- Status: Accepted
- Date: 2026-10-27

## Context

DDD is often implemented with classes: entities with identity, value objects, aggregates with methods. The existing engine is made of immutable state and pure functions (`throwDart(state, dart)`), which suits replay (ADR-001) and is easy to test.

## Decision

Keep the functional style. An aggregate is an immutable state type plus the pure functions that guard its invariants. Value objects (`Dart`, `Multiplier`, `Segment`) are plain types with functions. No classes in the domain.

A move returns the new state and the domain events it produced: `{ state, events }`. UI-only flags (`busted`, `rollCount`, `lastRoll`) are replaced by events and removed from the state.

## Consequences

- Replay is a `reduce` over the dart log.
- Domain code stays framework-free and trivially testable.
- Invariants are enforced by the functions that create and update state, not by encapsulation; the domain modules export only those functions, never setters.
