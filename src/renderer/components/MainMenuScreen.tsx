import type { CSSProperties } from 'react';

interface MainMenuScreenProps {
  onOpenLibrary: () => void;
  onOpenLearn: () => void;
  onOpenFreePlay: () => void;
  onOpenTheory: () => void;
  onOpenProgress: () => void;
  onOpenSettings: () => void;
  onOpenSetup: () => void;
}

const MENU_CARDS: Array<{
  icon: string;
  title: string;
  subtitle: string;
  accent: string;
  onSelect: (props: MainMenuScreenProps) => void;
}> = [
  {
    icon: '▶',
    title: 'Play',
    subtitle: 'Open the song library and jump into scored sessions.',
    accent: 'var(--color-accent)',
    onSelect: (props) => props.onOpenLibrary(),
  },
  {
    icon: '\u266a',
    title: 'Learn',
    subtitle: 'Follow the structured curriculum from first notes to advanced drills.',
    accent: 'var(--color-accent-secondary)',
    onSelect: (props) => props.onOpenLearn(),
  },
  {
    icon: '\u266c',
    title: 'Free Play',
    subtitle: 'Practice without scoring, record ideas, and load backing tracks.',
    accent: 'var(--color-good)',
    onSelect: (props) => props.onOpenFreePlay(),
  },
  {
    icon: '\u266b',
    title: 'Theory',
    subtitle: 'Sharpen scales, intervals, and quiz speed between songs.',
    accent: 'var(--color-perfect)',
    onSelect: (props) => props.onOpenTheory(),
  },
  {
    icon: '★',
    title: 'Progress',
    subtitle: 'Review streaks, charts, goals, and accuracy trends.',
    accent: 'var(--color-ok)',
    onSelect: (props) => props.onOpenProgress(),
  },
  {
    icon: '⚙',
    title: 'Settings',
    subtitle: 'Tune audio, visuals, input defaults, and accessibility.',
    accent: 'var(--color-miss)',
    onSelect: (props) => props.onOpenSettings(),
  },
  {
    icon: '⌨',
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
