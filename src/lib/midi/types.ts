export interface MidiInputDevice {
  id: string;
  name: string;
  manufacturer?: string;
}

export interface MidiMessageEvent {
  type: 'noteon' | 'noteoff' | 'sustain';
  note?: number;
  velocity?: number;
  sustainValue?: number;
  timestamp: number;
  sourceId: string;
}
