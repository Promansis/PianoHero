import { useEffect, useMemo, useRef } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';

interface MainMenuScreenProps {
  onOpenLibrary: () => void;
  onOpenLearn: () => void;
  onOpenFreePlay: () => void;
  onOpenSoundboard: () => void;
  onOpenTheory: () => void;
  onOpenProgress: () => void;
  onOpenSettings: () => void;
  onOpenSetup: () => void;
}

type MenuStyle = CSSProperties & {
  '--card-color'?: string;
  '--entrance-delay'?: string;
  '--mouse-x'?: string;
  '--mouse-y'?: string;
};

interface MenuCard {
  icon: ReactNode;
  title: string;
  subtitle: string;
  accent: string;
  priority: 'primary' | 'secondary';
  onSelect: (props: MainMenuScreenProps) => void;
}

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="none" aria-hidden="true">
      <polygon points="5,3 19,12 5,21" fill="currentColor" />
    </svg>
  );
}

function IconLearn() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3L2 9l10 6 10-6-10-6z" />
      <path d="M12 15v7" />
      <path d="M7 11.8v4.2l5 2.5 5-2.5v-4.2" />
    </svg>
  );
}

function IconFreePlay() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="10" rx="2" />
      <line x1="6" y1="4" x2="6" y2="14" />
      <line x1="10" y1="4" x2="10" y2="14" />
      <line x1="14" y1="4" x2="14" y2="14" />
      <line x1="18" y1="4" x2="18" y2="14" />
      <rect x="4" y="4" width="4" height="6" rx="1" fill="currentColor" stroke="none" />
      <rect x="12" y="4" width="4" height="6" rx="1" fill="currentColor" stroke="none" />
      <path d="M8 18h8" strokeWidth="2.5" />
    </svg>
  );
}

function IconSoundboard() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

function IconTheory() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <line x1="3" y1="7" x2="21" y2="7" />
      <line x1="3" y1="11" x2="21" y2="11" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="3" y1="19" x2="21" y2="19" />
      <ellipse cx="9" cy="17" rx="2.5" ry="2" fill="currentColor" stroke="none" transform="rotate(-15 9 17)" />
      <line x1="11.3" y1="16.2" x2="11.3" y2="7" strokeWidth="1.8" />
      <ellipse cx="17" cy="14" rx="2.5" ry="2" fill="currentColor" stroke="none" transform="rotate(-15 17 14)" />
      <line x1="19.3" y1="13.2" x2="19.3" y2="4" strokeWidth="1.8" />
      <line x1="11.3" y1="7" x2="19.3" y2="4" strokeWidth="1.8" />
    </svg>
  );
}

function IconProgress() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="8" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="13" />
      <line x1="3" y1="20" x2="21" y2="20" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconSetup() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="6" width="20" height="13" rx="2" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
    </svg>
  );
}

const MENU_CARDS: MenuCard[] = [
  {
    icon: <IconPlay />,
    title: 'Play Songs',
    subtitle: 'Open the song library and start a scored run.',
    accent: 'var(--menu-neon-gold)',
    priority: 'primary',
    onSelect: (props) => props.onOpenLibrary(),
  },
  {
    icon: <IconLearn />,
    title: 'Guided Lessons',
    subtitle: 'Continue lessons with a cleaner practice flow.',
    accent: 'var(--menu-neon-violet)',
    priority: 'primary',
    onSelect: (props) => props.onOpenLearn(),
  },
  {
    icon: <IconFreePlay />,
    title: 'Free Play',
    subtitle: 'Jam, record ideas, and explore without scoring.',
    accent: 'var(--menu-neon-cyan)',
    priority: 'primary',
    onSelect: (props) => props.onOpenFreePlay(),
  },
  {
    icon: <IconSoundboard />,
    title: 'Soundboard',
    subtitle: 'Trigger quick hits and playful one-shots.',
    accent: 'var(--menu-neon-blue)',
    priority: 'primary',
    onSelect: (props) => props.onOpenSoundboard(),
  },
  {
    icon: <IconTheory />,
    title: 'Theory Trainer',
    subtitle: 'Train scales, intervals, and fast recall.',
    accent: 'var(--menu-neon-magenta)',
    priority: 'secondary',
    onSelect: (props) => props.onOpenTheory(),
  },
  {
    icon: <IconProgress />,
    title: 'Progress',
    subtitle: 'Review streaks, goals, and accuracy trends.',
    accent: 'var(--menu-neon-teal)',
    priority: 'secondary',
    onSelect: (props) => props.onOpenProgress(),
  },
  {
    icon: <IconSettings />,
    title: 'Settings',
    subtitle: 'Tune audio, visuals, input, and accessibility.',
    accent: 'var(--menu-neon-coral)',
    priority: 'secondary',
    onSelect: (props) => props.onOpenSettings(),
  },
  {
    icon: <IconSetup />,
    title: 'Keyboard Setup',
    subtitle: 'Map keys, devices, and onboarding basics.',
    accent: 'var(--menu-neon-indigo)',
    priority: 'secondary',
    onSelect: (props) => props.onOpenSetup(),
  },
];

