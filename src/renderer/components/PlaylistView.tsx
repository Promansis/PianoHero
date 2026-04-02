import type { SongRow } from '../../shared/dbTypes';
import { TagChips } from './TagChips';

interface PlaylistViewProps {
  songs: SongRow[];
  canReorder: boolean;
  onPlayAll: () => void;
  onStartSession: (song: SongRow) => void;
  onRemoveSong: (songId: string) => void;
  onReorderSong: (songId: string, newOrder: number) => void;
  onTagClick: (tag: string) => void;
}

export function PlaylistView({
  songs,
  canReorder,
  onPlayAll,
  onStartSession,
  onRemoveSong,
  onReorderSong,
  onTagClick,
}: PlaylistViewProps) {
  return (
    <section className="panel playlist-view">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Playlist</p>
          <h2>Ordered Songs</h2>
          {!canReorder && <p className="panel-copy">Clear search and advanced filters to reorder this playlist.</p>}
        </div>
        <button className="primary-button" onClick={onPlayAll} disabled={songs.length === 0}>
          Play All
        </button>
      </div>

      <div className="playlist-list">
        {songs.map((song, index) => (
          <div
            key={song.id}
            className="playlist-row"
            draggable={canReorder}
            onDragStart={(event) => {
              event.dataTransfer.setData('text/plain', song.id);
            }}
            onDragOver={(event) => {
              if (canReorder) {
                event.preventDefault();
              }
            }}
            onDrop={(event) => {
              if (!canReorder) {
                return;
              }
              event.preventDefault();
              const draggedSongId = event.dataTransfer.getData('text/plain');
              if (draggedSongId && draggedSongId !== song.id) {
                onReorderSong(draggedSongId, index);
              }
            }}
          >
            <div className="playlist-row-main">
              <strong>{index + 1}. {song.title}</strong>
              <span>{song.artist || 'Unknown artist'}</span>
              <TagChips tags={song.tags} onTagClick={onTagClick} />
            </div>
            <div className="transport-buttons">
              <button className="secondary-button" onClick={() => onStartSession(song)}>
                Play
              </button>
              <button className="secondary-button" onClick={() => onRemoveSong(song.id)}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
