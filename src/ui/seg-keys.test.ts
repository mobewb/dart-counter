import { describe, expect, it } from 'vitest'
import { optionAfterKey } from './seg-keys'

describe('optionAfterKey', () => {
  it('moves to the next option with the right or down arrow', () => {
    expect(optionAfterKey('ArrowRight', 0, 3)).toBe(1)
    expect(optionAfterKey('ArrowDown', 1, 3)).toBe(2)
  })

  it('wraps from the last option to the first', () => {
    expect(optionAfterKey('ArrowRight', 2, 3)).toBe(0)
  })

  it('moves back with the left or up arrow, wrapping from the first to the last', () => {
    expect(optionAfterKey('ArrowLeft', 2, 3)).toBe(1)
    expect(optionAfterKey('ArrowUp', 0, 3)).toBe(2)
  })

  it('jumps to the first option with Home and the last with End', () => {
    expect(optionAfterKey('Home', 2, 3)).toBe(0)
    expect(optionAfterKey('End', 0, 6)).toBe(5)
  })

  it('ignores keys that do not move, so Tab and Space keep their usual job', () => {
    expect(optionAfterKey('Tab', 1, 3)).toBeNull()
    expect(optionAfterKey(' ', 1, 3)).toBeNull()
  })
})
