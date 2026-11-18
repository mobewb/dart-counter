import type { Dart, Multiplier } from '../domain'

/** Clockwise from the top. */
const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5]

/** Stylised radii (not to scale) so triples and doubles are finger-sized. */
const R = { bull: 9, outerBull: 20, singleIn: 60, tripleOut: 74, singleOut: 92, doubleOut: 106 }
const SPAN = (Math.PI * 2) / 20

const point = (r: number, a: number) => [r * Math.sin(a), -r * Math.cos(a)] as const

function sector(r1: number, r2: number, a0: number, a1: number): string {
  const [x1, y1] = point(r2, a0)
  const [x2, y2] = point(r2, a1)
  const [x3, y3] = point(r1, a1)
  const [x4, y4] = point(r1, a0)
  return `M${x1} ${y1}A${r2} ${r2} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 0 0 ${x4} ${y4}Z`
}

interface Props {
  onHit: (dart: Dart) => void
  disabled?: boolean
  /** When set, numbers outside this list are faded (cricket). */
  targets?: number[]
  /** Numbers marked with a skull on their double ring (Killer). */
  marked?: number[]
  /** Darts to aim at, outlined in gold; every other bed is faded while there are any. */
  aim?: Dart[]
}

/** The shapes of one numbered bed: two for a single (outer and inner), one otherwise. The bull is drawn as circles. */
function bed({ segment, multiplier }: Dart): string[] {
  const i = ORDER.indexOf(segment)
  const a0 = i * SPAN - SPAN / 2
  const a1 = a0 + SPAN
  if (multiplier === 3) return [sector(R.singleIn, R.tripleOut, a0, a1)]
  if (multiplier === 2) return [sector(R.singleOut, R.doubleOut, a0, a1)]
  return [sector(R.tripleOut, R.singleOut, a0, a1), sector(R.outerBull, R.singleIn, a0, a1)]
}

export function Dartboard({ onHit, disabled, targets, marked, aim = [] }: Props) {
  const faded = (segment: number, multiplier: Multiplier) =>
    (targets && !targets.includes(segment)) || (aim.length > 0 && !aim.some((d) => d.segment === segment && d.multiplier === multiplier))
  const hit = (segment: number, multiplier: Multiplier) => () => !disabled && onHit({ segment, multiplier })
  return (
    <svg className={`board${disabled ? ' board--off' : ''}`} viewBox="-135 -135 270 270" role="group" aria-label="Dartboard">
      <circle r="124" className="board__rim" />
      <circle r="112" className="board__ring" />
      {ORDER.map((n, i) => {
        const dark = i % 2 === 0
        const [lx, ly] = point(119, i * SPAN)
        const [sx, sy] = point((R.singleOut + R.doubleOut) / 2, i * SPAN)
        return (
          <g key={n}>
            {([1, 3, 2] as const).flatMap((m) => bed({ segment: n, multiplier: m }).map((d, j) => (
              <path key={`${m}-${j}`} d={d} className={(m === 1 ? (dark ? 'seg seg--dark' : 'seg seg--light') : (dark ? 'seg seg--red' : 'seg seg--green')) + (faded(n, m) ? ' seg--faded' : '')} onClick={hit(n, m)} />
            )))}
            <text x={lx} y={ly} className="board__num" textAnchor="middle" dominantBaseline="central">{n}</text>
            {marked?.includes(n) && <text x={sx} y={sy} className="board__skull" textAnchor="middle" dominantBaseline="central">💀</text>}
          </g>
        )
      })}
      <circle r={R.outerBull} className={'seg seg--green' + (faded(25, 1) ? ' seg--faded' : '')} onClick={hit(25, 1)} />
      <circle r={R.bull} className={'seg seg--red' + (faded(25, 2) ? ' seg--faded' : '')} onClick={hit(25, 2)} />
      {/* Drawn last so no neighbouring bed covers the outline; taps go through to the beds. */}
      <g className="board__wins" aria-hidden="true">
        {aim.flatMap((dart) => {
          const key = `${dart.multiplier}x${dart.segment}`
          if (dart.segment !== 25) return bed(dart).map((d, j) => <path key={`${key}-${j}`} d={d} />)
          // The outer bull is the ring around the bull's eye.
          const radii = dart.multiplier === 2 ? [R.bull] : [R.outerBull, R.bull]
          return radii.map((r) => <circle key={`${key}-${r}`} r={r} />)
        })}
      </g>
    </svg>
  )
}
