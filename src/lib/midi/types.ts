import type { InputEvent } from '../input/types';

export interface MidiInputDevice {
  id: string;
  name: string;
  manufacturer?: string;
}

export type MidiMessageEvent = InputEvent;