const STATUS_ITEMS = [
  ['Stage', 'Ready'],
  ['Main Routes', String(MENU_CARDS.filter((card) => card.priority === 'primary').length)],
  ['Support Tools', String(MENU_CARDS.filter((card) => card.priority === 'secondary').length)],
] as const;

const PRIMARY_CARD_ENTRANCE_START_MS = 220;
const PRIMARY_CARD_ENTRANCE_STEP_MS = 70;
const SECONDARY_SHELL_ENTRANCE_DELAY_MS = 450;
const SECONDARY_CARD_ENTRANCE_START_MS = 500;
const SECONDARY_CARD_ENTRANCE_STEP_MS = 60;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function shouldReduceMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

function isCompactViewport(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(max-width: 780px)').matches
    : false;
}

function requestFrame(callback: FrameRequestCallback): number {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    return window.requestAnimationFrame(callback);
  }

  callback(0);
  return -1;
}

function cancelFrame(frameId: number | null): void {
  if (frameId === null || frameId < 0) {
    return;
  }

  if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
    window.cancelAnimationFrame(frameId);
  }
}

function getCardDelay(priority: MenuCard['priority'], index: number): string {
  const start = priority === 'primary' ? PRIMARY_CARD_ENTRANCE_START_MS : SECONDARY_CARD_ENTRANCE_START_MS;
  const step = priority === 'primary' ? PRIMARY_CARD_ENTRANCE_STEP_MS : SECONDARY_CARD_ENTRANCE_STEP_MS;

  return `${start + index * step}ms`;
}

