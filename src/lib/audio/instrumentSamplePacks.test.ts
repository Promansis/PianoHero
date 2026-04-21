import { describe, expect, it } from 'vitest';
import {
  buildInstrumentSamplePackStatuses,
  getInstrumentSamplePackDefinition,
  isValidPackManifest,
  listPackEnabledInstrumentIds,
} from './instrumentSamplePacks';

describe('instrumentSamplePacks', () => {
  it('enables managed packs for the bundled enhanced-pack instruments', () => {
    expect(listPackEnabledInstrumentIds()).toEqual([
      'honky-tonk',
      'flute',
      'trumpet',
      'saxophone',
      'cello',
      'string-ensemble',
    ]);
    expect(getInstrumentSamplePackDefinition('honky-tonk')?.installMode).toBe('managed');
    expect(getInstrumentSamplePackDefinition('flute')?.installMode).toBe('managed');
    expect(getInstrumentSamplePackDefinition('trumpet')?.installMode).toBe('managed');
    expect(getInstrumentSamplePackDefinition('saxophone')?.installMode).toBe('managed');
    expect(getInstrumentSamplePackDefinition('cello')?.installMode).toBe('managed');
    expect(getInstrumentSamplePackDefinition('string-ensemble')?.installMode).toBe('managed');
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

  it('reports managed pack availability for honky-tonk, saxophone, cello, and string ensemble across runtimes', () => {
    const desktopStatuses = buildInstrumentSamplePackStatuses('desktop', {});
    expect(desktopStatuses.find((status) => status.instrumentId === 'honky-tonk')).toMatchObject({
      canInstallInApp: true,
      installMode: 'managed',
      requiresPackForSelection: false,
    });
    expect(desktopStatuses.find((status) => status.instrumentId === 'saxophone')).toMatchObject({
      canInstallInApp: true,
      installMode: 'managed',
      requiresPackForSelection: false,
    });
    expect(desktopStatuses.find((status) => status.instrumentId === 'cello')).toMatchObject({
      canInstallInApp: true,
      installMode: 'managed',
      requiresPackForSelection: false,
    });

    const webStatuses = buildInstrumentSamplePackStatuses('web', {});
    expect(webStatuses.find((status) => status.instrumentId === 'honky-tonk')).toMatchObject({
      canInstallInApp: true,
      installMode: 'managed',
      requiresPackForSelection: false,
    });
    expect(webStatuses.find((status) => status.instrumentId === 'saxophone')).toMatchObject({
      canInstallInApp: true,
      installMode: 'managed',
      requiresPackForSelection: false,
    });
    expect(webStatuses.find((status) => status.instrumentId === 'cello')).toMatchObject({
      canInstallInApp: true,
      installMode: 'managed',
      requiresPackForSelection: false,
    });
  });
});
