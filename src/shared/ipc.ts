import type { TrackAssignment } from '../lib/game/types';

export interface PickedMidiFile {
  name: string;
  path?: string;
  data: Uint8Array;
}

export interface SongMetadata {
  title: string;
  sourcePath?: string;
  trackAssignments: Record<string, TrackAssignment>;
  updatedAt: string;
}

export interface AppBridge {
  pickMidiFile: () => Promise<PickedMidiFile | null>;
  getSongMetadata: (songId: string) => Promise<SongMetadata | null>;
  saveSongMetadata: (songId: string, metadata: SongMetadata) => Promise<void>;
}
