import { isAbsolute, join, resolve, sep } from 'node:path';

export const SONG_ID_SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;
export const MIDI_STORAGE_KEY_PATTERN = /^[A-Za-z0-9_-]+$/;

export function isSafeSongStorageId(songId: string): boolean {
  return SONG_ID_SHA256_HEX_PATTERN.test(songId);
}

export function getSafeMidiFilename(songId: string): string | null {
  return isSafeSongStorageId(songId) ? `${songId}.mid` : null;
}

export function getAppOwnedMidiPath(root: string, songId: string): string | null {
  const filename = getSafeMidiFilename(songId);
  if (!filename) {
    return null;
  }

  const resolvedRoot = resolve(root);
  const candidatePath = join(resolvedRoot, filename);
  return isPathContainedInRoot(resolvedRoot, candidatePath) ? candidatePath : null;
}

export function isSafeMidiStorageKey(songId: string): boolean {
  return MIDI_STORAGE_KEY_PATTERN.test(songId);
}

export function getSafeMidiStorageFilename(songId: string): string | null {
  return isSafeMidiStorageKey(songId) ? `${songId}.mid` : null;
}

export function getAppOwnedMidiStoragePath(root: string, songId: string): string | null {
  const filename = getSafeMidiStorageFilename(songId);
  if (!filename) {
    return null;
  }

  const resolvedRoot = resolve(root);
  const candidatePath = join(resolvedRoot, filename);
  return isPathContainedInRoot(resolvedRoot, candidatePath) ? candidatePath : null;
}

export function isPathContainedInRoot(root: string, candidatePath: string): boolean {
  if (root.trim() === '' || candidatePath.trim() === '') {
    return false;
  }

  const resolvedRoot = resolve(root);
  const resolvedCandidate = resolve(root, candidatePath);

  if (resolvedCandidate === resolvedRoot) {
    return true;
  }

  return resolvedCandidate.startsWith(`${resolvedRoot}${sep}`);
}

export function isRelativePathContainedInRoot(root: string, candidatePath: string): boolean {
  return !isAbsolute(candidatePath) && isPathContainedInRoot(root, candidatePath);
}
