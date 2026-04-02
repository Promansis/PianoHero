import type { ParsedNote, ParsedSong } from '../game/types';
import type { ChordMatch } from './chords';
import { detectChord, PITCH_CLASS_NAMES } from './chords';
import type { DetectedKey } from './keyDetection';
import { detectKey } from './keyDetection';
import type { ScaleDefinition } from './scales';
import { SCALE_DEFINITIONS } from './scales';

export interface TheorySuggestion {
  type: 'scale' | 'chord' | 'interval';
  label: string;
  description: string;
  params: Record<string, string | number>;
}

export interface SongTheoryAnalysis {
  detectedKey: DetectedKey;
  chordProgression: ChordMatch[];
  scalesUsed: ScaleDefinition[];
  suggestedPractice: TheorySuggestion[];
}

function groupConcurrentNotes(notes: ParsedNote[], windowMs = 50): ParsedNote[][] {
  const groups: ParsedNote[][] = [];
  const sorted = [...notes].sort((left, right) => left.startSec - right.startSec || left.midi - right.midi);

  for (const note of sorted) {
    const lastGroup = groups[groups.length - 1];
    if (!lastGroup) {
      groups.push([note]);
      continue;
    }

    const groupStart = lastGroup[0].startSec;
    if ((note.startSec - groupStart) * 1000 <= windowMs) {
      lastGroup.push(note);
    } else {
      groups.push([note]);
    }
  }

  return groups;
}

function deriveScalesFromKey(detectedKey: DetectedKey): ScaleDefinition[] {
  if (detectedKey.mode === 'major') {
    return SCALE_DEFINITIONS.filter((definition) => ['Major', 'Pentatonic Major', 'Chromatic'].includes(definition.name));
  }

  return SCALE_DEFINITIONS.filter((definition) =>
    ['Natural Minor', 'Harmonic Minor', 'Melodic Minor', 'Pentatonic Minor', 'Chromatic'].includes(definition.name),
  );
}

function buildSuggestions(detectedKey: DetectedKey, chords: ChordMatch[]): TheorySuggestion[] {
  const primaryScale = detectedKey.mode === 'major' ? 'Major' : 'Natural Minor';
  const suggestions: TheorySuggestion[] = [
    {
      type: 'scale',
      label: `${detectedKey.keyName} Scale`,
      description: `Practice the ${detectedKey.keyName} scale to reinforce the song's tonal center.`,
      params: {
        root: detectedKey.pitchClass,
        scaleName: primaryScale,
      },
    },
    {
      type: 'interval',
      label: 'Key Interval Training',
      description: `Train interval recognition around ${detectedKey.keyName} to hear the song's movement more clearly.`,
      params: {
        difficulty: detectedKey.mode === 'major' ? 'medium' : 'hard',
      },
    },
  ];

  const firstChord = chords[0];
  if (firstChord) {
    suggestions.push({
      type: 'chord',
      label: `${firstChord.label} Chord ID`,
      description: `Identify and spell the ${firstChord.label} sonority that opens this song.`,
      params: {
        quizType: 'chord',
        root: firstChord.root,
        quality: firstChord.quality,
      },
    });
  }

  return suggestions;
}

export function analyzeSong(song: ParsedSong): SongTheoryAnalysis {
  const detectedKey = detectKey(song.notes);
  const chordProgression = groupConcurrentNotes(song.notes)
    .map((group) => detectChord(group.map((note) => note.midi)))
    .filter((match): match is ChordMatch => Boolean(match))
    .filter((match, index, matches) => index === 0 || match.label !== matches[index - 1].label);
  const scalesUsed = deriveScalesFromKey(detectedKey);

  return {
    detectedKey,
    chordProgression,
    scalesUsed,
    suggestedPractice: buildSuggestions(detectedKey, chordProgression),
  };
}

export function pitchClassName(pitchClass: number): string {
  return PITCH_CLASS_NAMES[((pitchClass % 12) + 12) % 12];
}
