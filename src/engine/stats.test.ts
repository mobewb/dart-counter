import { expect, it } from 'vitest'
import { threeDartAverage } from './stats'

const player = (pointsScored: number, dartsThrown: number) => ({
  remaining: 0, in: true, legs: 0, sets: 0, dartsThrown, pointsScored,
})

it('averages points per three darts', () => {
  expect(threeDartAverage(player(180, 3))).toBe(180)
  expect(threeDartAverage(player(100, 6))).toBe(50)
})

it('is zero before any dart', () => {
  expect(threeDartAverage(player(0, 0))).toBe(0)
})
