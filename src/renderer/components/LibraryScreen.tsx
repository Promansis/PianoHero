import { useEffect, useMemo, useRef, useState } from 'react';
import { AudioEngine } from '../../lib/audio/audioEngine';
import type { SessionMode } from '../../lib/game/types';
import { parseMidiFile } from '../../lib/midi/midiFileParser';
import type { FolderRow, PlaylistRow, RecommendationResult, SongRow, UserStatsRow } from '../../shared/dbTypes';
import { AdvancedFilters, type LibraryAdvancedFilters } from './AdvancedFilters';
import { BulkActionBar } from './BulkActionBar';
import { LibrarySidebar, type LibraryActiveView } from './LibrarySidebar';
import { PlaylistView } from './PlaylistView';
import { TagChips } from './TagChips';

interface LibraryScreenProps {
  audioEngine: AudioEngine;
  onStartSession: (song: SongRow, mode: SessionMode) => void;
  onStartPlaylistQueue: (songs: SongRow[]) => void;
  onStartTheoryPractice: () => void;
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
  tags: string[];
}

const EMPTY_ADVANCED_FILTERS: LibraryAdvancedFilters = {
  durationMin: '',
  durationMax: '',
  scoreMin: '',
  scoreMax: '',
  playedState: 'all',
  dateAddedFrom: '',
  dateAddedTo: '',
};

interface FilterPreset {
  label: string;
  difficulty: DifficultyFilter;
  advanced: LibraryAdvancedFilters;
}

const FILTER_PRESETS: FilterPreset[] = [
  {
    label: 'Unplayed',
    difficulty: 'all',
    advanced: { ...EMPTY_ADVANCED_FILTERS, playedState: 'unplayed' },
  },
  {
    label: 'Quick (< 3 min)',
    difficulty: 'all',
    advanced: { ...EMPTY_ADVANCED_FILTERS, durationMax: '180' },
  },
  {
    label: 'Hard',
    difficulty: 'hard',
    advanced: EMPTY_ADVANCED_FILTERS,
  },
  {
    label: 'High Score',
    difficulty: 'all',
    advanced: { ...EMPTY_ADVANCED_FILTERS, scoreMin: '90' },
  },
];

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
    tags: song.tags,
  };
}

function hasAdvancedFilters(filters: LibraryAdvancedFilters): boolean {
  return Object.entries(filters).some(([key, value]) => key !== 'playedState' ? value !== '' : value !== 'all');
}

function withinDateRange(date: string, from: string, to: string): boolean {
  const value = new Date(date).getTime();
  if (from && value < new Date(from).getTime()) {
    return false;
  }
  if (to) {
    const endOfDay = new Date(to);
    endOfDay.setHours(23, 59, 59, 999);
    if (value > endOfDay.getTime()) {
      return false;
    }
  }
  return true;
}