export function MainMenuScreen(props: MainMenuScreenProps) {
  const mainRef = useRef<HTMLElement | null>(null);
  const screenFrameRef = useRef<number | null>(null);
  const screenPointerRef = useRef({ x: 0, y: 0 });
  const cardFrameRef = useRef<number | null>(null);
  const pendingCardTiltRef = useRef<{
    element: HTMLButtonElement;
    shineX: number;
    shineY: number;
    tiltX: number;
    tiltY: number;
  } | null>(null);

  const primaryCards = useMemo(() => MENU_CARDS.filter((card) => card.priority === 'primary'), []);
  const secondaryCards = useMemo(() => MENU_CARDS.filter((card) => card.priority === 'secondary'), []);

  useEffect(() => {
    return () => {
      cancelFrame(screenFrameRef.current);
      cancelFrame(cardFrameRef.current);
    };
  }, []);

  const handleScreenPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (shouldReduceMotion()) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    screenPointerRef.current = {
      x: clamp((event.clientX - rect.left) / rect.width - 0.5, -0.5, 0.5),
      y: clamp((event.clientY - rect.top) / rect.height - 0.5, -0.5, 0.5),
    };

    if (screenFrameRef.current !== null) {
      return;
    }

    screenFrameRef.current = requestFrame(() => {
      screenFrameRef.current = null;
      const node = mainRef.current;
      if (!node) {
        return;
      }

      node.style.setProperty('--mouse-x', screenPointerRef.current.x.toFixed(3));
      node.style.setProperty('--mouse-y', screenPointerRef.current.y.toFixed(3));
    });
  };

  const handleScreenPointerLeave = () => {
    cancelFrame(screenFrameRef.current);
    screenFrameRef.current = null;
    mainRef.current?.style.setProperty('--mouse-x', '0');
    mainRef.current?.style.setProperty('--mouse-y', '0');
  };

  const handleCardPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (shouldReduceMotion() || isCompactViewport()) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);

    pendingCardTiltRef.current = {
      element: event.currentTarget,
      shineX: x * 100,
      shineY: y * 100,
      tiltX: (0.5 - y) * 8,
      tiltY: (x - 0.5) * -10,
    };

    if (cardFrameRef.current !== null) {
      return;
    }

    cardFrameRef.current = requestFrame(() => {
      cardFrameRef.current = null;
      const nextTilt = pendingCardTiltRef.current;
      if (!nextTilt) {
        return;
      }

      nextTilt.element.style.setProperty('--tilt-x', nextTilt.tiltX.toFixed(3));
      nextTilt.element.style.setProperty('--tilt-y', nextTilt.tiltY.toFixed(3));
      nextTilt.element.style.setProperty('--shine-x', `${nextTilt.shineX.toFixed(2)}%`);
      nextTilt.element.style.setProperty('--shine-y', `${nextTilt.shineY.toFixed(2)}%`);
    });
  };

  const handleCardPointerLeave = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (pendingCardTiltRef.current?.element === event.currentTarget) {
      pendingCardTiltRef.current = null;
    }

    event.currentTarget.style.setProperty('--tilt-x', '0');
    event.currentTarget.style.setProperty('--tilt-y', '0');
    event.currentTarget.style.setProperty('--shine-x', '50%');
    event.currentTarget.style.setProperty('--shine-y', '18%');
  };

  const renderMenuCard = (card: MenuCard, index: number) => {
    const tooltipId = `main-menu-${card.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-hint`;

    return (
      <button
        key={card.title}
        aria-describedby={tooltipId}
        aria-label={card.title}
        className={`menu-card menu-card-${card.priority}`}
        onClick={() => card.onSelect(props)}
        onPointerLeave={handleCardPointerLeave}
        onPointerMove={handleCardPointerMove}
        style={
          {
            '--card-color': card.accent,
            '--entrance-delay': getCardDelay(card.priority, index),
          } as MenuStyle
        }
        type="button"
      >
        <span className="menu-card-glow" aria-hidden="true" />
        <span className="menu-card-sheen" aria-hidden="true" />
        <span className="menu-card-icon" aria-hidden="true">
          {card.icon}
        </span>
        <span className="menu-card-copy">
          <span className="menu-card-title">{card.title}</span>
        </span>
        <span className="menu-card-popover" id={tooltipId} role="tooltip">
          {card.subtitle}
        </span>
        <span className="menu-card-action" aria-hidden="true">
          Open
        </span>
      </button>
    );
  };

  return (
    <main
      className="app-shell main-menu-screen"
      onPointerLeave={handleScreenPointerLeave}
      onPointerMove={handleScreenPointerMove}
      ref={mainRef}
      style={{ '--mouse-x': '0', '--mouse-y': '0' } as MenuStyle}
    >
      <div className="main-menu-backdrop" aria-hidden="true">
        <span className="main-menu-light main-menu-light-a" />
        <span className="main-menu-light main-menu-light-b" />
        <span className="main-menu-facet main-menu-facet-a" />
        <span className="main-menu-facet main-menu-facet-b" />
        <span className="main-menu-score-lines" />
      </div>

      <section className="main-menu-hero">
        <div className="main-menu-hero-copy entrance-animate" style={{ '--entrance-delay': '0ms' } as MenuStyle}>
          <h1>Piano Hero</h1>
        </div>
        <div className="main-menu-hero-status" aria-hidden="true">
          <span className="main-menu-status-kicker">Neon Deck</span>
          {STATUS_ITEMS.map(([label, value], index) => (
            <span className="main-menu-status-row" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <span className="main-menu-status-meter">
                <i style={{ '--entrance-delay': `${index * 90}ms` } as MenuStyle} />
                <i style={{ '--entrance-delay': `${index * 90 + 80}ms` } as MenuStyle} />
                <i style={{ '--entrance-delay': `${index * 90 + 160}ms` } as MenuStyle} />
              </span>
            </span>
          ))}
        </div>
      </section>

      <section aria-label="Primary destinations" className="main-menu-grid">
        {primaryCards.map((card, index) => renderMenuCard(card, index))}
      </section>

      <section
        className="main-menu-secondary-shell entrance-animate"
        style={{ '--entrance-delay': `${SECONDARY_SHELL_ENTRANCE_DELAY_MS}ms` } as MenuStyle}
      >
        <div className="main-menu-secondary-heading">
          <h2>Training and Setup</h2>
        </div>
        <section aria-label="More destinations" className="main-menu-secondary-grid">
          {secondaryCards.map((card, index) => renderMenuCard(card, index))}
        </section>
      </section>
    </main>
  );
}
