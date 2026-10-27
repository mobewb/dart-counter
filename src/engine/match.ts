import type { Dart, MatchConfig, MatchState, PlayerState } from './types'

const DARTS_PER_TURN = 3

export function dartScore(dart: Dart): number {
  return dart.segment * dart.multiplier
}

export function isValidDart({ segment, multiplier }: Dart): boolean {
  if (segment === 0) return multiplier === 1
  if (segment === 25) return multiplier !== 3
  return Number.isInteger(segment) && segment >= 1 && segment <= 20
}

function freshPlayer(config: MatchConfig): PlayerState {
  return {
    remaining: config.startScore,
    in: !config.doubleIn,
    legs: 0,
    sets: 0,
    dartsThrown: 0,
    pointsScored: 0,
  }
}

export function newMatch(config: MatchConfig): MatchState {
  const players = Array.from({ length: config.playerCount }, () => freshPlayer(config))
  return {
    config,
    players,
    currentPlayer: 0,
    legStarter: 0,
    turnDarts: [],
    turnStart: { remaining: config.startScore, in: !config.doubleIn },
    status: 'playing',
    winner: null,
  }
}

function startTurn(state: MatchState, player: number): MatchState {
  const p = state.players[player]!
  return {
    ...state,
    currentPlayer: player,
    turnDarts: [],
    turnStart: { remaining: p.remaining, in: p.in },
  }
}

function startLeg(state: MatchState): MatchState {
  const { config } = state
  const players = state.players.map((p) => ({
    ...p,
    remaining: config.startScore,
    in: !config.doubleIn,
  }))
  const legStarter = (state.legStarter + 1) % config.playerCount
  return startTurn({ ...state, players, legStarter }, legStarter)
}

function updatePlayer(state: MatchState, index: number, patch: Partial<PlayerState>): MatchState {
  const players = state.players.map((p, i) => (i === index ? { ...p, ...patch } : p))
  return { ...state, players }
}

function winLeg(state: MatchState, index: number): MatchState {
  const { config } = state
  const player = state.players[index]!
  const legs = player.legs + 1

  if (legs < config.legsToWinSet) {
    return startLeg(updatePlayer(state, index, { legs }))
  }

  const sets = player.sets + 1
  const resetLegs = state.players.map((p, i) => ({
    ...p,
    legs: 0,
    sets: i === index ? sets : p.sets,
  }))
  const afterSet = { ...state, players: resetLegs }

  if (sets >= config.setsToWinMatch) {
    return { ...afterSet, status: 'finished', winner: index, turnDarts: [] }
  }
  return startLeg(afterSet)
}

export function throwDart(state: MatchState, dart: Dart): MatchState {
  if (state.status === 'finished') throw new Error('Match is finished')
  if (!isValidDart(dart)) throw new Error(`Invalid dart: ${dart.multiplier}x${dart.segment}`)

  const { config, currentPlayer } = state
  const player = state.players[currentPlayer]!
  const counts = player.in || dart.multiplier === 2
  const next = counts ? player.remaining - dartScore(dart) : player.remaining
  const dartsThrown = player.dartsThrown + 1
  const turnDarts = [...state.turnDarts, dart]

  const finished = next === 0 && (!config.doubleOut || dart.multiplier === 2)
  const bust = next < 0 || (next === 0 && !finished) || (config.doubleOut && next === 1)

  if (bust) {
    const patched = updatePlayer(state, currentPlayer, {
      remaining: state.turnStart.remaining,
      in: state.turnStart.in,
      dartsThrown,
      pointsScored: player.pointsScored - (state.turnStart.remaining - player.remaining),
    })
    return startTurn(patched, (currentPlayer + 1) % config.playerCount)
  }

  const pointsScored = player.pointsScored + (player.remaining - next)
  const patched = updatePlayer(state, currentPlayer, {
    remaining: next,
    in: player.in || counts,
    dartsThrown,
    pointsScored,
  })

  if (finished) return winLeg(patched, currentPlayer)

  if (turnDarts.length >= DARTS_PER_TURN) {
    return startTurn(patched, (currentPlayer + 1) % config.playerCount)
  }
  return { ...patched, turnDarts }
}

/** Rebuilds the match from its dart log; undo is replaying one dart fewer. */
export function replay(config: MatchConfig, darts: readonly Dart[]): MatchState {
  return darts.reduce(throwDart, newMatch(config))
}
