import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { SongMetadata } from '../shared/ipc';

interface StoreSchema {
  songs: Record<string, SongMetadata>;
}

const EMPTY_STORE: StoreSchema = {
  songs: {},
};

export class SongMetadataStore {
  private storePath: string;

  constructor(userDataPath: string) {
    this.storePath = join(userDataPath, 'song-metadata.json');
  }

  async get(songId: string): Promise<SongMetadata | null> {
    const store = await this.readStore();
    return store.songs[songId] ?? null;
  }

  async set(songId: string, metadata: SongMetadata): Promise<void> {
    const store = await this.readStore();
    store.songs[songId] = metadata;
    await this.writeStore(store);
  }

  private async readStore(): Promise<StoreSchema> {
    try {
      const contents = await readFile(this.storePath, 'utf8');
      const parsed = JSON.parse(contents) as Partial<StoreSchema>;
      return {
        songs: parsed.songs ?? {},
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return EMPTY_STORE;
      }

      throw error;
    }
  }

  private async writeStore(store: StoreSchema): Promise<void> {
    await mkdir(dirname(this.storePath), { recursive: true });
    await writeFile(this.storePath, JSON.stringify(store, null, 2), 'utf8');
  }
}