export function LibraryScreen({
  audioEngine,
  onStartSession,
  onStartPlaylistQueue,
  onStartTheoryPractice,
}: LibraryScreenProps) {
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [statsBySongId, setStatsBySongId] = useState<Record<string, UserStatsRow | null>>({});
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistRow[]>([]);
  const [playlistSongs, setPlaylistSongs] = useState<SongRow[]>([]);
  const [activeView, setActiveView] = useState<LibraryActiveView>({ type: 'all' });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [advancedFilters, setAdvancedFilters] = useState<LibraryAdvancedFilters>(EMPTY_ADVANCED_FILTERS);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());
  const [statusMessage, setStatusMessage] = useState('Build your library by importing MIDI files.');
  const [isLoading, setIsLoading] = useState(true);
  const [isRecommendationsLoading, setIsRecommendationsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SongDraft | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationResult | null>(null);
  const [previewSongId, setPreviewSongId] = useState<string | null>(null);
  const previewTimeoutsRef = useRef<number[]>([]);
  const [userPresets, setUserPresets] = useState<FilterPreset[]>(() => {
    try {
      const raw = localStorage.getItem('pianohero-filter-presets');
      return raw ? (JSON.parse(raw) as FilterPreset[]) : [];
    } catch {
      return [];
    }
  });
  const [newPresetName, setNewPresetName] = useState('');

  const refreshLibrary = async () => {
    if (!window.appBridge) {
      setStatusMessage('The app bridge is unavailable.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsRecommendationsLoading(true);
    const [nextSongs, nextFolders, nextPlaylists, nextRecommendations] = await Promise.all([
      window.appBridge.getAllSongs(),
      window.appBridge.getAllFolders(),
      window.appBridge.getAllPlaylists(),
      window.appBridge.getRecommendations().catch(() => null),
    ]);
    const statsEntries = await Promise.all(
      nextSongs.map(async (song) => [song.id, await window.appBridge!.getUserStats(song.id)] as const),
    );

    setSongs(nextSongs);
    setFolders(nextFolders);
    setPlaylists(nextPlaylists);
    setStatsBySongId(Object.fromEntries(statsEntries));
    setRecommendations(nextRecommendations);
    setIsLoading(false);
    setIsRecommendationsLoading(false);

    if (nextSongs.length === 0) {
      setStatusMessage('Build your library by importing MIDI files.');
    } else {
      setStatusMessage(`${nextSongs.length} song${nextSongs.length === 1 ? '' : 's'} ready to play.`);
    }
  };

  useEffect(() => {
    void refreshLibrary();
  }, []);

  useEffect(() => {
    const loadPlaylistSongs = async () => {
      if (!window.appBridge || activeView.type !== 'playlist') {
        setPlaylistSongs([]);
        return;
      }
      const nextPlaylistSongs = await window.appBridge.getPlaylistSongs(activeView.id);
      setPlaylistSongs(nextPlaylistSongs);
    };

    void loadPlaylistSongs();
  }, [activeView]);

  const selectedSong = useMemo(
    () => songs.find((entry) => entry.id === editingSongId) ?? playlistSongs.find((entry) => entry.id === editingSongId) ?? null,
    [editingSongId, playlistSongs, songs],
  );

  useEffect(() => {
    if (selectedSong) {
      setDraft(createDraft(selectedSong));
    } else {
      setDraft(null);
    }
  }, [selectedSong]);

  const allTagSuggestions = useMemo(
    () => [...new Set(songs.flatMap((song) => song.tags))].sort((left, right) => left.localeCompare(right)),
    [songs],
  );

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

  const handleImportFolder = async () => {
    if (!window.appBridge) {
      return;
    }

    setIsImporting(true);
    try {
      const result = await window.appBridge.importMidiFolder();
      if (!result) {
        setStatusMessage('Import canceled.');
      } else if (result.imported.length === 0 && result.skipped === 0) {
        setStatusMessage('No MIDI files found in that folder.');
      } else {
        const parts: string[] = [];
        if (result.imported.length > 0) parts.push(`${result.imported.length} song${result.imported.length === 1 ? '' : 's'} imported`);
        if (result.skipped > 0) parts.push(`${result.skipped} already in library`);
        setStatusMessage(parts.join(', ') + '.');
        if (result.imported.length > 0) {
          await refreshLibrary();
        }
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

  const handleExportLibrary = async () => {
    if (!window.appBridge) {
      return;
    }

    const filePath = await window.appBridge.exportLibrary();
    if (filePath) {
      setStatusMessage(`Library exported to ${filePath}.`);
    }
  };

  const handleImportLibrary = async () => {
    if (!window.appBridge) {
      return;
    }

    const result = await window.appBridge.importLibrary();
    if (!result) {
      return;
    }

    await refreshLibrary();
    setStatusMessage(
      `Imported ${result.songsImported} songs, ${result.foldersImported} folders, and ${result.playlistsImported} playlists.`,
    );
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
      tags: draft.tags,
    });
    setStatusMessage(`Saved metadata for ${draft.title.trim() || selectedSong.title}.`);
    await refreshLibrary();
  };

  const handleDeleteSongs = async (songIds: string[]) => {
    if (!window.appBridge || songIds.length === 0) {
      return;
    }

    await window.appBridge.bulkDeleteSongs(songIds);
    setSelectedSongIds(new Set());
    await refreshLibrary();
  };

  const handleAddTagFilter = (tag: string) => {
    setSelectedTagFilters((current) => (current.includes(tag) ? current.filter((entry) => entry !== tag) : [...current, tag]));
  };

  const handleCreateFolder = async (name: string) => {
    if (!window.appBridge || !name.trim()) {
      return;
    }
    await window.appBridge.createFolder(name.trim());
    await refreshLibrary();
  };

  const handleRenameFolder = async (folderId: string, name: string) => {
    if (!window.appBridge || !name.trim()) {
      return;
    }
    await window.appBridge.renameFolder(folderId, name.trim());
    await refreshLibrary();
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!window.appBridge) {
      return;
    }
    await window.appBridge.deleteFolder(folderId);
    if (activeView.type === 'folder' && activeView.id === folderId) {
      setActiveView({ type: 'all' });
    }
    await refreshLibrary();
  };

  const handleCreatePlaylist = async (name: string) => {
    if (!window.appBridge || !name.trim()) {
      return;
    }
    const playlist = await window.appBridge.createPlaylist(name.trim());
    await refreshLibrary();
    setActiveView({ type: 'playlist', id: playlist.id });
  };

  const handleRenamePlaylist = async (playlistId: string, name: string) => {
    if (!window.appBridge || !name.trim()) {
      return;
    }
    await window.appBridge.updatePlaylist(playlistId, { name: name.trim() });
    await refreshLibrary();
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (!window.appBridge) {
      return;
    }
    await window.appBridge.deletePlaylist(playlistId);
    if (activeView.type === 'playlist' && activeView.id === playlistId) {
      setActiveView({ type: 'all' });
    }
    await refreshLibrary();
  };

  const handleSavePreset = () => {
    const name = newPresetName.trim();
    if (!name) {
      return;
    }
    const preset: FilterPreset = { label: name, difficulty: difficultyFilter, advanced: advancedFilters };
    const next = [...userPresets.filter((p) => p.label !== name), preset];
    setUserPresets(next);
    localStorage.setItem('pianohero-filter-presets', JSON.stringify(next));
    setNewPresetName('');
  };

  const handleDeletePreset = (label: string) => {
    const next = userPresets.filter((p) => p.label !== label);
    setUserPresets(next);
    localStorage.setItem('pianohero-filter-presets', JSON.stringify(next));
  };

  const stopPreview = () => {
    previewTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
    previewTimeoutsRef.current = [];
    audioEngine.allNotesOff();
    setPreviewSongId(null);
  };

  const handlePreview = async (song: SongRow) => {
    stopPreview();
    if (!window.appBridge) {
      return;
    }
    setPreviewSongId(song.id);
    try {
      await audioEngine.init();
      const bytes = await window.appBridge.loadMidiFileData(song.filePath);
      const parsed = parseMidiFile(bytes.slice().buffer, { songId: song.id, title: song.title });
      const PREVIEW_DURATION_SEC = 20;
      const allNotes = parsed.notes
        .filter((note) => note.startSec < PREVIEW_DURATION_SEC)
        .sort((a, b) => a.startSec - b.startSec);

      const ids: number[] = [];
      for (const note of allNotes) {
        const onId = window.setTimeout(
          () => void audioEngine.noteOn(note.midi, note.velocity),
          note.startSec * 1000,
        );
        const offId = window.setTimeout(
          () => audioEngine.noteOff(note.midi),
          (note.startSec + note.durationSec) * 1000,
        );
        ids.push(onId, offId);
      }
      // Auto-stop after preview duration
      const endId = window.setTimeout(() => {
        audioEngine.allNotesOff();
        setPreviewSongId(null);
        previewTimeoutsRef.current = [];
      }, PREVIEW_DURATION_SEC * 1000);
      ids.push(endId);
      previewTimeoutsRef.current = ids;
    } catch {
      setPreviewSongId(null);
    }
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const playlistFiltersActive = Boolean(normalizedQuery) || difficultyFilter !== 'all' || selectedTagFilters.length > 0 || hasAdvancedFilters(advancedFilters);

  const baseSongs = useMemo(() => {
    switch (activeView.type) {
      case 'favorites':
        return songs.filter((song) => song.isFavorite);
      case 'folder':
        return songs.filter((song) => song.folderId === activeView.id);
      case 'playlist':
        return playlistSongs;
      case 'all':
      default:
        return songs;
    }
  }, [activeView, playlistSongs, songs]);

  const visibleSongs = useMemo(() => {
    const filtered = baseSongs.filter((song) => {
      if (!matchesDifficulty(song, difficultyFilter)) {
        return false;
      }
      if (selectedTagFilters.some((tag) => !song.tags.includes(tag))) {
        return false;
      }
      if (advancedFilters.durationMin && song.durationSec < Number(advancedFilters.durationMin)) {
        return false;
      }
      if (advancedFilters.durationMax && song.durationSec > Number(advancedFilters.durationMax)) {
        return false;
      }
      const bestAccuracy = statsBySongId[song.id]?.bestAccuracy ?? 0;
      if (advancedFilters.scoreMin && bestAccuracy < Number(advancedFilters.scoreMin)) {
        return false;
      }
      if (advancedFilters.scoreMax && bestAccuracy > Number(advancedFilters.scoreMax)) {
        return false;
      }
      if (advancedFilters.playedState === 'played' && song.timesPlayed === 0) {
        return false;
      }
      if (advancedFilters.playedState === 'unplayed' && song.timesPlayed > 0) {
        return false;
      }
      if (!withinDateRange(song.dateAdded, advancedFilters.dateAddedFrom, advancedFilters.dateAddedTo)) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }

      const haystack = `${song.title} ${song.artist} ${song.genre} ${song.tags.join(' ')}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });

    if (activeView.type === 'playlist') {
      return filtered;
    }

    return [...filtered].sort((left, right) => {
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
  }, [activeView, advancedFilters, baseSongs, difficultyFilter, normalizedQuery, selectedTagFilters, sortDirection, sortField, statsBySongId]);

  const visibleSongIds = useMemo(() => visibleSongs.map((song) => song.id), [visibleSongs]);

  const currentPlaylist = activeView.type === 'playlist' ? playlists.find((playlist) => playlist.id === activeView.id) ?? null : null;

  const contentTitle = currentPlaylist
    ? currentPlaylist.name
    : activeView.type === 'folder'
      ? folders.find((folder) => folder.id === activeView.id)?.name ?? 'Folder'
      : activeView.type === 'favorites'
        ? 'Favorites'
        : 'All Songs';

  const renderSongCard = (song: SongRow) => {
    const stats = statsBySongId[song.id];

    return (
      <article className="panel song-card" key={song.id}>
        <div className="song-card-header">
          <div className="song-card-title-group">
            <label className="song-select-toggle">
              <input
                type="checkbox"
                checked={selectedSongIds.has(song.id)}
                onChange={(event) => {
                  setSelectedSongIds((current) => {
                    const next = new Set(current);
                    if (event.target.checked) {
                      next.add(song.id);
                    } else {
                      next.delete(song.id);
                    }
                    return next;
                  });
                }}
              />
              <span />
            </label>
            <div>
              <p className="eyebrow">{song.genre || 'Library Song'}</p>
              <h2>{song.title}</h2>
              <p className="panel-copy">{song.artist || 'Unknown artist'}</p>
            </div>
          </div>
          <button className="secondary-button favorite-toggle" onClick={() => void handleToggleFavorite(song.id)}>
            {song.isFavorite ? 'Favorite' : 'Mark Favorite'}
          </button>
        </div>

        <div className="song-card-meta">
          <span className={`difficulty-badge difficulty-${song.difficulty}`}>
            Difficulty {song.difficulty}
          </span>
          <span>{formatDuration(song.durationSec)}</span>
          <span>{Math.round(song.bpm)} BPM</span>
          <span>{song.folderId ? folders.find((folder) => folder.id === song.folderId)?.name ?? 'Folder' : 'Unfiled'}</span>
        </div>

        {song.tags.length > 0 && (
          <TagChips tags={song.tags} onTagClick={handleAddTagFilter} />
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
          <button className="primary-button" onClick={() => { stopPreview(); onStartSession(song, 'piano-hero'); }}>
            Play
          </button>
          <button className="secondary-button" onClick={() => { stopPreview(); onStartSession(song, 'learning'); }}>
            Learn
          </button>
          <button className="secondary-button" onClick={() => { stopPreview(); onStartSession(song, 'performance'); }}>
            Perform
          </button>
          {previewSongId === song.id ? (
            <button className="secondary-button" onClick={stopPreview}>
              Stop Preview
            </button>
          ) : (
            <button className="secondary-button" onClick={() => void handlePreview(song)} disabled={previewSongId !== null}>
              Preview
            </button>
          )}
          <button className="secondary-button" onClick={() => setEditingSongId(song.id)}>
            Edit Metadata
          </button>
        </div>
      </article>
    );
  };

  const recommendationGroups = recommendations ? [
    { title: 'Next Challenge', items: recommendations.nextChallenge },
    { title: 'Skill Builder', items: recommendations.skillBuilder },
    { title: 'You Might Like', items: recommendations.youMightLike },
    { title: 'Revisit', items: recommendations.revisit },
  ] : [];

  return (
    <main className="app-shell library-screen">
      <section className="panel library-header">
        <div>
          <p className="eyebrow">Piano Hero</p>
          <h1>Your Library</h1>
          <p className="song-title">{statusMessage}</p>
        </div>
        <div className="transport-buttons">
          <button className="secondary-button" onClick={() => void handleExportLibrary()}>
            Export Library
          </button>
          <button className="secondary-button" onClick={() => void handleImportLibrary()}>
            Import Library
          </button>
          <button className="secondary-button" onClick={() => void refreshLibrary()} disabled={isLoading}>
            Refresh
          </button>
          <button className="secondary-button" onClick={() => void handleImportFolder()} disabled={isImporting}>
            {isImporting ? 'Importing...' : 'Import Folder'}
          </button>
          <button className="primary-button" onClick={() => void handleImport()} disabled={isImporting}>
            {isImporting ? 'Importing...' : 'Upload MIDI'}
          </button>
        </div>
      </section>

      <section className="library-layout">
        <LibrarySidebar
          activeView={activeView}
          folders={folders}
          playlists={playlists}
          onChangeView={(view) => {
            setActiveView(view);
            setSelectedSongIds(new Set());
          }}
          onCreateFolder={(name) => void handleCreateFolder(name)}
          onRenameFolder={(folderId, name) => void handleRenameFolder(folderId, name)}
          onDeleteFolder={(folderId) => void handleDeleteFolder(folderId)}
          onCreatePlaylist={(name) => void handleCreatePlaylist(name)}
          onRenamePlaylist={(playlistId, name) => void handleRenamePlaylist(playlistId, name)}
          onDeletePlaylist={(playlistId) => void handleDeletePlaylist(playlistId)}
        />

        <div className="library-content">
          {activeView.type === 'all' && (
            <section className="panel recommendations-section">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Recommended for You</p>
                  <h2>What to play next</h2>
                </div>
              </div>
              {isRecommendationsLoading ? (
                <div className="loading-spinner" />
              ) : recommendationGroups.every((group) => group.items.length === 0) ? (
                <p className="empty-state">Play a few sessions to unlock personalized recommendations.</p>
              ) : (
                <div className="recommendation-groups">
                  {recommendationGroups.map((group) => (
                    <article className="recommendation-group" key={group.title}>
                      <div className="recommendation-group-header">
                        <h3>{group.title}</h3>
                      </div>
                      <div className="recommendation-carousel">
                        {group.items.map((item) => (
                          <article className="recommendation-card" key={`${group.title}-${item.song.id}`}>
                            <p className="eyebrow">{item.song.genre || 'Library Pick'}</p>
                            <h3>{item.song.title}</h3>
                            <p className="panel-copy">{item.reason}</p>
                            <div className="song-card-meta">
                              <span>Difficulty {item.song.difficulty}</span>
                              <span>{Math.round(item.song.bpm)} BPM</span>
                            </div>
                            <div className="song-card-actions">
                              <button className="primary-button" onClick={() => onStartSession(item.song, 'piano-hero')}>
                                Play
                              </button>
                              <button className="secondary-button" onClick={() => onStartSession(item.song, 'learning')}>
                                Learn
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeView.type === 'all' && recommendations && (
            (() => {
              const revisitSong = recommendations.revisit[0]?.song ?? null;
              const challengeSong = recommendations.nextChallenge[0]?.song ?? null;
              if (!revisitSong && !challengeSong) {
                return null;
              }
              return (
                <section className="panel practice-plan-section">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">Practice Plan</p>
                      <h2>Suggested session</h2>
                    </div>
                  </div>
                  <p className="panel-copy">A ready-made routine for your next practice slot.</p>
                  <ol className="practice-routine-steps">
                    <li className="practice-routine-step">
                      <div className="step-number">1</div>
                      <div className="step-body">
                        <strong>Warm-up: Theory drill</strong>
                        <p className="panel-copy">A quick scale or chord quiz to get the fingers and ears engaged.</p>
                      </div>
                      <button className="secondary-button" onClick={onStartTheoryPractice}>Open Theory</button>
                    </li>
                    {revisitSong && (
                      <li className="practice-routine-step">
                        <div className="step-number">2</div>
                        <div className="step-body">
                          <strong>Review: {revisitSong.title}</strong>
                          <p className="panel-copy">Revisit a recent song to consolidate what you already know.</p>
                        </div>
                        <button className="secondary-button" onClick={() => { stopPreview(); onStartSession(revisitSong, 'learning'); }}>Learn</button>
                      </li>
                    )}
                    {challengeSong && (
                      <li className="practice-routine-step">
                        <div className="step-number">{revisitSong ? 3 : 2}</div>
                        <div className="step-body">
                          <strong>Challenge: {challengeSong.title}</strong>
                          <p className="panel-copy">Push your current level with something slightly harder.</p>
                        </div>
                        <button className="secondary-button" onClick={() => { stopPreview(); onStartSession(challengeSong, 'piano-hero'); }}>Play</button>
                      </li>
                    )}
                  </ol>
                </section>
              );
            })()
          )}

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
              <select
                value={sortField}
                disabled={activeView.type === 'playlist'}
                onChange={(event) => setSortField(event.target.value as SortField)}
              >
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
                disabled={activeView.type === 'playlist'}
                onChange={(event) => setSortDirection(event.target.value as SortDirection)}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </label>

            <div className="view-toggle">
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

          <section className="filter-chips filter-presets">
            <span className="filter-preset-label">Quick Filters:</span>
            {FILTER_PRESETS.map((preset) => (
              <button
                key={preset.label}
                className="secondary-button"
                onClick={() => {
                  setDifficultyFilter(preset.difficulty);
                  setAdvancedFilters(preset.advanced);
                  setSelectedTagFilters([]);
                }}
              >
                {preset.label}
              </button>
            ))}
            {userPresets.map((preset) => (
              <span key={preset.label} className="user-preset-chip">
                <button
                  className="secondary-button"
                  onClick={() => {
                    setDifficultyFilter(preset.difficulty);
                    setAdvancedFilters(preset.advanced);
                    setSelectedTagFilters([]);
                  }}
                >
                  {preset.label}
                </button>
                <button
                  className="secondary-button user-preset-delete"
                  onClick={() => handleDeletePreset(preset.label)}
                  title={`Remove "${preset.label}" preset`}
                >
                  ×
                </button>
              </span>
            ))}
            <span className="user-preset-save">
              <input
                type="text"
                className="preset-name-input"
                placeholder="Preset name…"
                value={newPresetName}
                onChange={(event) => setNewPresetName(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') handleSavePreset(); }}
              />
              <button className="secondary-button" onClick={handleSavePreset} disabled={!newPresetName.trim()}>
                Save Filters
              </button>
            </span>
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

          <AdvancedFilters
            isOpen={showAdvancedFilters}
            filters={advancedFilters}
            onToggle={() => setShowAdvancedFilters((value) => !value)}
            onChange={setAdvancedFilters}
            onClear={() => {
              setAdvancedFilters(EMPTY_ADVANCED_FILTERS);
              setSelectedTagFilters([]);
            }}
          />

          {(selectedTagFilters.length > 0 || activeView.type !== 'all') && (
            <section className="tag-filter-summary">
              <div className="panel active-filters-panel">
                <div>
                  <p className="eyebrow">Current View</p>
                  <h2>{contentTitle}</h2>
                </div>
                {selectedTagFilters.length > 0 && (
                  <TagChips tags={selectedTagFilters} removable onChange={setSelectedTagFilters} />
                )}
              </div>
            </section>
          )}

          {selectedSongIds.size > 0 && (
            <BulkActionBar
              selectedCount={selectedSongIds.size}
              folders={folders}
              playlists={playlists}
              onClearSelection={() => setSelectedSongIds(new Set())}
              onDelete={() => void handleDeleteSongs([...selectedSongIds])}
              onMoveToFolder={(folderId) =>
                void (async () => {
                  if (!window.appBridge) {
                    return;
                  }
                  const normalizedFolderId = folderId === '__NONE__' ? null : folderId;
                  await window.appBridge.bulkMoveSongsToFolder([...selectedSongIds], normalizedFolderId);
                  setSelectedSongIds(new Set());
                  await refreshLibrary();
                })()
              }
              onAddTag={(tag) =>
                void (async () => {
                  if (!window.appBridge || !tag.trim()) {
                    return;
                  }
                  await window.appBridge.bulkAddTag([...selectedSongIds], tag.trim());
                  await refreshLibrary();
                })()
              }
              onAddToPlaylist={(playlistId) =>
                void (async () => {
                  if (!window.appBridge) {
                    return;
                  }
                  await window.appBridge.bulkAddToPlaylist([...selectedSongIds], playlistId);
                  await refreshLibrary();
                })()
              }
            />
          )}

          <section className="library-selection-row">
            <button
              className="secondary-button"
              onClick={() => setSelectedSongIds(new Set(visibleSongIds))}
              disabled={visibleSongIds.length === 0}
            >
              Select All Visible
            </button>
            <button className="secondary-button" onClick={() => setSelectedSongIds(new Set())}>
              Deselect All
            </button>
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
                  <TagChips
                    tags={draft.tags}
                    editable
                    removable
                    suggestions={allTagSuggestions}
                    onChange={(tags) => setDraft({ ...draft, tags })}
                  />
                </label>
              </div>
            </section>
          )}

          {isLoading ? (
            <section className="panel empty-state-panel">
              <p className="empty-state">Loading library...</p>
            </section>
          ) : activeView.type === 'playlist' ? (
            <PlaylistView
              songs={visibleSongs}
              canReorder={!playlistFiltersActive}
              onPlayAll={() => onStartPlaylistQueue(playlistSongs)}
              onStartSession={(song) => onStartSession(song, 'piano-hero')}
              onRemoveSong={(songId) =>
                void (async () => {
                  if (!window.appBridge || activeView.type !== 'playlist') {
                    return;
                  }
                  await window.appBridge.removeSongFromPlaylist(activeView.id, songId);
                  const nextPlaylistSongs = await window.appBridge.getPlaylistSongs(activeView.id);
                  setPlaylistSongs(nextPlaylistSongs);
                  await refreshLibrary();
                })()
              }
              onReorderSong={(songId, newOrder) =>
                void (async () => {
                  if (!window.appBridge || activeView.type !== 'playlist') {
                    return;
                  }
                  await window.appBridge.reorderPlaylistSong(activeView.id, songId, newOrder);
                  const nextPlaylistSongs = await window.appBridge.getPlaylistSongs(activeView.id);
                  setPlaylistSongs(nextPlaylistSongs);
                  await refreshLibrary();
                })()
              }
              onTagClick={handleAddTagFilter}
            />
          ) : visibleSongs.length === 0 ? (
            <section className="panel empty-state-panel">
              <p className="empty-state">No songs match the current filters.</p>
            </section>
          ) : (
            <section className={viewMode === 'grid' ? 'song-grid' : 'song-list'}>
              {visibleSongs.map(renderSongCard)}
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
