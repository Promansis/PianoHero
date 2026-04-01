import { contextBridge, ipcRenderer } from 'electron';
import type { AppBridge, PickedMidiFile, SongMetadata } from '../shared/ipc';

const appBridge: AppBridge = {
  pickMidiFile: () => ipcRenderer.invoke('dialog:pick-midi-file') as Promise<PickedMidiFile | null>,
  getSongMetadata: (songId: string) =>
    ipcRenderer.invoke('song-metadata:get', songId) as Promise<SongMetadata | null>,
  saveSongMetadata: (songId: string, metadata: SongMetadata) =>
    ipcRenderer.invoke('song-metadata:set', songId, metadata) as Promise<void>,
};

contextBridge.exposeInMainWorld('appBridge', appBridge);
