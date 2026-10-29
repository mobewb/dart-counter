import type { Families, FamilyId, GameModeId } from '../application/modes'
import type { Key } from './i18n'
import { clockRecordChips, clockView } from './modes/clock/view'
import { crazyCricketView, cricketRecordChips, cricketView } from './modes/cricket/view'
import { killerRecordChips, killerView } from './modes/killer/view'
import type { ModeView } from './modes/types'
import { x01RecordChips, x01View } from './modes/x01/view'

/** One view per game mode. */
export const registry: { [K in GameModeId]: ModeView<K> } = {
  x01: x01View,
  cricket: cricketView,
  crazy: crazyCricketView,
  clock: clockView,
  killer: killerView,
}

/** A player's history record of one rule family as short chips, in the order the history lists them. */
export const recordChips: { [F in FamilyId]: (record: Families[F]['record'], t: (key: Key) => string) => string[] } = {
  x01: x01RecordChips,
  cricket: cricketRecordChips,
  clock: clockRecordChips,
  killer: killerRecordChips,
}
