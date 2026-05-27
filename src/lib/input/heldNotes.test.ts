import { describe, expect, it } from 'vitest';
import { HeldNoteTracker } from './heldNotes';

describe('HeldNoteTracker', () => {
  it('starts audio only for first source holding a note', () => {
    const tracker = new HeldNoteTracker();

    expect(tracker.press(60, 'midi:1')).toEqual({
      activeNotes: [60],
      shouldStartAudio: true,
      shouldStopAudio: false,
    });
    expect(tracker.press(60, 'computer:Space')).toEqual({
      activeNotes: [60],
      shouldStartAudio: false,
      shouldStopAudio: false,
    });
  });

  it('stops audio only after last source releases note', () => {
    const tracker = new HeldNoteTracker();

    tracker.press(60, 'midi:1');
    tracker.press(60, 'computer:Space');

    expect(tracker.release(60, 'midi:1')).toEqual({
      activeNotes: [60],
      shouldStartAudio: false,
      shouldStopAudio: false,
    });
    expect(tracker.release(60, 'computer:Space')).toEqual({
      activeNotes: [],
      shouldStartAudio: false,
      shouldStopAudio: true,
    });
  });

  it('keeps active note list sorted', () => {
    const tracker = new HeldNoteTracker();

    tracker.press(72, 'midi:72');
    tracker.press(60, 'midi:60');
    tracker.press(67, 'midi:67');

    expect(tracker.getActiveNotes()).toEqual([60, 67, 72]);
  });

  it('ignores release for unknown source', () => {
    const tracker = new HeldNoteTracker();
    tracker.press(60, 'midi:1');

    expect(tracker.release(60, 'missing')).toEqual({
      activeNotes: [60],
      shouldStartAudio: false,
      shouldStopAudio: false,
    });
  });
});
