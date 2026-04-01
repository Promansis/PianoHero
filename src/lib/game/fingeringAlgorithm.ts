import type { HandSize, ScheduledNote } from './types';

const BLACK_KEYS = new Set([1, 3, 6, 8, 10]);
const CHORD_EPSILON_SEC = 0.005;
const FINGERS = [1, 2, 3, 4, 5] as const;

const STRETCH_TABLE: Record<HandSize, Record<string, number>> = {
  small: {
    '1-2': 3,
    '1-3': 5,
    '1-4': 7,
    '1-5': 8,
    '2-3': 3,
    '2-4': 5,
    '2-5': 7,
    '3-4': 3,
    '3-5': 5,
    '4-5': 3,
  },
  medium: {
    '1-2': 4,
    '1-3': 6,
    '1-4': 8,
    '1-5': 10,
    '2-3': 3,
    '2-4': 5,
    '2-5': 8,
    '3-4': 3,
    '3-5': 6,
    '4-5': 4,
  },
  large: {
    '1-2': 5,
    '1-3': 7,
    '1-4': 10,
    '1-5': 12,
    '2-3': 4,
    '2-4': 7,
    '2-5': 10,
    '3-4': 4,
    '3-5': 7,
    '4-5': 5,
  },
};

interface IndexedNote extends ScheduledNote {
  originalIndex: number;
}

interface NoteGroup {
  notes: IndexedNote[];
}

interface GroupState {
  fingers: number[];
  cost: number;
}

interface DpCell {
  cost: number;
  prevStateIndex: number;
}

export function computeFingering(notes: ScheduledNote[], handSize: HandSize): Map<number, number> {
  const assignments = new Map<number, number>();

  for (const hand of ['left', 'right'] as const) {
    const handNotes = notes
      .map((note, originalIndex) => ({ ...note, originalIndex }))
      .filter((note) => note.effectiveHand === hand)
      .sort((left, right) => {
        if (left.startSec !== right.startSec) {
          return left.startSec - right.startSec;
        }
        return left.midi - right.midi;
      });

    if (handNotes.length === 0) {
      continue;
    }

    const scaleLikeFingerings = detectScaleLikeFingerings(handNotes);
    if (scaleLikeFingerings) {
      scaleLikeFingerings.forEach((finger, originalIndex) => {
        assignments.set(originalIndex, finger);
      });
      continue;
    }

    const groups = buildGroups(handNotes);
    const statesByGroup = groups.map((group) => buildStatesForGroup(group, handSize));
    const backtrace = runDynamicProgramming(groups, statesByGroup, handSize);

    backtrace.forEach((stateIndex, groupIndex) => {
      const group = groups[groupIndex];
      const state = statesByGroup[groupIndex][stateIndex];
      group.notes.forEach((note, noteIndex) => {
        assignments.set(note.originalIndex, state.fingers[noteIndex]);
      });
    });
  }

  return assignments;
}

function detectScaleLikeFingerings(notes: IndexedNote[]): Map<number, number> | null {
  if (notes.length !== 8) {
    return null;
  }
  if (!notes.every((note, index) => index === 0 || note.startSec > notes[index - 1].startSec)) {
    return null;
  }

  const pitchDeltas = notes.slice(1).map((note, index) => note.midi - notes[index].midi);
  const isAscending = pitchDeltas.every((delta) => delta > 0 && delta <= 2);
  const isDescending = pitchDeltas.every((delta) => delta < 0 && delta >= -2);
  const spansOctave = Math.abs(notes.at(-1)!.midi - notes[0].midi) === 12;

  if (!spansOctave) {
    return null;
  }

  const hand = notes[0].effectiveHand;
  const shouldUseStandardPattern =
    (hand === 'right' && isAscending) || (hand === 'left' && isDescending);

  if (!shouldUseStandardPattern) {
    return null;
  }

  const pattern = [1, 2, 3, 1, 2, 3, 4, 5];
  return new Map(notes.map((note, index) => [note.originalIndex, pattern[index]]));
}

function buildGroups(notes: IndexedNote[]): NoteGroup[] {
  const groups: NoteGroup[] = [];

  for (const note of notes) {
    const lastGroup = groups.at(-1);
    if (lastGroup && Math.abs(lastGroup.notes[0].startSec - note.startSec) <= CHORD_EPSILON_SEC) {
      lastGroup.notes.push(note);
      lastGroup.notes.sort((left, right) => left.midi - right.midi);
      continue;
    }

    groups.push({ notes: [note] });
  }

  return groups;
}

