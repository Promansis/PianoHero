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

  it('ships redistributable and bundled sampled instruments on the expected source folders', () => {
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
    expect(getInstrumentDefinition('saxophone').sampleBaseUrl).toBe('/samples/fluidr3/saxophone/');
    expect(getInstrumentDefinition('saxophone').sampleUrls).toMatchObject({
      A3: 'A3.mp3',
      C6: 'C6.mp3',
    });
    expect(getInstrumentDefinition('marimba').sampleBaseUrl).toBe('/samples/fluidr3/marimba/');
    expect(getInstrumentDefinition('bell').sampleBaseUrl).toBe('/samples/fluidr3/bell/');
    expect(getInstrumentDefinition('vibraphone').sampleBaseUrl).toBe('/samples/fluidr3/vibraphone/');
  });

  it('ships bundled low-string defaults for cello and string ensemble', () => {
    expect(isInstrumentSelectable('cello')).toBe(true);
    expect(isInstrumentSelectable('string-ensemble')).toBe(true);
    expect(getInstrumentDefinition('cello').sampleBaseUrl).toBe('/samples/fluidr3/cello/');
    expect(getInstrumentDefinition('string-ensemble').sampleBaseUrl).toBe('/samples/fluidr3/string-ensemble/');
  });

  it('uses distinct bundled samples for honky-tonk and derives sustain tails per instrument', () => {
    expect(getInstrumentDefinition('honky-tonk').voice).toBe('sampler');
    expect(getInstrumentDefinition('honky-tonk').sampleBaseUrl).toBe('/samples/fluidr3/honky-tonk/');
    expect(getInstrumentDefinition('honky-tonk').sampleUrls).toMatchObject({
      C4: 'C4.mp3',
      G6: 'G6.mp3',
    });
    expect(getInstrumentSustainReleaseTailSec('warm-pad')).toBeGreaterThan(getInstrumentSustainReleaseTailSec('acoustic-piano'));
  });

  it('separates the chip, laser, and lead synth presets by engine and envelope shape', () => {
    const chiptune = getInstrumentDefinition('8-bit');
    const laser = getInstrumentDefinition('laser');
    const lead = getInstrumentDefinition('synth-lead');

    expect(chiptune.voice).toBe('synth');
    expect(laser.voice).toBe('mono');
    expect(lead.voice).toBe('fm');

    expect((chiptune.options as { oscillator: { type: string } }).oscillator.type).toBe('square8');
    expect((laser.options as { filterEnvelope: { octaves: number } }).filterEnvelope.octaves).toBeGreaterThan(5);
    expect((lead.options as { oscillator: { type: string } }).oscillator.type).toBe('triangle');

    expect(getInstrumentSustainReleaseTailSec('synth-lead')).toBeGreaterThan(getInstrumentSustainReleaseTailSec('laser'));
    expect(getInstrumentSustainReleaseTailSec('laser')).toBeGreaterThanOrEqual(getInstrumentSustainReleaseTailSec('8-bit'));
  });
});
