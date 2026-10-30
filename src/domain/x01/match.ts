import { dartScore, isValidDart, type Dart } from '../shared-kernel/dart'
import { replayLog, type DomainEvent, type Move } from '../shared-kernel/events'
import type { X01Config, X01Match, X01Player } from './types'

const DARTS_PER_TURN = 3

function freshPlayer(config: X01Config): X01Player {
  return {
    remaining: config.startScore,
    in: !config.doubleIn,
    legs: 0,
    sets: 0,
    dartsThrown: 0,
    pointsScored: 0,
  }
}

export function newMatch(config: X01Config): X01Match {
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

function startTurn(state: X01Match, player: number): X01Match {
  const p = state.players[player]!
  return {
    ...state,
    currentPlayer: player,
    turnDarts: [],
    turnStart: { remaining: p.remaining, in: p.in },
  }
}

function startLeg(state: X01Match): X01Match {
  const { config } = state
  const players = state.players.map((p) => ({
    ...p,
    remaining: config.startScore,
    in: !config.doubleIn,
  }))
  const legStarter = (state.legStarter + 1) % config.playerCount
  return startTurn({ ...state, players, legStarter }, legStarter)
}

function updatePlayer(state: X01Match, index: number, patch: Partial<X01Player>): X01Match {
  const players = state.players.map((p, i) => (i === index ? { ...p, ...patch } : p))
  return { ...state, players }
}

export function winLeg(state: X01Match, index: number): Move<X01Match> {
  const { config } = state
  const player = state.players[index]!
  const legs = player.legs + 1
  const legWon: DomainEvent = { type: 'LegWon', player: index }
  const turnEnded: DomainEvent = { type: 'TurnEnded', player: index }

  if (legs < config.legsToWinSet) {
    return { state: startLeg(updatePlayer(state, index, { legs })), events: [legWon, turnEnded] }
  }

  const sets = player.sets + 1
  const resetLegs = state.players.map((p, i) => ({
    ...p,
    legs: 0,
    sets: i === index ? sets : p.sets,
  }))
  const afterSet = { ...state, players: resetLegs }
  const setWon: DomainEvent = { type: 'SetWon', player: index }

  if (sets >= config.setsToWinMatch) {
    return {
      state: { ...afterSet, status: 'finished', winner: index, turnDarts: [] },
      events: [legWon, setWon, { type: 'MatchWon', player: index }],
    }
  }
  return { state: startLeg(afterSet), events: [legWon, setWon, turnEnded] }
}

export function applyDart(state: X01Match, dart: Dart): Move<X01Match> {
  if (state.status === 'finished') throw new Error('Match is finished')
  if (!isValidDart(dart)) throw new Error(`Invalid dart: ${dart.multiplier}x${dart.segment}`)

  const { config, currentPlayer } = state
  const player = state.players[currentPlayer]!
  const counts = player.in || dart.multiplier === 2
  const next = counts ? player.remaining - dartScore(dart) : player.remaining
  const dartsThrown = player.dartsThrown + 1
  const turnDarts = [...state.turnDarts, dart]
  const nextPlayer = (currentPlayer + 1) % config.playerCount
  const turnEnded: DomainEvent = { type: 'TurnEnded', player: currentPlayer }

  const finished = next === 0 && (!config.doubleOut || dart.multiplier === 2)
  const bust = next < 0 || (next === 0 && !finished) || (config.doubleOut && next === 1)

  if (bust) {
    const patched = updatePlayer(state, currentPlayer, {
      remaining: state.turnStart.remaining,
      in: state.turnStart.in,
      dartsThrown,
      pointsScored: player.pointsScored - (state.turnStart.remaining - player.remaining),
    })
    return { state: startTurn(patched, nextPlayer), events: [{ type: 'Bust', player: currentPlayer }, turnEnded] }
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
    return { state: startTurn(patched, nextPlayer), events: [turnEnded] }
  }
  return { state: { ...patched, turnDarts }, events: [] }
}

/** Rebuilds the match from its dart log; undo is replaying one dart fewer. */
export function replay(config: X01Config, darts: readonly Dart[]): X01Match {
  return replayLog(newMatch(config), applyDart, darts).state
}
