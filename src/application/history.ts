import { openMatch, type Match } from './match'
import type { FinishedMatch, MatchRepository } from './match-repository'
import { sidesOf } from './match-setup'
import { modules, type Families, type FamilyId, type GameModeId, type RecordOf } from './modes'

/**
 * A player's record across the match history. Players are matched by name,
 * ignoring case. A rule family's figures are there once they have played it;
 * Cricket and Crazy Cricket add up together.
 */
export interface PlayerRecord {
  name: string
  matches: number
  wins: number
  /** Most recent match, as a timestamp. */
  lastPlayed: number
  modes: { [F in FamilyId]?: Families[F]['record'] }
}

const key = (name: string) => name.trim().toLocaleLowerCase()

/** Names filled in for players left unnamed ("Player 2", "Joueur 3"): not a real person to track. */
const isPlaceholder = (name: string) => /^(player|joueur) \d+$/i.test(name.trim())

type FamilyRecords = PlayerRecord['modes']

/** A rule family's record, added up with one more match's stats. */
function added<F extends FamilyId>(records: FamilyRecords, family: F, add: (record: Families[F]['record'] | undefined) => Families[F]['record']): FamilyRecords {
  return { ...records, [family]: add(records[family]) }
}

/** Adds one player's stats from a match to their record of the match's rule family. */
function addStats<K extends GameModeId>(record: PlayerRecord, match: Match<K>, player: number): void {
  const { family, history } = modules[match.setup.mode]
  record.modes = added(record.modes, family, (previous: RecordOf<K> | undefined) => history.add(previous ?? history.empty, match.stats[player]!))
}

/**
 * Every named player's record, most matches first. Stats are recomputed from
 * each match's dart log; placeholder names are left out.
 */
export function playerRecords(history: readonly FinishedMatch[]): PlayerRecord[] {
  const records = new Map<string, PlayerRecord>()
  // Oldest first, so the most recent spelling of a name wins.
  for (const finished of [...history].sort((a, b) => a.finishedAt - b.finishedAt)) {
    const match = openMatch(finished.setup, finished.darts)
    const winners = sidesOf(finished.setup)[finished.winner] ?? []
    finished.setup.names.forEach((name, player) => {
      if (isPlaceholder(name)) return
      const record = records.get(key(name)) ?? { name, matches: 0, wins: 0, lastPlayed: 0, modes: {} }
      records.set(key(name), record)
      record.name = name.trim()
      record.matches++
      if (winners.includes(player)) record.wins++
      record.lastPlayed = Math.max(record.lastPlayed, finished.finishedAt)
      addStats(record, match, player)
    })
  }
  return [...records.values()].sort((a, b) => b.matches - a.matches || b.lastPlayed - a.lastPlayed)
}

/** The match history, most recent first. */
export function loadHistory(repository: MatchRepository): Promise<FinishedMatch[]> {
  return repository.listFinished()
}

export function deleteFromHistory(repository: MatchRepository, id: string): Promise<void> {
  return repository.removeFinished(id)
}
