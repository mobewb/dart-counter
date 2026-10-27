/** Points per 3 darts, counting darts of busted turns but not their points. */
export function threeDartAverage({ pointsScored, dartsThrown }: { pointsScored: number; dartsThrown: number }): number {
  if (dartsThrown === 0) return 0
  return (pointsScored / dartsThrown) * 3
}
