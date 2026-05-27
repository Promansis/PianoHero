import type { AppDatabase } from '../persistence/database';
import type { MidiStorageAdapter } from '../storage/midiStorage';

export interface ServerDependencies {
  db: AppDatabase;
  midiFilesDir: string;
  midiStorage: MidiStorageAdapter;
}
