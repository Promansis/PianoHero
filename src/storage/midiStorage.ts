import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import {
  getAppOwnedMidiStoragePath,
  getSafeMidiStorageFilename,
  isPathContainedInRoot,
} from '../lib/storage/storageSafety';

export interface MidiStorageStagedFile {
  finalPath: string;
  commit: () => Promise<void>;
  discard: () => Promise<void>;
}

export interface MidiStorageAdapter {
  getPathForSong: (songId: string) => string;
  read: (songId: string) => Promise<Uint8Array>;
  write: (songId: string, data: Uint8Array) => Promise<string>;
  delete: (songId: string) => Promise<void>;
  stage: (songId: string, data: Uint8Array) => Promise<MidiStorageStagedFile>;
  reset: () => Promise<void>;
}

export class FileSystemMidiStorageAdapter implements MidiStorageAdapter {
  constructor(private readonly rootDir: string) {}

  getPathForSong(songId: string): string {
    const path = getAppOwnedMidiStoragePath(this.rootDir, songId);
    if (!path) {
      throw new Error(`Unsafe song id: ${songId}`);
    }
    return path;
  }

  async read(songId: string): Promise<Uint8Array> {
    return new Uint8Array(await readFile(this.getPathForSong(songId)));
  }

  async write(songId: string, data: Uint8Array): Promise<string> {
    await mkdir(this.rootDir, { recursive: true });
    const path = this.getPathForSong(songId);
    await writeFile(path, data);
    return path;
  }

  async delete(songId: string): Promise<void> {
    const path = getAppOwnedMidiStoragePath(this.rootDir, songId);
    if (!path) {
      return;
    }
    await rm(path, { force: true });
  }

  async stage(songId: string, data: Uint8Array): Promise<MidiStorageStagedFile> {
    await mkdir(this.rootDir, { recursive: true });
    const finalPath = this.getPathForSong(songId);
    const stagingDir = this.createStagingDir();
    await mkdir(stagingDir, { recursive: true });
    const stagingPath = this.getStagingPath(stagingDir, songId);
    await writeFile(stagingPath, data);

    return {
      finalPath,
      commit: async () => {
        await rename(stagingPath, finalPath);
      },
      discard: async () => {
        await rm(stagingDir, { recursive: true, force: true });
      },
    };
  }

  async reset(): Promise<void> {
    await rm(this.rootDir, { recursive: true, force: true });
    await mkdir(this.rootDir, { recursive: true });
  }

  private createStagingDir(): string {
    return join(this.rootDir, `.import-${Date.now()}-${process.pid}-${Math.random().toString(16).slice(2)}`);
  }

  private getStagingPath(stagingDir: string, songId: string): string {
    const filename = getSafeMidiStorageFilename(songId);
    if (!filename) {
      throw new Error(`Unsafe song id: ${songId}`);
    }

    const stagingPath = join(stagingDir, basename(filename));
    if (!isPathContainedInRoot(stagingDir, stagingPath)) {
      throw new Error(`Unsafe MIDI staging path for ${songId}.`);
    }
    return stagingPath;
  }
}
