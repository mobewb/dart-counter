import { useCallback, useMemo, useState } from 'react'
import type { MatchSetup } from '../../../application/match-setup'
import { cricket } from '../../../domain'
import { useI18n } from '../../i18n'
import type { ModeView, ViewProps } from '../types'
import { TargetsStrip } from './TargetsStrip'

type CricketSetup = Extract<MatchSetup, { mode: 'cricket' | 'crazy' }>

const MARK = ['', '／', '✕', '⊗']
const targetLabel = (target: number) => (target === 25 ? 'B' : String(target))

function useCricketView({ setup, sides, state: match, events, dartCount }: ViewProps<CricketSetup, cricket.CricketMatch>) {
  const { t } = useI18n()
  const { config } = setup
  const finished = match.status === 'finished'

  // Crazy cricket spins a roulette for the opening numbers and for every reroll.
  // A resumed match (darts already thrown) does not spin again.
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [spin, setSpin] = useState<number[] | null>(() =>
    setup.mode === 'crazy' && !reduced && dartCount === 0 ? config.targets.flatMap((n, i) => (n === 25 ? [] : [i])) : null,
  )
  const [seenDarts, setSeenDarts] = useState(dartCount)
  if (dartCount !== seenDarts) {
    // Derived during render so the new numbers never flash before the spin.
    // Only a newly thrown dart spins; undoing back onto a reroll does not.
    setSeenDarts(dartCount)
    const roll = events.find((e) => e.type === 'TargetsRerolled')
    if (dartCount > seenDarts && roll?.type === 'TargetsRerolled' && !reduced) setSpin(roll.replaced)
  }
  const spinning = spin !== null
  const endSpin = useCallback(() => setSpin(null), [])
  const dead = useMemo(
    () => new Set(match.targets.filter((target) => match.players.every((p) => cricket.isClosed(p, target)))),
    [match.targets, match.players],
  )

  return {
    info: <strong>{setup.mode === 'crazy' ? t('crazy') : t('cricket')}</strong>,
    board: (
      <>
        <TargetsStrip targets={match.targets} dead={dead} spin={spin} onSpinEnd={endSpin} />

        <section className={`cricket${spinning ? ' cricket--hidden' : ''}`} style={{ ['--cols' as string]: match.players.length }}>
          <div className="cricket__head">
            <div className="cricket__corner">{t('points')}</div>
            {match.players.map((p, i) => (
              <div key={i} className={`cricket__player${i === match.currentPlayer && !finished ? ' is-active' : ''}${match.winner === i ? ' is-winner' : ''}`}>
                <span className="cricket__name">{sides[i]}</span>
                <span className="cricket__points">{p.points}</span>
              </div>
            ))}
          </div>
          {match.targets.map((target) => {
            const dead = match.players.every((p) => cricket.isClosed(p, target))
            return (
              <div key={target} className={`cricket__row${dead ? ' is-dead' : ''}`} title={dead ? t('closedByAll') : undefined}>
                <div className="cricket__target">{targetLabel(target)}</div>
                {match.players.map((p, i) => {
                  const marks = cricket.marksOn(p, target)
                  return (
                    <div key={i} className={`cricket__cell marks-${marks}${i === match.currentPlayer && !finished ? ' is-active' : ''}`}>
                      {MARK[marks]}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </section>
      </>
    ),
    targets: match.targets,
    locked: spinning,
  }
}

export const cricketView: ModeView<CricketSetup, cricket.CricketMatch> = {
  rules: cricket.mode,
  label: 'cricket',
  hint: 'cricketHint',
  result: { label: 'points', format: String },
  useView: useCricketView,
}

export const crazyCricketView: ModeView<CricketSetup, cricket.CricketMatch> = { ...cricketView, label: 'crazy', hint: 'crazyHint' }
