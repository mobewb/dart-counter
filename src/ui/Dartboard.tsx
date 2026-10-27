import type { Dart, Multiplier } from '../engine'

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
}

export function Dartboard({ onHit, disabled, targets }: Props) {
  const hit = (segment: number, multiplier: Multiplier) => () => !disabled && onHit({ segment, multiplier })
  return (
    <svg className={`board${disabled ? ' board--off' : ''}`} viewBox="-135 -135 270 270" role="group" aria-label="Dartboard">
      <circle r="124" className="board__rim" />
      <circle r="112" className="board__ring" />
      {ORDER.map((n, i) => {
        const a0 = i * SPAN - SPAN / 2
        const a1 = a0 + SPAN
        const dark = i % 2 === 0
        const fade = targets && !targets.includes(n) ? ' seg--faded' : ''
        const [lx, ly] = point(119, i * SPAN)
        return (
          <g key={n}>
            <path d={sector(R.tripleOut, R.singleOut, a0, a1)} className={(dark ? 'seg seg--dark' : 'seg seg--light') + fade} onClick={hit(n, 1)} />
            <path d={sector(R.outerBull, R.singleIn, a0, a1)} className={(dark ? 'seg seg--dark' : 'seg seg--light') + fade} onClick={hit(n, 1)} />
            <path d={sector(R.singleIn, R.tripleOut, a0, a1)} className={(dark ? 'seg seg--red' : 'seg seg--green') + fade} onClick={hit(n, 3)} />
            <path d={sector(R.singleOut, R.doubleOut, a0, a1)} className={(dark ? 'seg seg--red' : 'seg seg--green') + fade} onClick={hit(n, 2)} />
            <text x={lx} y={ly} className="board__num" textAnchor="middle" dominantBaseline="central">{n}</text>
          </g>
        )
      })}
      <circle r={R.outerBull} className={'seg seg--green' + (targets && !targets.includes(25) ? ' seg--faded' : '')} onClick={hit(25, 1)} />
      <circle r={R.bull} className={'seg seg--red' + (targets && !targets.includes(25) ? ' seg--faded' : '')} onClick={hit(25, 2)} />
    </svg>
  )
}
