import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getSafeMidiFilename,
  isPathContainedInRoot,
  isRelativePathContainedInRoot,
  isSafeSongStorageId,
} from './storageSafety';

const hashSongId = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('storageSafety', () => {
  it('accepts normal content-hash song ids for app-owned MIDI filenames', () => {
    expect(isSafeSongStorageId(hashSongId)).toBe(true);
    expect(getSafeMidiFilename(hashSongId)).toBe(`${hashSongId}.mid`);
  });

  it('rejects song ids that could change the derived storage path', () => {
    expect(isSafeSongStorageId(`nested/${hashSongId}`)).toBe(false);
    expect(isSafeSongStorageId(`nested\\${hashSongId}`)).toBe(false);
    expect(isSafeSongStorageId(`/tmp/${hashSongId}`)).toBe(false);
    expect(isSafeSongStorageId(`../${hashSongId}`)).toBe(false);
    expect(getSafeMidiFilename(`../${hashSongId}`)).toBeNull();
  });

  it('reports whether resolved paths remain inside the storage root', () => {
    const root = '/data/midi-files';

    expect(isPathContainedInRoot(root, '/data/midi-files/song-a.mid')).toBe(true);
    expect(isPathContainedInRoot(root, 'song-a.mid')).toBe(true);
    expect(isPathContainedInRoot(root, '/data/midi-files/nested/song-a.mid')).toBe(true);
    expect(isPathContainedInRoot(root, '/data/midi-files/../midi-files/song-a.mid')).toBe(true);
  });

  it('rejects traversal, absolute foreign paths, and sibling-prefix paths', () => {
    const root = '/data/midi-files';

    expect(isPathContainedInRoot(root, '../secret.mid')).toBe(false);
    expect(isPathContainedInRoot(root, '/etc/passwd')).toBe(false);
    expect(isPathContainedInRoot(root, '/data/midi-files-evil/song-a.mid')).toBe(false);
  });

  it('can require a relative candidate when callers should reject absolute paths', () => {
    const root = resolve('/data/midi-files');

    expect(isRelativePathContainedInRoot(root, `${hashSongId}.mid`)).toBe(true);
    expect(isRelativePathContainedInRoot(root, `/data/midi-files/${hashSongId}.mid`)).toBe(false);
    expect(isRelativePathContainedInRoot(root, `../${hashSongId}.mid`)).toBe(false);
  });
});
