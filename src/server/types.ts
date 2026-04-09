import type { AppDatabase } from '../main/database';

export interface ServerDependencies {
  db: AppDatabase;
  midiFilesDir: string;
}
