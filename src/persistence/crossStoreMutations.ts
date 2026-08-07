import type { AppDatabase } from './database';
import type { MidiStorageAdapter, MidiStorageSnapshot } from '../storage/midiStorage';

export interface ResetOperation {
  commit: () => Promise<void> | void;
  rollback: () => Promise<void> | void;
}

export type ResetRecovery = (operationId: string, state: 'prepared' | 'db-committed') => Promise<void>;

export async function deleteSongsAcrossStores(
  db: AppDatabase,
  midiStorage: MidiStorageAdapter,
  songIds: string[],
  deleteFromDatabase: () => void,
): Promise<void> {
  const ids = [...new Set(songIds)];
  if (midiStorage.stageDelete && midiStorage.commitDelete && midiStorage.rollbackDelete) {
    const operationId = db.prepareDurableOperation('delete-songs', { songIds: ids });
    try {
      await midiStorage.stageDelete(operationId, ids);
      db.commitSongDeletion(operationId, ids);
      await midiStorage.commitDelete(operationId);
      db.completeDurableOperation(operationId);
    } catch (error) {
      if (db.getDurableOperations().some((operation) => operation.id === operationId && operation.state === 'prepared')) {
        await midiStorage.rollbackDelete(operationId).catch(() => undefined);
        db.completeDurableOperation(operationId);
      }
      throw error;
    }
    return;
  }

  const snapshot = midiStorage.snapshot && midiStorage.restoreSnapshot ? await midiStorage.snapshot() : null;
  const files = new Map<string, Uint8Array>();

  for (const songId of ids) {
    try {
      files.set(songId, await midiStorage.read(songId));
    } catch {
      // Missing app-owned MIDI is already a recoverable library state.
    }
  }

  try {
    for (const songId of ids) {
      await midiStorage.delete(songId);
    }
    deleteFromDatabase();
  } catch (error) {
    if (snapshot && midiStorage.restoreSnapshot) {
      await midiStorage.restoreSnapshot(snapshot).catch(() => undefined);
    } else {
      await Promise.allSettled([...files].map(([songId, data]) => midiStorage.write(songId, data)));
    }
    throw error;
  }
}

export async function resetUserDataAcrossStores(
  db: AppDatabase,
  midiStorage: MidiStorageAdapter,
  prepareSecondaryReset?: (operationId: string) => Promise<ResetOperation> | ResetOperation,
): Promise<void> {
  if (midiStorage.stageReset && midiStorage.commitReset && midiStorage.rollbackReset) {
    const operationId = db.prepareDurableOperation('reset-user-data', {});
    let secondaryReset: ResetOperation | undefined;
    try {
      secondaryReset = await prepareSecondaryReset?.(operationId);
      await midiStorage.stageReset(operationId);
      db.commitUserDataReset(operationId);
      await midiStorage.commitReset(operationId);
      await secondaryReset?.commit();
      db.completeDurableOperation(operationId);
    } catch (error) {
      const isPrepared = db.getDurableOperations().some((operation) => operation.id === operationId && operation.state === 'prepared');
      if (isPrepared) {
        await secondaryReset?.rollback?.();
        await midiStorage.rollbackReset(operationId).catch(() => undefined);
        db.completeDurableOperation(operationId);
      }
      throw error;
    }
    return;
  }

  const snapshot: MidiStorageSnapshot | null =
    midiStorage.snapshot && midiStorage.restoreSnapshot ? await midiStorage.snapshot() : null;

  let secondaryReset: ResetOperation | undefined;
  try {
    secondaryReset = await prepareSecondaryReset?.('in-process-reset');
    await midiStorage.reset();
    await secondaryReset?.commit();
    db.resetUserData();
  } catch (error) {
    await Promise.allSettled([secondaryReset?.rollback?.() ?? Promise.resolve()]);
    if (snapshot && midiStorage.restoreSnapshot) {
      await midiStorage.restoreSnapshot(snapshot).catch(() => undefined);
    }
    throw error;
  }
}
