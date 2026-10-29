import { describe, expect, it } from 'vitest'
import { rematch, startMatch } from './match-setup'

const names = ['Ann', 'Bob']
const rules = { startScore: 501, doubleIn: false, doubleOut: true, legsToWinSet: 3, setsToWinMatch: 1 }

describe('startMatch', () => {
  it('builds an X01 config with one player per name', () => {
    expect(startMatch({ mode: 'x01', names, rules })).toEqual({
      mode: 'x01',
      config: { ...rules, playerCount: 2 },
      names,
    })
  })

  it('builds standard cricket with fixed targets', () => {
    const setup = startMatch({ mode: 'cricket', names })
    expect(setup.mode).toBe('cricket')
    expect(setup.config).toMatchObject({ playerCount: 2, targetPolicy: { kind: 'fixed' } })
  })

  it('passes the round limit to the config, and keeps it on a crazy rematch', () => {
    expect(startMatch({ mode: 'cricket', names, maxRounds: 20 }).config.maxRounds).toBe(20)
    expect(startMatch({ mode: 'x01', names, rules, maxRounds: 0 }).config.maxRounds).toBe(0)
    expect(rematch(startMatch({ mode: 'crazy', names, maxRounds: 15 })).config.maxRounds).toBe(15)
  })

  it('builds Around the Clock with skip ahead on', () => {
    expect(startMatch({ mode: 'clock', names }).config).toMatchObject({ playerCount: 2, skipAhead: true })
  })

  it('builds Killer with the chosen lives, one side per name', () => {
    expect(startMatch({ mode: 'killer', names, rules: { lives: 3 } })).toEqual({
      mode: 'killer',
      config: { lives: 3, playerCount: 2 },
      names,
    })
  })

  it('deals crazy cricket from the injected random source', () => {
    const a = startMatch({ mode: 'crazy', names }, () => 0.1)
    const b = startMatch({ mode: 'crazy', names }, () => 0.1)
    expect(a).toEqual(b)
    expect(a.config).toMatchObject({ playerCount: 2, targetPolicy: { kind: 'reroll' } })
  })
})

describe('rematch', () => {
  it('keeps X01 and standard cricket setups as they are', () => {
    const x01 = startMatch({ mode: 'x01', names, rules })
    const cricket = startMatch({ mode: 'cricket', names })
    expect(rematch(x01)).toBe(x01)
    expect(rematch(cricket)).toBe(cricket)
  })

  it('deals crazy cricket again for the same players', () => {
    const first = startMatch({ mode: 'crazy', names }, () => 0)
    const again = rematch(first, () => 0.99)
    if (first.mode !== 'crazy' || again.mode !== 'crazy') throw new Error('expected crazy cricket')
    expect(again.names).toEqual(names)
    expect(again.config.playerCount).toBe(2)
    expect(again.config.targets).not.toEqual(first.config.targets)
  })
})
