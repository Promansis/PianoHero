import type { CSSProperties, ReactNode } from 'react';

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

const MENU_CARDS: Array<{
  icon: ReactNode;
  title: string;
  subtitle: string;
  accent: string;
  onSelect: (props: MainMenuScreenProps) => void;
}> = [
  {
    icon: <IconPlay />,
    title: 'Play',
    subtitle: 'Open the song library and jump into scored sessions.',
    accent: 'var(--color-accent)',
    onSelect: (props) => props.onOpenLibrary(),
  },
  {
    icon: <IconLearn />,
    title: 'Learn',
    subtitle: 'Follow the structured curriculum from first notes to advanced drills.',
    accent: 'var(--color-accent-secondary)',
    onSelect: (props) => props.onOpenLearn(),
  },
  {
    icon: <IconFreePlay />,
    title: 'Free Play',
    subtitle: 'Practice without scoring, record ideas, and load backing tracks.',
    accent: 'var(--color-good)',
    onSelect: (props) => props.onOpenFreePlay(),
  },
  {
    icon: <IconSoundboard />,
    title: 'Soundboard',
    subtitle: 'Trigger kid-friendly one-shots with big buttons and number keys.',
    accent: 'var(--color-ok)',
    onSelect: (props) => props.onOpenSoundboard(),
  },
  {
    icon: <IconTheory />,
    title: 'Theory',
    subtitle: 'Sharpen scales, intervals, and quiz speed between songs.',
    accent: 'var(--color-perfect)',
    onSelect: (props) => props.onOpenTheory(),
  },
  {
    icon: <IconProgress />,
    title: 'Progress',
    subtitle: 'Review streaks, charts, goals, and accuracy trends.',
    accent: 'var(--color-ok)',
    onSelect: (props) => props.onOpenProgress(),
  },
  {
    icon: <IconSettings />,
    title: 'Settings',
    subtitle: 'Tune audio, visuals, input defaults, and accessibility.',
    accent: 'var(--color-miss)',
    onSelect: (props) => props.onOpenSettings(),
  },
  {
    icon: <IconSetup />,
    title: 'Setup',
    subtitle: 'Configure keyboard controls, onboarding, and device basics.',
    accent: 'var(--color-accent)',
    onSelect: (props) => props.onOpenSetup(),
  },
];

export function MainMenuScreen(props: MainMenuScreenProps) {
  return (
    <main className="app-shell main-menu-screen">
      <section className="main-menu-hero">
        <p className="eyebrow">Arcade Practice</p>
        <h1>Piano Hero</h1>
        <p className="song-title">
          Pick a mode, chase cleaner runs, and keep your practice feeling like a game instead of a settings-heavy app.
        </p>
      </section>

      <section className="main-menu-grid">
        {MENU_CARDS.map((card, index) => (
          <button
            key={card.title}
            className="menu-card"
            style={
              {
                '--card-color': card.accent,
                '--card-delay': `${index * 70}ms`,
              } as CSSProperties
            }
            onClick={() => card.onSelect(props)}
          >
            <span className="menu-card-icon" aria-hidden="true">
              {card.icon}
            </span>
            <span className="menu-card-title">{card.title}</span>
            <span className="menu-card-subtitle">{card.subtitle}</span>
          </button>
        ))}
      </section>
    </main>
  );
}
