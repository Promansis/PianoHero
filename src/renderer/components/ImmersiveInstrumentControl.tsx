import { useEffect, useRef, useState } from 'react';
import { getInstrumentDefinition, INSTRUMENTS, isInstrumentSelectable } from '../../lib/audio/instrumentCatalog';
import { isRewardUnlocked, REWARD_CATALOG } from '../../lib/rewards/rewardCatalog';
import type { InstrumentSamplePackStatus } from '../../shared/ipc';

interface ImmersiveInstrumentControlProps {
  instrumentId: string;
  instrumentSamplePackStatuses?: Record<string, InstrumentSamplePackStatus>;
  unlockedRewardIds?: Set<string>;
  onInstrumentChange: (instrumentId: string) => void;
}

export function ImmersiveInstrumentControl({
  instrumentId,
  instrumentSamplePackStatuses = {},
  unlockedRewardIds,
  onInstrumentChange,
}: ImmersiveInstrumentControlProps) {
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const controlRef = useRef<HTMLDivElement | null>(null);
  const selectedInstrument = getInstrumentDefinition(instrumentId);
  const isOpen = isPinned || isHovered;
  const installedPackInstrumentIds = Object.values(instrumentSamplePackStatuses)
    .filter((status) => status.isInstalled)
    .map((status) => status.instrumentId);

  useEffect(() => {
    if (!isPinned) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const control = controlRef.current;
      if (!control || control.contains(event.target as Node)) {
        return;
      }
      setIsPinned(false);
      setIsHovered(false);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isPinned]);

  return (
    <div
      className="immersive-control-wrap immersive-instrument-control"
      ref={controlRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        if (!isPinned) {
          setIsHovered(false);
        }
      }}
    >
      <button
        className="immersive-menu-btn immersive-instrument-toggle"
        aria-label="Show instrument controls"
        aria-expanded={isOpen}
        onClick={() => {
          if (isPinned) {
            setIsPinned(false);
            setIsHovered(false);
            return;
          }
          setIsPinned(true);
          setIsHovered(false);
        }}
        onFocus={() => setIsHovered(true)}
        onBlur={() => {
          if (!isPinned) {
            setIsHovered(false);
          }
        }}
      >
        {selectedInstrument.label}
      </button>

      <section
        className={`panel immersive-instrument-popout${isOpen ? ' open' : ''}`}
        aria-label="Instrument controls"
        aria-hidden={!isOpen}
        data-testid="immersive-instrument-popout"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          if (!isPinned) {
            setIsHovered(false);
          }
        }}
      >
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Instrument</p>
            <h2>Change the active sound</h2>
          </div>
          <p className="panel-copy">Switch instruments without leaving the session.</p>
        </div>
        <div className="immersive-instrument-grid">
          {INSTRUMENTS.map((instrument) => {
            const locked = instrument.requiredRewardId
              ? !isRewardUnlocked(instrument.requiredRewardId, unlockedRewardIds ?? new Set())
              : false;
            const reward = instrument.requiredRewardId
              ? REWARD_CATALOG.find((entry) => entry.id === instrument.requiredRewardId)
              : undefined;
            const packStatus = instrumentSamplePackStatuses[instrument.id];
            const unavailable = !isInstrumentSelectable(instrument.id, installedPackInstrumentIds);
            const disabled = locked || unavailable;
            const status = locked
              ? `Unlock ${reward?.displayName ?? 'this reward'} to use it.`
              : unavailable
                ? packStatus?.statusMessage ?? instrument.availabilityNote ?? 'This instrument is not available yet.'
                : instrument.description;

            return (
              <button
                key={instrument.id}
                className={`immersive-instrument-option${instrument.id === selectedInstrument.id ? ' active' : ''}`}
                disabled={disabled}
                onClick={() => {
                  if (disabled || instrument.id === selectedInstrument.id) {
                    return;
                  }
                  onInstrumentChange(instrument.id);
                  setIsPinned(false);
                  setIsHovered(false);
                }}
                title={status}
                type="button"
              >
                <span className="immersive-instrument-option-label">
                  {locked ? `Locked: ${instrument.label}` : instrument.label}
                </span>
                <span className="immersive-instrument-option-copy">{status}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
