import { type RefObject, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { getInstrumentDefinition, INSTRUMENTS, isInstrumentSelectable } from '../../lib/audio/instrumentCatalog';
import { isRewardUnlocked, REWARD_CATALOG } from '../../lib/rewards/rewardCatalog';
import type { InstrumentSamplePackStatus } from '../../shared/ipc';

interface ImmersiveInstrumentControlProps {
  instrumentId: string;
  instrumentSamplePackStatuses?: Record<string, InstrumentSamplePackStatus>;
  popoutHost?: HTMLElement | null;
  popoutPlacement?: 'hud' | 'stage';
  outsideClickBoundaryRef?: RefObject<HTMLElement | null>;
  unlockedRewardIds?: Set<string>;
  onInstrumentChange: (instrumentId: string) => void;
}

export function ImmersiveInstrumentControl({
  instrumentId,
  instrumentSamplePackStatuses = {},
  popoutHost = null,
  popoutPlacement = 'hud',
  outsideClickBoundaryRef,
  unlockedRewardIds,
  onInstrumentChange,
}: ImmersiveInstrumentControlProps) {
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [openInfoInstrumentId, setOpenInfoInstrumentId] = useState<string | null>(null);
  const controlRef = useRef<HTMLDivElement | null>(null);
  const popoutRef = useRef<HTMLElement | null>(null);
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
      const popout = popoutRef.current;
      const boundary = outsideClickBoundaryRef?.current;
      const target = event.target as Node;
      if (
        !control ||
        control.contains(target) ||
        popout?.contains(target) ||
        boundary?.contains(target)
      ) {
        return;
      }
      setIsPinned(false);
      setIsHovered(false);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isPinned, outsideClickBoundaryRef]);

  const popout = (
    <section
      ref={popoutRef}
      className={`panel immersive-instrument-popout${popoutPlacement === 'stage' ? ' stage-popout' : ''}${isOpen ? ' open' : ''}`}
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
            <div
              key={instrument.id}
              className={`immersive-instrument-option${instrument.id === selectedInstrument.id ? ' active' : ''}${disabled ? ' disabled' : ''}`}
              title={status}
            >
              <button
                className="immersive-instrument-option-select"
                disabled={disabled}
                onClick={() => {
                  if (disabled || instrument.id === selectedInstrument.id) {
                    return;
                  }
                  onInstrumentChange(instrument.id);
                  setIsPinned(false);
                  setIsHovered(false);
                }}
                type="button"
              >
                {locked ? `Locked: ${instrument.label}` : instrument.label}
              </button>
              <span className="card-info-control">
                <span
                  className={`card-info-popover${openInfoInstrumentId === instrument.id ? ' open' : ''}`}
                  role="status"
                >
                  {status}
                </span>
                <button
                  className="card-info-button"
                  aria-label={`${instrument.label} info`}
                  aria-pressed={openInfoInstrumentId === instrument.id}
                  title={status}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenInfoInstrumentId((current) => (current === instrument.id ? null : instrument.id));
                  }}
                >
                  <Info size={13} strokeWidth={2.2} aria-hidden="true" />
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );

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

      {popoutHost ? createPortal(popout, popoutHost) : popout}
    </div>
  );
}
