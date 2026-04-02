import type { FolderRow, PlaylistRow } from '../../shared/dbTypes';

interface BulkActionBarProps {
  selectedCount: number;
  folders: FolderRow[];
  playlists: PlaylistRow[];
  onClearSelection: () => void;
  onDelete: () => void;
  onMoveToFolder: (folderId: string | null) => void;
  onAddTag: (tag: string) => void;
  onAddToPlaylist: (playlistId: string) => void;
}

export function BulkActionBar({
  selectedCount,
  folders,
  playlists,
  onClearSelection,
  onDelete,
  onMoveToFolder,
  onAddTag,
  onAddToPlaylist,
}: BulkActionBarProps) {
  return (
    <section className="panel bulk-action-bar">
      <div>
        <p className="eyebrow">Bulk Actions</p>
        <h2>{selectedCount} selected</h2>
      </div>
      <div className="bulk-action-controls">
        <button className="secondary-button" onClick={onClearSelection}>
          Deselect All
        </button>
        <button className="secondary-button" onClick={onDelete}>
          Delete
        </button>
        <label>
          <span>Move to Folder</span>
          <select onChange={(event) => onMoveToFolder(event.target.value || null)} defaultValue="">
            <option value="" disabled>
              Select folder
            </option>
            <option value="__NONE__">Unfiled</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Add Tag</span>
          <input
            placeholder="Tag name"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onAddTag(event.currentTarget.value);
                event.currentTarget.value = '';
              }
            }}
          />
        </label>
        <label>
          <span>Add to Playlist</span>
          <select onChange={(event) => event.target.value && onAddToPlaylist(event.target.value)} defaultValue="">
            <option value="" disabled>
              Select playlist
            </option>
            {playlists.map((playlist) => (
              <option key={playlist.id} value={playlist.id}>
                {playlist.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
