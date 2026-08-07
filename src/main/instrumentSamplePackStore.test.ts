import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { vi, afterEach, describe, expect, it } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INSTALLED_INSTRUMENT_SAMPLE_PACKS_SETTING_KEY } from '../lib/audio/instrumentSamplePacks';
import { AppDatabase } from '../persistence/database';
import { prepareDesktopInstrumentSamplePackReset, removeDesktopInstrumentSamplePack } from './instrumentSamplePackStore';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('removeDesktopInstrumentSamplePack', () => {
  it('rejects unregistered IDs without mutation and removes a registered pack', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pianohero-sample-pack-remove-'));
    roots.push(root);
    const userDataPath = join(root, 'user-data');
    const victimPath = join(root, 'victim');
    const packPath = join(userDataPath, 'instrument-sample-packs', 'flute');
    await mkdir(victimPath, { recursive: true });
    await writeFile(join(victimPath, 'sentinel'), 'keep');
    await mkdir(packPath, { recursive: true });
    await writeFile(join(packPath, 'sample.wav'), 'sample');

    const db = new AppDatabase(join(userDataPath, 'pianohero.db'));
    const installed = JSON.stringify({
      flute: {
        instrumentId: 'flute',
        packLabel: 'Flute Enhanced Pack',
        version: 'test',
        installedAt: '2026-07-30T00:00:00.000Z',
        urls: { C4: 'sample.wav' },
      },
    });
    db.setSetting('audio', INSTALLED_INSTRUMENT_SAMPLE_PACKS_SETTING_KEY, installed);

    for (const instrumentId of ['../../victim', '/tmp/victim', '', 'unknown']) {
      expect(() => removeDesktopInstrumentSamplePack(db, userDataPath, instrumentId)).toThrow(
        `No sample pack is configured for instrument: ${instrumentId}`,
      );
      await expect(access(join(victimPath, 'sentinel'))).resolves.toBeUndefined();
      expect(db.getSetting('audio', INSTALLED_INSTRUMENT_SAMPLE_PACKS_SETTING_KEY)).toBe(installed);
    }

    removeDesktopInstrumentSamplePack(db, userDataPath, 'flute');
    await expect(access(packPath)).rejects.toThrow();
    expect(db.getSetting('audio', INSTALLED_INSTRUMENT_SAMPLE_PACKS_SETTING_KEY)).toBe('{}');
    db.close();
  });

  it('restores the pack when setting the metadata fails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pianohero-sample-pack-remove-fail-'));
    roots.push(root);
    const userDataPath = join(root, 'user-data');
    const packPath = join(userDataPath, 'instrument-sample-packs', 'flute');
    await mkdir(packPath, { recursive: true });
    await writeFile(join(packPath, 'sample.wav'), 'sample');

    const db = new AppDatabase(join(userDataPath, 'pianohero.db'));
    db.setSetting('audio', INSTALLED_INSTRUMENT_SAMPLE_PACKS_SETTING_KEY, JSON.stringify({
      flute: {
        instrumentId: 'flute',
        packLabel: 'Flute Enhanced Pack',
        version: 'test',
        installedAt: '2026-07-30T00:00:00.000Z',
        urls: { C4: 'sample.wav' },
      },
    }));

    vi.spyOn(db, 'setSetting').mockImplementationOnce(() => { throw new Error('db write failed'); });

    expect(() => removeDesktopInstrumentSamplePack(db, userDataPath, 'flute')).toThrow('db write failed');
    expect(existsSync(packPath)).toBe(true);
    expect(existsSync(join(packPath, 'sample.wav'))).toBe(true);
    expect(db.getSetting('audio', INSTALLED_INSTRUMENT_SAMPLE_PACKS_SETTING_KEY)).toBe(
      JSON.stringify({
        flute: {
          instrumentId: 'flute',
          packLabel: 'Flute Enhanced Pack',
          version: 'test',
          installedAt: '2026-07-30T00:00:00.000Z',
          urls: { C4: 'sample.wav' },
        },
      }),
    );
    db.close();
  });
});

describe('prepareDesktopInstrumentSamplePackReset', () => {
  it('restores the pack directory when the reset is rolled back', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pianohero-sample-pack-reset-'));
    roots.push(root);
    const packPath = join(root, 'instrument-sample-packs', 'flute');
    await mkdir(packPath, { recursive: true });
    await writeFile(join(packPath, 'sample.wav'), 'sample');

    const reset = prepareDesktopInstrumentSamplePackReset(root, 'test-operation');
    await expect(access(packPath)).rejects.toThrow();
    await reset.rollback();
    await expect(access(join(packPath, 'sample.wav'))).resolves.toBeUndefined();
  });
});
