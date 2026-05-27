export interface HeldNoteChange {
  activeNotes: number[];
  shouldStartAudio: boolean;
  shouldStopAudio: boolean;
}

export class HeldNoteTracker {
  private readonly heldByNote = new Map<number, Set<string>>();

  press(note: number, sourceId: string): HeldNoteChange {
    const sources = this.heldByNote.get(note) ?? new Set<string>();
    const wasHeld = sources.size > 0;
    sources.add(sourceId);
    this.heldByNote.set(note, sources);

    return {
      activeNotes: this.getActiveNotes(),
      shouldStartAudio: !wasHeld,
      shouldStopAudio: false,
    };
  }

  release(note: number, sourceId: string): HeldNoteChange {
    const sources = this.heldByNote.get(note);
    if (!sources) {
      return {
        activeNotes: this.getActiveNotes(),
        shouldStartAudio: false,
        shouldStopAudio: false,
      };
    }

    sources.delete(sourceId);
    const shouldStopAudio = sources.size === 0;
    if (shouldStopAudio) {
      this.heldByNote.delete(note);
    }

    return {
      activeNotes: this.getActiveNotes(),
      shouldStartAudio: false,
      shouldStopAudio,
    };
  }

  clear(): number[] {
    const activeNotes = this.getActiveNotes();
    this.heldByNote.clear();
    return activeNotes;
  }

  getActiveNotes(): number[] {
    return [...this.heldByNote.keys()].sort((left, right) => left - right);
  }
}
