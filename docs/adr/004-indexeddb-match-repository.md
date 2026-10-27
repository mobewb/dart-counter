# ADR-004: Matches in IndexedDB behind a MatchRepository

- Status: Accepted
- Date: 2026-10-28

## Context

A refresh or a closed tab lost the match in progress, and finished matches were not kept. A future feature will show a match history and player stats, so the stored data will keep growing and will need to be queried, for example by date.

## Decision

- The application layer defines a `MatchRepository` port: the current match (one record) and the history of finished matches (by id).
- The adapter in `src/infrastructure/` uses **IndexedDB**: it has no practical size limit, stores objects as they are, is asynchronous and supports indexes (`finishedAt`).
- A saved match is its setup plus its dart log (ADR-001); everything else is rebuilt by replaying.
- The match is saved after every dart and undo. A finished match is in the history; undoing its winning dart takes it out again, so the history never holds a stale entry.
- Small preferences (language, last setup) stay in **`localStorage`**: tiny, synchronous, read at startup.
- Storage is best effort: when it fails or is unavailable, the app keeps working without saving.
- No new runtime dependency: a thin wrapper over the IndexedDB API. Tests use `fake-indexeddb`.

## Consequences

- Resume and history work offline and on GitHub/GitLab Pages, with no backend.
- Data stays in one browser on one device; clearing site data deletes it. The app calls `navigator.storage.persist()` so browsers that honour it (e.g. Safari's 7-day eviction) keep the data.
- Changing the stored shape later needs an IndexedDB version upgrade; unreadable current matches are dropped on resume.
- A history screen only needs to call `listFinished()`.
