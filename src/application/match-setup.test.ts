import { describe, expect, it } from 'vitest'
import { rematch, startMatch } from './match-setup'

const names = ['Ann', 'Bob']
const rules = { startScore: 501, doubleIn: false, doubleOut: true, legsToWinSet: 3, setsToWinMatch: 1 }

describe('startMatch', () => {
  it('builds an X01 config with one player per name', () => {
    expect(startMatch({ mode: 'x01', names, options: rules })).toEqual({
      mode: 'x01',
      config: { ...rules, playerCount: 2 },
      names,
    })
  })

  it('builds standard cricket with fixed targets', () => {
    const setup = startMatch({ mode: 'cricket', options: {}, names })
    expect(setup.mode).toBe('cricket')
    expect(setup.config).toMatchObject({ playerCount: 2, targetPolicy: { kind: 'fixed' } })
  })

  it('passes the round limit to the config, and keeps it on a crazy rematch', () => {
    expect(startMatch({ mode: 'cricket', options: {}, names, maxRounds: 20 }).config.maxRounds).toBe(20)
    expect(startMatch({ mode: 'x01', names, options: rules, maxRounds: 0 }).config.maxRounds).toBe(0)
    expect(rematch(startMatch({ mode: 'crazy', options: {}, names, maxRounds: 15 })).config.maxRounds).toBe(15)
  })

  it('builds Around the Clock with skip ahead on', () => {
    expect(startMatch({ mode: 'clock', options: {}, names }).config).toMatchObject({ playerCount: 2, skipAhead: true })
  })

  it('builds Killer with the chosen lives, one side per name', () => {
    expect(startMatch({ mode: 'killer', names, options: { lives: 3 } })).toEqual({
      mode: 'killer',
      config: { lives: 3, playerCount: 2 },
      names,
    })
  })

  it('needs as many sides as the game mode', () => {
    expect(() => startMatch({ mode: 'killer', names: ['Ann'], options: { lives: 3 } })).toThrow()
    expect(startMatch({ mode: 'clock', options: {}, names: ['Ann'] }).config.playerCount).toBe(1)
  })

  it('deals crazy cricket from the injected random source', () => {
    const a = startMatch({ mode: 'crazy', options: {}, names }, () => 0.1)
    const b = startMatch({ mode: 'crazy', options: {}, names }, () => 0.1)
    expect(a).toEqual(b)
    expect(a.config).toMatchObject({ playerCount: 2, targetPolicy: { kind: 'reroll' } })
  })
})

describe('crazy cricket deal', () => {
  const deal = (random: () => number) => {
    const setup = startMatch({ mode: 'crazy', options: {}, names }, random)
    if (setup.mode !== 'crazy') throw new Error('expected crazy cricket')
    return setup.config
  }

  it('picks six distinct numbers sorted high to low plus the bull', () => {
    const picked = deal(() => 0.42).targets
    expect(picked).toHaveLength(7)
    expect(picked.at(-1)).toBe(25)
    const numbers = picked.slice(0, -1)
    expect(new Set(numbers).size).toBe(6)
    expect([...numbers].sort((a, b) => b - a)).toEqual(numbers)
    expect(numbers.every((n) => n >= 1 && n <= 20)).toBe(true)
  })

  it('varies with the random source', () => {
    expect(deal(() => 0).targets).not.toEqual(deal(() => 0.99).targets)
  })

  it('pairs six targets with a reroll pool of the unused numbers', () => {
    const config = deal(() => 0.3)
    const pool = config.targetPolicy.kind === 'reroll' ? config.targetPolicy.pool : []
    expect(pool).toHaveLength(14)
    expect(new Set([...config.targets.slice(0, -1), ...pool]).size).toBe(20)
  })
})

describe('rematch', () => {
  it('keeps X01 and standard cricket setups as they are', () => {
    const x01 = startMatch({ mode: 'x01', names, options: rules })
    const cricket = startMatch({ mode: 'cricket', options: {}, names })
    expect(rematch(x01)).toBe(x01)
    expect(rematch(cricket)).toBe(cricket)
  })

  it('deals crazy cricket again for the same players', () => {
    const first = startMatch({ mode: 'crazy', options: {}, names }, () => 0)
    const again = rematch(first, () => 0.99)
    if (first.mode !== 'crazy' || again.mode !== 'crazy') throw new Error('expected crazy cricket')
    expect(again.names).toEqual(names)
    expect(again.config.playerCount).toBe(2)
    expect(again.config.targets).not.toEqual(first.config.targets)
  })
})
