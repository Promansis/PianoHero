import {
  clampOctaveShift,
  createDefaultKeyboardMapping,
  invertKeyboardMapping,
  isSupportedKeyboardCode,
  keyboardActionToMidi,
} from './settings';
import type { InputEvent, KeyboardAction, KeyboardInputState, KeyboardMapping, KeyboardNoteAction } from './types';

const SOURCE_ID = 'computer-keyboard';

type InputListener = (event: InputEvent) => void;
type StateListener = (state: KeyboardInputState) => void;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName;
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || tagName === 'BUTTON';
}

export class ComputerKeyboardInputService {
  private inputListeners = new Set<InputListener>();

  private stateListeners = new Set<StateListener>();

  private mapping: KeyboardMapping = createDefaultKeyboardMapping();

  private inverseMapping = invertKeyboardMapping(this.mapping);

  private heldCodes = new Set<string>();

  private heldActionsByCode = new Map<string, KeyboardAction>();

  private heldNotesByCode = new Map<string, number>();

  private octaveShift = 0;

  private suspended = false;

  private initialized = false;

  init(): void {
    if (this.initialized) {
      return;
    }

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleWindowBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.initialized = true;
    this.emitState();
  }

  dispose(): void {
    if (!this.initialized) {
      return;
    }

    this.releaseAllHeldKeys();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleWindowBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.inputListeners.clear();
    this.stateListeners.clear();
    this.initialized = false;
  }

  subscribe(listener: InputListener): () => void {
    this.inputListeners.add(listener);
    return () => {
      this.inputListeners.delete(listener);
    };
  }

  subscribeState(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.getState());
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  getState(): KeyboardInputState {
    return {
      octaveShift: this.octaveShift,
      mapping: { ...this.mapping },
    };
  }

  getMapping(): KeyboardMapping {
    return { ...this.mapping };
  }

  setMapping(mapping: KeyboardMapping): void {
    this.mapping = { ...mapping };
    this.inverseMapping = invertKeyboardMapping(this.mapping);
    this.releaseAllHeldKeys();
    this.emitState();
  }

  setSuspended(suspended: boolean): void {
    if (this.suspended === suspended) {
      return;
    }

    this.suspended = suspended;
    if (suspended) {
      this.releaseAllHeldKeys();
    }
  }

  setOctaveShift(nextShift: number): void {
    const clamped = clampOctaveShift(nextShift);
    if (clamped === this.octaveShift) {
      return;
    }

    this.releaseAllHeldKeys();
    this.octaveShift = clamped;
    this.emitState();
  }

  private emitState(): void {
    const state = this.getState();
    this.stateListeners.forEach((listener) => listener(state));
  }

  private emitInput(event: Omit<InputEvent, 'source' | 'sourceId'>): void {
    const fullEvent: InputEvent = {
      ...event,
      source: 'computer-keyboard',
      sourceId: SOURCE_ID,
    };
    this.inputListeners.forEach((listener) => listener(fullEvent));
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (this.suspended) {
      return;
    }

    if (isEditableTarget(event.target)) {
      return;
    }

    const action = this.inverseMapping.get(event.code);
    if (!action) {
      return;
    }

    event.preventDefault();

    if (event.repeat || this.heldCodes.has(event.code)) {
      return;
    }

    this.heldCodes.add(event.code);
    this.heldActionsByCode.set(event.code, action);

    if (action === 'sustain') {
      this.emitInput({
        type: 'sustain',
        sustainValue: 127,
        timestamp: event.timeStamp,
      });
      return;
    }

    if (action === 'octave-down') {
      this.setOctaveShift(this.octaveShift - 1);
      return;
    }

    if (action === 'octave-up') {
      this.setOctaveShift(this.octaveShift + 1);
      return;
    }

    const note = keyboardActionToMidi(action as KeyboardNoteAction, this.octaveShift);
    if (note === null) {
      return;
    }

    // Shift = accent (forte), default = mezzo-forte with slight random human variation
    const baseVelocity = event.shiftKey ? 0.92 : 0.65;
    const velocity = Math.min(1, baseVelocity + (Math.random() - 0.5) * 0.10);
    this.heldNotesByCode.set(event.code, note);
    this.emitInput({
      type: 'noteon',
      note,
      velocity,
      timestamp: event.timeStamp,
    });
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    const action = this.heldActionsByCode.get(event.code);
    if (!action) {
      return;
    }

    if (!this.suspended) {
      event.preventDefault();
    }

    this.heldCodes.delete(event.code);
    this.heldActionsByCode.delete(event.code);

    if (action === 'sustain') {
      this.emitInput({
        type: 'sustain',
        sustainValue: 0,
        timestamp: event.timeStamp,
      });
      return;
    }

    if (action === 'octave-down' || action === 'octave-up') {
      return;
    }

    const note = this.heldNotesByCode.get(event.code);
    this.heldNotesByCode.delete(event.code);
    if (note === undefined) {
      return;
    }

    this.emitInput({
      type: 'noteoff',
      note,
      velocity: 0,
      timestamp: event.timeStamp,
    });
  };

  private handleWindowBlur = (): void => {
    this.releaseAllHeldKeys();
  };

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.releaseAllHeldKeys();
    }
  };

  private releaseAllHeldKeys(): void {
    if (this.heldActionsByCode.size === 0) {
      return;
    }

    const timestamp = performance.now();
    let sustainWasHeld = false;
    const notesToRelease: number[] = [];

    for (const [code, action] of this.heldActionsByCode.entries()) {
      if (action === 'sustain') {
        sustainWasHeld = true;
        continue;
      }
      if (action === 'octave-down' || action === 'octave-up') {
        continue;
      }
      const note = this.heldNotesByCode.get(code);
      if (note !== undefined) {
        notesToRelease.push(note);
      }
    }

    this.heldCodes.clear();
    this.heldActionsByCode.clear();
    this.heldNotesByCode.clear();

    for (const note of notesToRelease) {
      this.emitInput({
        type: 'noteoff',
        note,
        velocity: 0,
        timestamp,
      });
    }

    if (sustainWasHeld) {
      this.emitInput({
        type: 'sustain',
        sustainValue: 0,
        timestamp,
      });
    }
  }
}

export function isBindableCode(code: string): boolean {
  return isSupportedKeyboardCode(code);
}
