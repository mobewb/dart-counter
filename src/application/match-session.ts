import { replayLog, type Dart, type GameMode, type MatchCore, type Move } from '../domain'

/** A match in progress: its config and the dart log, the only source of truth. */
export interface MatchSession<Config> {
  config: Config
  darts: readonly Dart[]
}

export function newSession<Config>(config: Config): MatchSession<Config> {
  return { config, darts: [] }
}

/** The current state and the events of the last dart. */
export function replaySession<Config, State extends MatchCore>(
  mode: GameMode<Config, State>,
  session: MatchSession<Config>,
): Move<State> {
  return replayLog(mode.newMatch(session.config), mode.applyDart, session.darts)
}

/** Adds a dart to the log. Darts thrown after the match is over are ignored. */
export function recordDart<Config, State extends MatchCore>(
  mode: GameMode<Config, State>,
  session: MatchSession<Config>,
  dart: Dart,
): MatchSession<Config> {
  const { state } = replaySession(mode, session)
  if (state.status === 'finished') return session
  // Throws on an invalid dart, so the log never holds one.
  mode.applyDart(state, dart)
  return { ...session, darts: [...session.darts, dart] }
}

/** Removes the last dart; the state is rebuilt by replaying the shorter log. */
export function undo<Config>(session: MatchSession<Config>): MatchSession<Config> {
  return { ...session, darts: session.darts.slice(0, -1) }
}
