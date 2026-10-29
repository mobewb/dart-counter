import { useState } from 'react'
import { openMatch, throwDart, undoDart } from '../application/match'
import type { GameModeId, Setup } from '../application/modes'
import type { Dart } from '../domain'

/** Holds a match in React state; `initialDarts` resumes a saved match. */
export function useMatch<K extends GameModeId>(setup: Setup<K>, initialDarts: readonly Dart[] = []) {
  const [match, setMatch] = useState(() => openMatch(setup, initialDarts))
  return {
    match,
    hit: (dart: Dart) => setMatch((m) => throwDart(m, dart)),
    undo: () => setMatch(undoDart),
  }
}
