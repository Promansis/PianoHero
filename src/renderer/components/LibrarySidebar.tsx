import { useState } from 'react';
import type { FolderRow, PlaylistRow } from '../../shared/dbTypes';

export type LibraryActiveView =
  | { type: 'all' }
  | { type: 'favorites' }
  | { type: 'folder'; id: string }
  | { type: 'playlist'; id: string };

interface LibrarySidebarProps {
  activeView: LibraryActiveView;
  folders: FolderRow[];
  playlists: PlaylistRow[];
  onChangeView: (view: LibraryActiveView) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onCreatePlaylist: (name: string) => void;
  onRenamePlaylist: (playlistId: string, name: string) => void;
  onDeletePlaylist: (playlistId: string) => void;
}

function isActive(activeView: LibraryActiveView, type: LibraryActiveView['type'], id?: string): boolean {
  return activeView.type === type && (id ? ('id' in activeView ? activeView.id === id : false) : true);
}

export function LibrarySidebar(props: LibrarySidebarProps) {
  const [showFolders, setShowFolders] = useState(true);
  const [showPlaylists, setShowPlaylists] = useState(true);
  const [newFolderName, setNewFolderName] = useState('');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  return (
    <aside className="panel library-sidebar">
      <div className="sidebar-section">
        <button
          className={isActive(props.activeView, 'all') ? 'primary-button' : 'secondary-button'}
          onClick={() => props.onChangeView({ type: 'all' })}
        >
          All Songs
        </button>
        <button
          className={isActive(props.activeView, 'favorites') ? 'primary-button' : 'secondary-button'}
          onClick={() => props.onChangeView({ type: 'favorites' })}
        >
          Favorites
        </button>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <button className="secondary-button" onClick={() => setShowFolders((value) => !value)}>
            {showFolders ? 'Hide Folders' : 'Show Folders'}
          </button>
        </div>
        {showFolders && (
          <>
            <div className="sidebar-list">
              {props.folders.map((folder) => (
                <div key={folder.id} className="sidebar-row">
                  {editingFolderId === folder.id ? (
                    <>
                      <input value={draftName} onChange={(event) => setDraftName(event.target.value)} />
                      <button
                        className="secondary-button"
                        onClick={() => {
                          props.onRenameFolder(folder.id, draftName);
                          setEditingFolderId(null);
                        }}
                      >
                        Save
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className={isActive(props.activeView, 'folder', folder.id) ? 'primary-button' : 'secondary-button'}
                        onClick={() => props.onChangeView({ type: 'folder', id: folder.id })}
                      >
                        {folder.name}
                      </button>
                      <button
                        className="secondary-button"
                        onClick={() => {
                          setEditingFolderId(folder.id);
                          setDraftName(folder.name);
                        }}
                      >
                        Rename
                      </button>
                      <button className="secondary-button" onClick={() => props.onDeleteFolder(folder.id)}>
                        Delete
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="sidebar-create-row">
              <input
                value={newFolderName}
                placeholder="New folder"
                onChange={(event) => setNewFolderName(event.target.value)}
              />
              <button
                className="secondary-button"
                onClick={() => {
                  props.onCreateFolder(newFolderName);
                  setNewFolderName('');
                }}
              >
                Add
              </button>
            </div>
          </>
        )}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <button className="secondary-button" onClick={() => setShowPlaylists((value) => !value)}>
            {showPlaylists ? 'Hide Playlists' : 'Show Playlists'}
          </button>
        </div>
        {showPlaylists && (
          <>
            <div className="sidebar-list">
              {props.playlists.map((playlist) => (
                <div key={playlist.id} className="sidebar-row">
                  {editingPlaylistId === playlist.id ? (
                    <>
                      <input value={draftName} onChange={(event) => setDraftName(event.target.value)} />
                      <button
                        className="secondary-button"
                        onClick={() => {
                          props.onRenamePlaylist(playlist.id, draftName);
                          setEditingPlaylistId(null);
                        }}
                      >
                        Save
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className={
                          isActive(props.activeView, 'playlist', playlist.id) ? 'primary-button' : 'secondary-button'
                        }
                        onClick={() => props.onChangeView({ type: 'playlist', id: playlist.id })}
                      >
                        {playlist.name} ({playlist.songCount ?? 0})
                      </button>
                      <button
                        className="secondary-button"
                        onClick={() => {
                          setEditingPlaylistId(playlist.id);
                          setDraftName(playlist.name);
                        }}
                      >
                        Rename
                      </button>
                      <button className="secondary-button" onClick={() => props.onDeletePlaylist(playlist.id)}>
                        Delete
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="sidebar-create-row">
              <input
                value={newPlaylistName}
                placeholder="New playlist"
                onChange={(event) => setNewPlaylistName(event.target.value)}
              />
              <button
                className="secondary-button"
                onClick={() => {
                  props.onCreatePlaylist(newPlaylistName);
                  setNewPlaylistName('');
                }}
              >
                Add
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