function buildStatesForGroup(group: NoteGroup, handSize: HandSize): GroupState[] {
  const fingerCombos = enumerateFingerCombos(group.notes.length);
  const states = fingerCombos
    .filter((fingers) => isValidChordState(group.notes, fingers, handSize))
    .map((fingers) => ({
      fingers,
      cost: chordIntrinsicCost(group.notes, fingers),
    }));

  return states.length > 0 ? states : [{ fingers: [3], cost: chordIntrinsicCost(group.notes, [3]) }];
}

function enumerateFingerCombos(length: number): number[][] {
  if (length === 1) {
    return FINGERS.map((finger) => [finger]);
  }

  const combos: number[][] = [];
  const walk = (startIndex: number, current: number[]) => {
    if (current.length === length) {
      combos.push([...current]);
      return;
    }

    for (let index = startIndex; index < FINGERS.length; index += 1) {
      current.push(FINGERS[index]);
      walk(index + 1, current);
      current.pop();
    }
  };

  walk(0, []);
  return combos;
}

function isValidChordState(notes: IndexedNote[], fingers: number[], handSize: HandSize): boolean {
  if (notes.length !== fingers.length) {
    return false;
  }
  if (notes.length === 1) {
    return true;
  }

  for (let index = 1; index < notes.length; index += 1) {
    if (notes[index].midi < notes[index - 1].midi || fingers[index] <= fingers[index - 1]) {
      return false;
    }
  }

  for (let leftIndex = 0; leftIndex < notes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < notes.length; rightIndex += 1) {
      const interval = Math.abs(notes[rightIndex].midi - notes[leftIndex].midi);
      const stretch = comfortableStretch(fingers[leftIndex], fingers[rightIndex], handSize);
      if (interval > stretch) {
        return false;
      }
    }
  }

  return true;
}

function chordIntrinsicCost(notes: IndexedNote[], fingers: number[]): number {
  let cost = 0;

  for (let index = 0; index < notes.length; index += 1) {
    const note = notes[index];
    const finger = fingers[index];
    cost += Math.abs(finger - 3) * 0.6;

    if (finger === 1 && isBlackKey(note.midi)) {
      cost += 4;
    }
    if (finger === 4 && note.durationSec <= 0.18) {
      cost += 1;
    }
  }

  if (notes.length === 3 && notes[1].midi - notes[0].midi === 4 && notes[2].midi - notes[1].midi === 3) {
    if (fingers.join('-') === '1-3-5') {
      cost -= 2;
    }
  }

  return cost;
}

function runDynamicProgramming(groups: NoteGroup[], statesByGroup: GroupState[][], handSize: HandSize): number[] {
  const dp: DpCell[][] = statesByGroup.map((states) =>
    states.map(() => ({
      cost: Number.POSITIVE_INFINITY,
      prevStateIndex: -1,
    })),
  );

  statesByGroup[0].forEach((state, stateIndex) => {
    dp[0][stateIndex] = {
      cost: state.cost,
      prevStateIndex: -1,
    };
  });

  for (let groupIndex = 1; groupIndex < groups.length; groupIndex += 1) {
    const prevStates = statesByGroup[groupIndex - 1];
    const currentStates = statesByGroup[groupIndex];

    currentStates.forEach((currentState, currentStateIndex) => {
      prevStates.forEach((prevState, prevStateIndex) => {
        const transitionCost =
          dp[groupIndex - 1][prevStateIndex].cost +
          currentState.cost +
          groupTransitionCost(groups[groupIndex - 1], prevState, groups[groupIndex], currentState, handSize);

        if (transitionCost < dp[groupIndex][currentStateIndex].cost) {
          dp[groupIndex][currentStateIndex] = {
            cost: transitionCost,
            prevStateIndex: prevStateIndex,
          };
        }
      });
    });
  }

  let bestStateIndex = 0;
  const lastGroupIndex = groups.length - 1;
  for (let stateIndex = 1; stateIndex < dp[lastGroupIndex].length; stateIndex += 1) {
    if (dp[lastGroupIndex][stateIndex].cost < dp[lastGroupIndex][bestStateIndex].cost) {
      bestStateIndex = stateIndex;
    }
  }

  const result = new Array<number>(groups.length);
  let stateIndex = bestStateIndex;
  for (let groupIndex = groups.length - 1; groupIndex >= 0; groupIndex -= 1) {
    result[groupIndex] = stateIndex;
    stateIndex = dp[groupIndex][stateIndex].prevStateIndex;
  }

  return result;
}

