import { useMemo, useState } from 'react'
import { newSession, recordDart, replaySession, undo } from '../application/match-session'
import type { Dart, GameMode, MatchCore } from '../domain'

/** Adapts the match session use cases to React. */
export function useMatch<Config, State extends MatchCore>(mode: GameMode<Config, State>, config: Config) {
  const [session, setSession] = useState(() => newSession(config))
  const { state, events } = useMemo(() => replaySession(mode, session), [mode, session])
  return {
    state,
    /** Events of the last dart. */
    events,
    dartCount: session.darts.length,
    hit: (dart: Dart) => setSession((s) => recordDart(mode, s, dart)),
    undo: () => setSession(undo),
  }
}
