import { describe, expect, it } from 'vitest'
import type { Dart } from '../../domain'
import { openMatch } from '../match'
import { rematch, startMatch, type MatchRequest } from '../match-setup'
import { gameModes, modules, type GameModeId, type Setup } from '.'

const miss: Dart = { segment: 0, multiplier: 1 }
const misses = (n: number) => Array.from({ length: n }, () => miss)

const requests: { [K in GameModeId]: MatchRequest & { mode: K } } = {
  x01: { mode: 'x01', names: ['Ann', 'Bob'], options: { startScore: 501, doubleIn: false, doubleOut: true, legsToWinSet: 1, setsToWinMatch: 1 } },
  cricket: { mode: 'cricket', names: ['Ann', 'Bob'], options: {} },
  crazy: { mode: 'crazy', names: ['Ann', 'Bob'], options: {} },
  clock: { mode: 'clock', names: ['Ann', 'Bob'], options: {} },
  killer: { mode: 'killer', names: ['Ann', 'Bob'], options: { lives: 3 } },
  three21: { mode: 'three21', names: ['Ann', 'Bob'], options: {} },
}

/** A player's history record after one match. */
function addedOnce<K extends GameModeId>(setup: Setup<K>, darts: Dart[]) {
  const { history } = modules[setup.mode]
  return history.add(history.empty, openMatch(setup, darts).stats[0]!)
}

/** Rules every mode module must follow, whatever its game mode. */
describe.each(gameModes)('the %s module', (id) => {
  const module = modules[id]
  const random = () => 0.5

  it('is listed under its own id', () => {
    expect(module.id).toBe(id)
  })

  it('deals a config its rules can play, with the round limit picked', () => {
    const setup = startMatch({ ...requests[id], maxRounds: 2 }, random)
    expect(setup.config.playerCount).toBe(2)
    expect(setup.config.maxRounds).toBe(2)
    expect(openMatch(setup, misses(6)).darts).toHaveLength(6)
  })

  it('keeps the mode, sides and round limit for a rematch', () => {
    const setup = startMatch({ ...requests[id], maxRounds: 3 }, random)
    const again = rematch(setup, () => 0.1)
    expect(again.mode).toBe(id)
    expect(again.names).toEqual(setup.names)
    expect(again.config.playerCount).toBe(2)
    expect(again.config.maxRounds).toBe(3)
  })

  it('has stats for every player, and adds them up in the history', () => {
    const setup = startMatch(requests[id], random)
    expect(openMatch(setup, misses(12)).stats).toHaveLength(2)
    expect(addedOnce(setup, misses(12)).matches).toBe(1)
  })
})
