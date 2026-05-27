import type Database from 'better-sqlite3';
import type { SettingRow } from '../shared/dbTypes';

export class SettingsRepository {
  constructor(private readonly db: Database.Database) {}

  get(category: string, key: string): string | null {
    const row = this.db
      .prepare('SELECT value FROM settings WHERE category = ? AND key = ?')
      .get(category, key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  getAll(): SettingRow[] {
    return this.db.prepare('SELECT category, key, value FROM settings ORDER BY category, key').all() as SettingRow[];
  }

  set(category: string, key: string, value: string): void {
    this.db.prepare('INSERT OR REPLACE INTO settings (category, key, value) VALUES (?, ?, ?)').run(category, key, value);
  }

  deleteLearningProgress(): void {
    this.db.prepare("DELETE FROM settings WHERE category IN ('learning', 'progress')").run();
  }

  deleteAll(): void {
    this.db.prepare('DELETE FROM settings').run();
  }
}
