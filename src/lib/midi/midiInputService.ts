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

  async init(): Promise<void> {
    if (!navigator.requestMIDIAccess) {
      throw new Error('Web MIDI API is not available in this environment.');
    }

    this.access = await navigator.requestMIDIAccess();
    this.refreshDevices();
    this.bindInputs();
    this.access.addEventListener('statechange', this.handleStateChange);
  }

  getDevices(): MidiInputDevice[] {
    return [...this.devices];
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
    this.midiListeners.clear();
    this.deviceListeners.clear();
    this.access = null;
  }

  private handleStateChange = (): void => {
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
        const message = this.normalizeMessage(input.id, event);
        if (!message) {
          return;
        }

        this.midiListeners.forEach((listener) => listener(message));
      };
    }
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

    return null;
  }
}
