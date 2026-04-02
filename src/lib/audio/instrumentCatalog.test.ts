import { describe, expect, it } from 'vitest';
import { DEFAULT_INSTRUMENT_ID, getInstrumentDefinition, INSTRUMENTS, isInstrumentId } from './instrumentCatalog';

describe('instrumentCatalog', () => {
  it('returns the default instrument when the id is unknown', () => {
    expect(getInstrumentDefinition('unknown-id').id).toBe(DEFAULT_INSTRUMENT_ID);
  });

  it('recognizes valid instrument ids', () => {
    expect(isInstrumentId(INSTRUMENTS[0].id)).toBe(true);
    expect(isInstrumentId('totally-made-up')).toBe(false);
    expect(isInstrumentId(null)).toBe(false);
  });
});
