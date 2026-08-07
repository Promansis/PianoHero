import type { InputEvent } from '../input/types';
import type { MidiInputDevice } from './types';

type MidiListener = (event: InputEvent) => void;
type DeviceListener = (devices: MidiInputDevice[]) => void;

function velocityFromMidi(value: number): number {
  return Math.max(0, Math.min(1, value / 127));
}

export class MidiInputService {
  private access: MIDIAccess | null = null;

  private devices: MidiInputDevice[] = [];

  private midiListeners = new Set<MidiListener>();

  private deviceListeners = new Set<DeviceListener>();

  private filterDeviceId: string | null = null;

  private heldNotesByDevice = new Map<string, {
    physical: Set<number>;
    active: Set<number>;
    sustain: boolean;
  }>();

  async init(): Promise<void> {
    if (!navigator.requestMIDIAccess) {
      throw new Error('Web MIDI API is not available in this environment.');
    }

    if (this.access) {
      this.access.removeEventListener('statechange', this.handleStateChange);
    }

    this.access = await navigator.requestMIDIAccess({ sysex: false });
    this.refreshDevices();
    this.bindInputs();
    this.access.addEventListener('statechange', this.handleStateChange);

    const devices = this.getDevices();
    this.deviceListeners.forEach((listener) => listener(devices));
  }

  getDevices(): MidiInputDevice[] {
    return [...this.devices];
  }

  setDeviceFilter(id: string | null): void {
    this.filterDeviceId = id || null;
  }

  subscribe(listener: MidiListener): () => void {
    this.midiListeners.add(listener);
    return () => {
      this.midiListeners.delete(listener);
    };
  }

  subscribeDevices(listener: DeviceListener): () => void {
    this.deviceListeners.add(listener);
    listener(this.getDevices());
    return () => {
      this.deviceListeners.delete(listener);
    };
  }

  dispose(): void {
    if (!this.access) {
      return;
    }

    this.access.removeEventListener('statechange', this.handleStateChange);
    for (const input of this.access.inputs.values()) {
      input.onmidimessage = null;
    }
    this.heldNotesByDevice.clear();
    this.midiListeners.clear();
    this.deviceListeners.clear();
    this.access = null;
  }

  private handleStateChange = (): void => {
    const connectedIds = new Set(this.access ? Array.from(this.access.inputs.keys()) : []);
    for (const [sourceId, notes] of this.heldNotesByDevice) {
      if (connectedIds.has(sourceId)) {
        continue;
      }
      if (notes.sustain) {
        this.emit({
          type: 'sustain',
          sustainValue: 0,
          timestamp: performance.now(),
          sourceId,
          source: 'midi',
        });
      }
      for (const note of notes.active) {
        this.emit({
          type: 'noteoff',
          note,
          velocity: 0,
          timestamp: performance.now(),
          sourceId,
          source: 'midi',
        });
      }
      this.heldNotesByDevice.delete(sourceId);
    }
    this.refreshDevices();
    this.bindInputs();
    const devices = this.getDevices();
    this.deviceListeners.forEach((listener) => listener(devices));
  };

  private refreshDevices(): void {
    if (!this.access) {
      this.devices = [];
      return;
    }

    this.devices = Array.from(this.access.inputs.values()).map((input) => ({
      id: input.id,
      name: input.name ?? 'Unknown MIDI Device',
      manufacturer: input.manufacturer ?? undefined,
    }));
  }

  private bindInputs(): void {
    if (!this.access) {
      return;
    }

    for (const input of this.access.inputs.values()) {
      input.onmidimessage = (event) => {
        if (this.filterDeviceId && input.id !== this.filterDeviceId) {
          return;
        }
        const message = this.normalizeMessage(input.id, event);
        if (!message) {
          return;
        }

        if (message.type === 'noteon' && typeof message.note === 'number') {
          const state = this.heldNotesByDevice.get(input.id) ?? {
            physical: new Set<number>(),
            active: new Set<number>(),
            sustain: false,
          };
          state.physical.add(message.note);
          state.active.add(message.note);
          this.heldNotesByDevice.set(input.id, state);
        } else if (message.type === 'noteoff' && typeof message.note === 'number') {
          const state = this.heldNotesByDevice.get(input.id);
          state?.physical.delete(message.note);
          if (state && !state.sustain) {
            state.active.delete(message.note);
          }
          if (state && state.active.size === 0) {
            this.heldNotesByDevice.delete(input.id);
          }
        } else if (message.type === 'sustain') {
          const state = this.heldNotesByDevice.get(input.id);
          if (state) {
            state.sustain = (message.sustainValue ?? 0) >= 64;
            if (!state.sustain) {
              for (const note of state.active) {
                if (!state.physical.has(note)) {
                  state.active.delete(note);
                }
              }
              if (state.active.size === 0) {
                this.heldNotesByDevice.delete(input.id);
              }
            }
          }
        }
        this.emit(message);
      };
    }
  }

  private emit(event: InputEvent): void {
    this.midiListeners.forEach((listener) => listener(event));
  }

  private normalizeMessage(sourceId: string, event: MIDIMessageEvent): InputEvent | null {
    if (!event.data) {
      return null;
    }

    const [status, data1 = 0, data2 = 0] = event.data;
    const command = status & 0xf0;
    const timestamp = event.timeStamp;

    if (command === 0x90) {
      if (data2 === 0) {
        return {
          type: 'noteoff',
          note: data1,
          velocity: 0,
          timestamp,
          sourceId,
          source: 'midi',
        };
      }

      return {
        type: 'noteon',
        note: data1,
        velocity: velocityFromMidi(data2),
        timestamp,
        sourceId,
        source: 'midi',
      };
    }

    if (command === 0x80) {
      return {
        type: 'noteoff',
        note: data1,
        velocity: velocityFromMidi(data2),
        timestamp,
        sourceId,
        source: 'midi',
      };
    }

    if (command === 0xb0 && data1 === 64) {
      return {
        type: 'sustain',
        sustainValue: data2,
        timestamp,
        sourceId,
        source: 'midi',
      };
    }

    if (command === 0xb0 && data1 === 1) {
      return {
        type: 'modulation',
        modulationValue: data2 / 127,
        timestamp,
        sourceId,
        source: 'midi',
      };
    }

    if (command === 0xe0) {
      const raw = ((data2 & 0x7f) << 7) | (data1 & 0x7f);
      return {
        type: 'pitchbend',
        pitchBendValue: (raw - 8192) / 8192,
        timestamp,
        sourceId,
        source: 'midi',
      };
    }

    if (command === 0xd0) {
      return {
        type: 'aftertouch',
        pressureValue: data1 / 127,
        timestamp,
        sourceId,
        source: 'midi',
      };
    }

    if (command === 0xa0) {
      return {
        type: 'aftertouch',
        note: data1,
        pressureValue: data2 / 127,
        timestamp,
        sourceId,
        source: 'midi',
      };
    }

    return null;
  }
}
