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

  it('ships Philharmonia-backed sampled instruments for the private-use expansion', () => {
    expect(getInstrumentDefinition('flute').voice).toBe('sampler');
    expect(getInstrumentDefinition('clarinet').sampleBaseUrl).toBe('/samples/philharmonia/clarinet/');
    expect(getInstrumentDefinition('trumpet').sampleUrls).toMatchObject({
      'A#3': 'trumpet_As3_long_piano_normal.mp3',
      A4: 'trumpet_A4_long_piano_normal.mp3',
    });
    expect(getInstrumentDefinition('saxophone').voice).toBe('sampler');
    expect(getInstrumentDefinition('saxophone').sampleBaseUrl).toBe('/samples/philharmonia/saxophone/');
    expect(getInstrumentDefinition('saxophone').sampleUrls).toMatchObject({
      A3: 'saxophone_A3_1_piano_normal.mp3',
      C5: 'saxophone_C5_1_piano_normal.mp3',
    });
  });

  it('exposes placeholder orchestral entries without enabling synth fallback selection', () => {
    expect(isInstrumentSelectable('cello')).toBe(false);
    expect(isInstrumentSelectable('string-ensemble')).toBe(false);
    expect(getInstrumentDefinition('cello').availabilityNote).toMatch(/Sample assets are not installed yet/i);
  });

  it('uses sampled piano content for honky-tonk and derives sustain tails per instrument', () => {
    expect(getInstrumentDefinition('honky-tonk').voice).toBe('sampler');
    expect(getInstrumentDefinition('honky-tonk').sampleBaseUrl).toBe('/samples/salamander/');
    expect(getInstrumentSustainReleaseTailSec('warm-pad')).toBeGreaterThan(getInstrumentSustainReleaseTailSec('acoustic-piano'));
  });
});
