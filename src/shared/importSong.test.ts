import { describe, expect, it } from 'vitest';
import { calculateDifficulty } from '../lib/midi/importMetadata';
import { calculateDifficulty as reexportedCalculateDifficulty } from './importSong';

describe('importSong compatibility exports', () => {
  it('re-exports pure MIDI import helpers from the domain module', () => {
    expect(reexportedCalculateDifficulty).toBe(calculateDifficulty);
  });
});