function groupTransitionCost(
  prevGroup: NoteGroup,
  prevState: GroupState,
  nextGroup: NoteGroup,
  nextState: GroupState,
  handSize: HandSize,
): number {
  const prevAnchorIndex = prevGroup.notes.length === 1 ? 0 : prevGroup.notes.length - 1;
  const nextAnchorIndex = 0;

  const prevNote = prevGroup.notes[prevAnchorIndex];
  const nextNote = nextGroup.notes[nextAnchorIndex];
  const prevFinger = prevState.fingers[prevAnchorIndex];
  const nextFinger = nextState.fingers[nextAnchorIndex];

  let cost = singleTransitionCost(prevNote, prevFinger, nextNote, nextFinger, handSize);

  const outerPrevNote = prevGroup.notes[0];
  const outerNextNote = nextGroup.notes[nextGroup.notes.length - 1];
  const outerPrevFinger = prevState.fingers[0];
  const outerNextFinger = nextState.fingers[nextState.fingers.length - 1];
  cost += singleTransitionCost(outerPrevNote, outerPrevFinger, outerNextNote, outerNextFinger, handSize) * 0.25;

  return cost;
}

function singleTransitionCost(
  prevNote: IndexedNote,
  prevFinger: number,
  nextNote: IndexedNote,
  nextFinger: number,
  handSize: HandSize,
): number {
  const interval = Math.abs(nextNote.midi - prevNote.midi);
  const stretch = comfortableStretch(prevFinger, nextFinger, handSize);
  let cost = Math.max(0, interval - stretch) ** 2;

  if (nextFinger === 1 && isBlackKey(nextNote.midi)) {
    cost += 4;
  }
  if (prevFinger === nextFinger && prevNote.midi !== nextNote.midi) {
    cost += 10;
  }
  if (nextFinger === 4 && nextNote.startSec - prevNote.startSec < 0.15) {
    cost += 1;
  }
  if (hasDirectionMismatch(prevNote, prevFinger, nextNote, nextFinger)) {
    cost += 3;
  }

  if (nextNote.startSec - prevNote.startSec > 0.75) {
    cost += Math.abs(nextFinger - 3) * 0.2;
  }

  if (shouldRewardThumbCrossing(prevNote, prevFinger, nextNote, nextFinger)) {
    cost -= 6;
  }

  return cost;
}

function hasDirectionMismatch(
  prevNote: IndexedNote,
  prevFinger: number,
  nextNote: IndexedNote,
  nextFinger: number,
): boolean {
  const pitchDelta = nextNote.midi - prevNote.midi;
  const fingerDelta = nextFinger - prevFinger;

  if (pitchDelta === 0 || fingerDelta === 0) {
    return false;
  }
  if (prevFinger === 1 || nextFinger === 1) {
    return false;
  }

  const handDirection = nextNote.effectiveHand === 'right' ? 1 : -1;
  const normalizedPitchDelta = pitchDelta * handDirection;
  return normalizedPitchDelta * fingerDelta < 0;
}

function shouldRewardThumbCrossing(
  prevNote: IndexedNote,
  prevFinger: number,
  nextNote: IndexedNote,
  nextFinger: number,
): boolean {
  const pitchDelta = nextNote.midi - prevNote.midi;
  if (prevNote.effectiveHand === 'right') {
    return pitchDelta > 0 && prevFinger === 3 && nextFinger === 1;
  }

  return pitchDelta < 0 && prevFinger === 3 && nextFinger === 1;
}

function comfortableStretch(leftFinger: number, rightFinger: number, handSize: HandSize): number {
  const [low, high] = leftFinger < rightFinger ? [leftFinger, rightFinger] : [rightFinger, leftFinger];
  return STRETCH_TABLE[handSize][`${low}-${high}`] ?? 12;
}

function isBlackKey(midi: number): boolean {
  return BLACK_KEYS.has(midi % 12);
}
