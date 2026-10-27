import { describe, expect, it } from 'vitest'
import { cricket } from '../domain'
import { cricketConfig } from './cricket-config'

const pool = (config: cricket.CricketConfig) =>
  config.targetPolicy.kind === 'reroll' ? config.targetPolicy.pool : []

describe('cricketConfig', () => {
  it('standard cricket uses fixed targets, 20 to 15 plus the bull', () => {
    expect(cricketConfig('cricket', 2)).toEqual({
      playerCount: 2,
      targets: [20, 19, 18, 17, 16, 15, 25],
      targetPolicy: { kind: 'fixed' },
    })
  })

  it('crazy cricket picks six distinct numbers sorted high to low plus the bull', () => {
    const picked = cricketConfig('crazy', 2, () => 0.42).targets
    expect(picked).toHaveLength(7)
    expect(picked.at(-1)).toBe(25)
    const numbers = picked.slice(0, -1)
    expect(new Set(numbers).size).toBe(6)
    expect([...numbers].sort((a, b) => b - a)).toEqual(numbers)
    expect(numbers.every((n) => n >= 1 && n <= 20)).toBe(true)
  })

  it('crazy cricket varies with the random source', () => {
    const a = cricketConfig('crazy', 2, () => 0).targets
    const b = cricketConfig('crazy', 2, () => 0.99).targets
    expect(a).not.toEqual(b)
  })

  it('crazy cricket pairs six targets with a reroll pool of the unused numbers', () => {
    const config = cricketConfig('crazy', 2, () => 0.3)
    const numbers = config.targets.slice(0, -1)
    expect(pool(config)).toHaveLength(14)
    expect(new Set([...numbers, ...pool(config)]).size).toBe(20)
  })
})
