import { useEffect, useMemo, useState } from 'react';
import type { SessionMode } from '../../lib/game/types';
import type { SongRow, UserStatsRow } from '../../shared/dbTypes';

interface LibraryScreenProps {
  onStartSession: (song: SongRow, mode: SessionMode) => void;
  onStartFreePlay: () => void;
  onOpenSetupGuide: () => void;
}

type SortField = 'title' | 'date' | 'score' | 'difficulty' | 'plays' | 'lastPlayed';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';
type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard';

interface SongDraft {
  title: string;
  artist: string;
  genre: string;
  difficulty: number;
  tagsText: string;
}

function formatDuration(durationSec: number): string {
  const total = Math.max(0, Math.round(durationSec));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function getDifficultyFilterLabel(filter: DifficultyFilter): string {
  switch (filter) {
    case 'easy':
      return 'Easy';
    case 'medium':
      return 'Medium';
    case 'hard':
      return 'Hard';
    default:
      return 'All';
  }
}

function matchesDifficulty(song: SongRow, filter: DifficultyFilter): boolean {
  if (filter === 'all') {
    return true;
  }
  if (filter === 'easy') {
    return song.difficulty <= 3;
  }
  if (filter === 'medium') {
    return song.difficulty >= 4 && song.difficulty <= 6;
  }
  return song.difficulty >= 7;
}

function createDraft(song: SongRow): SongDraft {
  return {
    title: song.title,
    artist: song.artist,
    genre: song.genre,
    difficulty: song.difficulty,
    tagsText: song.tags.join(', '),
  };
}

export function LibraryScreen({ onStartSession, onStartFreePlay, onOpenSetupGuide }: LibraryScreenProps) {
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [statsBySongId, setStatsBySongId] = useState<Record<string, UserStatsRow | null>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Build your library by importing MIDI files.');
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SongDraft | null>(null);

  const refreshLibrary = async () => {
    if (!window.appBridge) {
      setStatusMessage('The app bridge is unavailable.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const nextSongs = await window.appBridge.getAllSongs();
    const statsEntries = await Promise.all(
      nextSongs.map(async (song) => [song.id, await window.appBridge!.getUserStats(song.id)] as const),
    );

    setSongs(nextSongs);
    setStatsBySongId(Object.fromEntries(statsEntries));
    setIsLoading(false);

    if (nextSongs.length === 0) {
      setStatusMessage('Build your library by importing MIDI files.');
    } else {
      setStatusMessage(`${nextSongs.length} song${nextSongs.length === 1 ? '' : 's'} ready to play.`);
    }
  };

  useEffect(() => {
    void refreshLibrary();
  }, []);

  const selectedSong = useMemo(
    () => songs.find((entry) => entry.id === editingSongId) ?? null,
    [editingSongId, songs],
  );

  useEffect(() => {
    if (selectedSong) {
      setDraft(createDraft(selectedSong));
    } else {
      setDraft(null);
    }
  }, [selectedSong]);

  const handleImport = async () => {
    if (!window.appBridge) {
      return;
    }

    setIsImporting(true);
    try {
      const imported = await window.appBridge.importMidiFiles();
      if (imported.length === 0) {
        setStatusMessage('Import canceled.');
      } else {
        setStatusMessage(`Imported ${imported.length} song${imported.length === 1 ? '' : 's'}. Review the metadata before playing.`);
        await refreshLibrary();
        setEditingSongId(imported[0].songId);
      }
    } catch (error) {
      setStatusMessage(`Import failed: ${(error as Error).message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleToggleFavorite = async (songId: string) => {
    if (!window.appBridge) {
      return;
    }

    await window.appBridge.toggleFavorite(songId);
    await refreshLibrary();
  };

  const handleSaveMetadata = async () => {
    if (!window.appBridge || !selectedSong || !draft) {
      return;
    }

    await window.appBridge.updateSong(selectedSong.id, {
      title: draft.title.trim() || selectedSong.title,
      artist: draft.artist.trim(),
      genre: draft.genre.trim(),
      difficulty: Math.max(1, Math.min(10, Math.round(draft.difficulty))),
      tags: draft.tagsText
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
    });
    setStatusMessage(`Saved metadata for ${draft.title.trim() || selectedSong.title}.`);
    await refreshLibrary();
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleSongs = songs
    .filter((song) => {
      if (!matchesDifficulty(song, difficultyFilter)) {
        return false;
      }
      if (favoritesOnly && !song.isFavorite) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }

      const haystack = `${song.title} ${song.artist} ${song.genre} ${song.tags.join(' ')}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    })
    .sort((left, right) => {
      const leftStats = statsBySongId[left.id];
      const rightStats = statsBySongId[right.id];
      let value = 0;

      switch (sortField) {
        case 'title':
          value = left.title.localeCompare(right.title);
          break;
        case 'difficulty':
          value = left.difficulty - right.difficulty;
          break;
        case 'plays':
          value = left.timesPlayed - right.timesPlayed;
          break;
        case 'score':
          value = (leftStats?.bestScore ?? 0) - (rightStats?.bestScore ?? 0);
          break;
        case 'lastPlayed':
          value = new Date(leftStats?.lastPlayed ?? 0).getTime() - new Date(rightStats?.lastPlayed ?? 0).getTime();
          break;
        case 'date':
        default:
          value = new Date(left.dateAdded).getTime() - new Date(right.dateAdded).getTime();
          break;
      }

      return sortDirection === 'asc' ? value : -value;
    });

  return (
    <main className="app-shell library-screen">
      <section className="panel library-header">
        <div>
          <p className="eyebrow">Piano Hero</p>
          <h1>Your Library</h1>
          <p className="song-title">{statusMessage}</p>
        </div>
        <div className="transport-buttons">
          <button className="secondary-button" onClick={onOpenSetupGuide}>
            Setup Guide
          </button>
          <button className="secondary-button" onClick={onStartFreePlay}>
            Free Play
          </button>
          <button className="secondary-button" onClick={() => void refreshLibrary()} disabled={isLoading}>
            Refresh
          </button>
          <button className="primary-button" onClick={() => void handleImport()} disabled={isImporting}>
            {isImporting ? 'Importing...' : 'Upload MIDI'}
          </button>
        </div>
      </section>

      <section className="panel search-bar">
        <label className="search-field">
          <span>Search</span>
          <input
            type="search"
            value={searchQuery}
            placeholder="Search title, artist, genre, or tags"
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>

        <label>
          <span>Sort</span>
          <select value={sortField} onChange={(event) => setSortField(event.target.value as SortField)}>
            <option value="date">Date Added</option>
            <option value="lastPlayed">Last Played</option>
            <option value="title">Title</option>
            <option value="score">Best Score</option>
            <option value="difficulty">Difficulty</option>
            <option value="plays">Times Played</option>
          </select>
        </label>

        <label>
          <span>Direction</span>
          <select
            value={sortDirection}
            onChange={(event) => setSortDirection(event.target.value as SortDirection)}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </label>

        <div className="view-toggle">
          <button
            className={favoritesOnly ? 'primary-button' : 'secondary-button'}
            onClick={() => setFavoritesOnly((value) => !value)}
          >
            {favoritesOnly ? 'Favorites Only' : 'All Songs'}
          </button>
          <button
            className={viewMode === 'grid' ? 'primary-button' : 'secondary-button'}
            onClick={() => setViewMode('grid')}
          >
            Grid
          </button>
          <button
            className={viewMode === 'list' ? 'primary-button' : 'secondary-button'}
            onClick={() => setViewMode('list')}
          >
            List
          </button>
        </div>
      </section>

      <section className="filter-chips">
        {(['all', 'easy', 'medium', 'hard'] as DifficultyFilter[]).map((filter) => (
          <button
            key={filter}
            className={difficultyFilter === filter ? 'primary-button' : 'secondary-button'}
            onClick={() => setDifficultyFilter(filter)}
          >
            {getDifficultyFilterLabel(filter)}
          </button>
        ))}
      </section>

      {selectedSong && draft && (
        <section className="panel metadata-editor">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Metadata Review</p>
              <h2>{selectedSong.title}</h2>
            </div>
            <div className="transport-buttons">
              <button className="secondary-button" onClick={() => setEditingSongId(null)}>
                Close
              </button>
              <button className="primary-button" onClick={() => void handleSaveMetadata()}>
                Save Metadata
              </button>
            </div>
          </div>

          <div className="metadata-grid">
            <label>
              <span>Title</span>
              <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
            </label>
            <label>
              <span>Artist</span>
              <input value={draft.artist} onChange={(event) => setDraft({ ...draft, artist: event.target.value })} />
            </label>
            <label>
              <span>Genre</span>
              <input value={draft.genre} onChange={(event) => setDraft({ ...draft, genre: event.target.value })} />
            </label>
            <label>
              <span>Difficulty</span>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={draft.difficulty}
                onChange={(event) => setDraft({ ...draft, difficulty: Number(event.target.value) })}
              />
              <strong>Difficulty {draft.difficulty}</strong>
            </label>
            <label className="metadata-tags-field">
              <span>Tags</span>
              <input
                value={draft.tagsText}
                placeholder="beginner, classical, exercise"
                onChange={(event) => setDraft({ ...draft, tagsText: event.target.value })}
              />
            </label>
          </div>
        </section>
      )}

      {isLoading ? (
        <section className="panel empty-state-panel">
          <p className="empty-state">Loading library...</p>
        </section>
      ) : visibleSongs.length === 0 ? (
        <section className="panel empty-state-panel">
          <p className="empty-state">No songs match the current filters.</p>
        </section>
      ) : (
        <section className={viewMode === 'grid' ? 'song-grid' : 'song-list'}>
          {visibleSongs.map((song) => {
            const stats = statsBySongId[song.id];
            return (
              <article className="panel song-card" key={song.id}>
                <div className="song-card-header">
                  <div>
                    <p className="eyebrow">{song.genre || 'Library Song'}</p>
                    <h2>{song.title}</h2>
                    <p className="panel-copy">{song.artist || 'Unknown artist'}</p>
                  </div>
                  <button
                    className="secondary-button favorite-toggle"
                    onClick={() => {
                      void handleToggleFavorite(song.id);
                    }}
                  >
                    {song.isFavorite ? 'Favorite' : 'Mark Favorite'}
                  </button>
                </div>

                <div className="song-card-meta">
                  <span className={`difficulty-badge difficulty-${song.difficulty}`}>
                    Difficulty {song.difficulty}
                  </span>
                  <span>{formatDuration(song.durationSec)}</span>
                  <span>{Math.round(song.bpm)} BPM</span>
                </div>

                {song.tags.length > 0 && (
                  <div className="song-tag-row">
                    {song.tags.map((tag) => (
                      <span className="song-tag" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="song-card-stats">
                  <div>
                    <span>Best Score</span>
                    <strong>{(stats?.bestScore ?? 0).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span>Best Accuracy</span>
                    <strong>{stats ? `${stats.bestAccuracy.toFixed(1)}%` : '0.0%'}</strong>
                  </div>
                  <div>
                    <span>Plays</span>
                    <strong>{song.timesPlayed}</strong>
                  </div>
                </div>

                <div className="song-card-actions">
                  <button className="primary-button" onClick={() => onStartSession(song, 'piano-hero')}>
                    Play
                  </button>
                  <button className="secondary-button" onClick={() => onStartSession(song, 'learning')}>
                    Learn
                  </button>
                  <button className="secondary-button" onClick={() => onStartSession(song, 'performance')}>
                    Perform
                  </button>
                  <button className="secondary-button" onClick={() => setEditingSongId(song.id)}>
                    Edit Metadata
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
