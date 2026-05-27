// @vitest-environment node

import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { FileSystemMidiStorageAdapter } from './midiStorage';

const tempDirs: string[] = [];
const songId = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'pianohero-midi-storage-'));
  tempDirs.push(dir);
  return dir;
}

describe('FileSystemMidiStorageAdapter', () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it('reads, writes, and deletes app-owned MIDI bytes by safe song id', async () => {
    const root = await makeTempDir();
    const storage = new FileSystemMidiStorageAdapter(root);

    const path = await storage.write(songId, new Uint8Array([1, 2, 3]));
    await expect(storage.read(songId)).resolves.toEqual(new Uint8Array([1, 2, 3]));

    await storage.delete(songId);

    expect(path).toBe(join(root, `${songId}.mid`));
    expect(existsSync(path)).toBe(false);
  });

  it('rejects unsafe ids before deriving paths', async () => {
    const storage = new FileSystemMidiStorageAdapter(await makeTempDir());

    expect(() => storage.getPathForSong('../escape')).toThrow(/Unsafe song id/);
    await expect(storage.write('../escape', new Uint8Array([1]))).rejects.toThrow(/Unsafe song id/);
    await expect(storage.delete('../escape')).resolves.toBeUndefined();
  });

  it('supports legacy filename-safe ids for selected-song reattach flows', async () => {
    const root = await makeTempDir();
    const storage = new FileSystemMidiStorageAdapter(root);

    const path = await storage.write('legacy-song-1', new Uint8Array([1, 2, 3]));

    expect(path).toBe(join(root, 'legacy-song-1.mid'));
    await expect(storage.read('legacy-song-1')).resolves.toEqual(new Uint8Array([1, 2, 3]));
  });

  it('stages bytes until commit and preserves existing files before commit', async () => {
    const root = await makeTempDir();
    const path = join(root, `${songId}.mid`);
    const storage = new FileSystemMidiStorageAdapter(root);

    await writeFile(path, new Uint8Array([9, 9, 9]));
    const staged = await storage.stage(songId, new Uint8Array([1, 2, 3]));

    expect(staged.finalPath).toBe(path);
    await expect(readFile(path)).resolves.toEqual(Buffer.from([9, 9, 9]));

    await staged.commit();

    await expect(readFile(path)).resolves.toEqual(Buffer.from([1, 2, 3]));
  });

  it('discards staged bytes without touching existing files', async () => {
    const root = await makeTempDir();
    const path = join(root, `${songId}.mid`);
    const storage = new FileSystemMidiStorageAdapter(root);

    await writeFile(path, new Uint8Array([9, 9, 9]));
    const staged = await storage.stage(songId, new Uint8Array([1, 2, 3]));
    await staged.discard();

    await expect(readFile(path)).resolves.toEqual(Buffer.from([9, 9, 9]));
  });
});
