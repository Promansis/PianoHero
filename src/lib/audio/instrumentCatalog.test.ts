import { describe, expect, it } from 'vitest';
import {
  DEFAULT_INSTRUMENT_ID,
  getInstrumentDefinition,
  getInstrumentSustainReleaseTailSec,
  INSTRUMENTS,
  isInstrumentId,
  isInstrumentSelectable,
} from './instrumentCatalog';

describe('instrumentCatalog', () => {
  it('returns the default instrument when the id is unknown', () => {
    expect(getInstrumentDefinition('unknown-id').id).toBe(DEFAULT_INSTRUMENT_ID);
  });

  it('recognizes valid instrument ids', () => {
    expect(isInstrumentId(INSTRUMENTS[0].id)).toBe(true);
    expect(isInstrumentId('clarinet')).toBe(true);
    expect(isInstrumentId('saxophone')).toBe(true);
    expect(isInstrumentId('trumpet')).toBe(true);
    expect(isInstrumentId('french-horn')).toBe(true);
    expect(isInstrumentId('totally-made-up')).toBe(false);
    expect(isInstrumentId(null)).toBe(false);
  });

  it('ships pilot redistributable flute and trumpet samples while keeping other orchestral expansion instruments', () => {
    expect(getInstrumentDefinition('flute').voice).toBe('sampler');
    expect(getInstrumentDefinition('flute').sampleBaseUrl).toBe('/samples/nbrosowsky/flute/');
    expect(getInstrumentDefinition('flute').sampleUrls).toMatchObject({
      C4: 'C4.mp3',
      C7: 'C7.mp3',
    });
    expect(getInstrumentDefinition('trumpet').sampleUrls).toMatchObject({
      F3: 'F3.mp3',
      'A#4': 'As4.mp3',
    });
    expect(getInstrumentDefinition('clarinet').sampleBaseUrl).toBe('/samples/philharmonia/clarinet/');
    expect(getInstrumentDefinition('saxophone').voice).toBe('sampler');
    expect(getInstrumentDefinition('saxophone').sampleBaseUrl).toBe('/samples/philharmonia/saxophone/');
    expect(getInstrumentDefinition('saxophone').sampleUrls).toMatchObject({
      A3: 'saxophone_A3_1_piano_normal.mp3',
      C5: 'saxophone_C5_1_piano_normal.mp3',
    });
  });

  it('ships bundled low-string defaults for cello and string ensemble', () => {
    expect(isInstrumentSelectable('cello')).toBe(true);
    expect(isInstrumentSelectable('string-ensemble')).toBe(true);
    expect(getInstrumentDefinition('cello').sampleBaseUrl).toBe('/samples/fluidr3/cello/');
    expect(getInstrumentDefinition('string-ensemble').sampleBaseUrl).toBe('/samples/fluidr3/string-ensemble/');
  });

  it('uses sampled piano content for honky-tonk and derives sustain tails per instrument', () => {
    expect(getInstrumentDefinition('honky-tonk').voice).toBe('sampler');
    expect(getInstrumentDefinition('honky-tonk').sampleBaseUrl).toBe('/samples/salamander/');
    expect(getInstrumentSustainReleaseTailSec('warm-pad')).toBeGreaterThan(getInstrumentSustainReleaseTailSec('acoustic-piano'));
  });
});
