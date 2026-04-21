import { describe, expect, it } from 'vitest';
import {
  buildInstrumentSamplePackStatuses,
  getInstrumentSamplePackDefinition,
  isValidPackManifest,
  listPackEnabledInstrumentIds,
} from './instrumentSamplePacks';

describe('instrumentSamplePacks', () => {
  it('enables managed packs only for the flute and trumpet pilot instruments', () => {
    expect(listPackEnabledInstrumentIds()).toEqual(['flute', 'trumpet', 'cello', 'string-ensemble']);
    expect(getInstrumentSamplePackDefinition('flute')?.installMode).toBe('managed');
    expect(getInstrumentSamplePackDefinition('trumpet')?.installMode).toBe('managed');
    expect(getInstrumentSamplePackDefinition('cello')?.installMode).toBe('manual');
    expect(getInstrumentSamplePackDefinition('clarinet')).toBeNull();
  });

  it('validates manifest source metadata', () => {
    expect(
      isValidPackManifest({
        instrumentId: 'flute',
        packLabel: 'Flute Enhanced Pack',
        version: '2',
        sourceName: 'nbrosowsky/tonejs-instruments',
        licenseLabel: 'MIT',
        attributionUrl: 'https://github.com/nbrosowsky/tonejs-instruments',
        assets: [{ note: 'C4', fileName: 'C4.mp3', url: '/instrument-packs/flute/assets/C4.mp3' }],
      }),
    ).toBe(true);

    expect(
      isValidPackManifest({
        instrumentId: 'flute',
        packLabel: 'Flute Enhanced Pack',
        version: '2',
        assets: [],
      }),
    ).toBe(false);
  });

  it('reports desktop manual pack availability for cello and string ensemble', () => {
    const desktopStatuses = buildInstrumentSamplePackStatuses('desktop', {});
    expect(desktopStatuses.find((status) => status.instrumentId === 'cello')).toMatchObject({
      canInstallInApp: true,
      installMode: 'manual',
      requiresPackForSelection: true,
    });

    const webStatuses = buildInstrumentSamplePackStatuses('web', {});
    expect(webStatuses.find((status) => status.instrumentId === 'cello')).toMatchObject({
      canInstallInApp: false,
      installMode: 'manual',
      requiresPackForSelection: true,
    });
  });
});
