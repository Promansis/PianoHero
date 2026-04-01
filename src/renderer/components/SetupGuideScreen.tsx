interface SetupGuideScreenProps {
  reminderFrequency: string;
  handSize: 'small' | 'medium' | 'large';
  onReminderFrequencyChange: (value: string) => void;
  onHandSizeChange: (value: 'small' | 'medium' | 'large') => void;
  onStartPractice: () => void;
  onSkip: () => void;
}

const CHECKLIST = [
  {
    title: 'Seat Height',
    description: 'Adjust the bench until your forearms are close to parallel with the floor.',
  },
  {
    title: 'Distance From Keys',
    description: 'Sit close enough that your elbows rest slightly in front of your body.',
  },
  {
    title: 'Posture',
    description: 'Keep your back tall, shoulders relaxed, and both feet grounded.',
  },
  {
    title: 'Hand Shape',
    description: 'Let the fingers stay curved with level wrists and relaxed thumbs.',
  },
];

export function SetupGuideScreen({
  reminderFrequency,
  handSize,
  onReminderFrequencyChange,
  onHandSizeChange,
  onStartPractice,
  onSkip,
}: SetupGuideScreenProps) {
  return (
    <main className="app-shell setup-screen">
      <section className="panel setup-hero">
        <div>
          <p className="eyebrow">First Practice Setup</p>
          <h1>Prepare your body before the notes.</h1>
          <p className="song-title">
            This guide keeps the first session focused on posture, distance, and hand shape before you
            start drilling songs.
          </p>
        </div>
        <div className="setup-actions">
          <button className="secondary-button" onClick={onSkip}>
            Skip for now
          </button>
          <button className="primary-button" onClick={onStartPractice}>
            Start Practice
          </button>
        </div>
      </section>

      <section className="setup-grid">
        {CHECKLIST.map((item) => (
          <article className="panel setup-card" key={item.title}>
            <p className="eyebrow">Checklist</p>
            <h2>{item.title}</h2>
            <p className="panel-copy">{item.description}</p>
          </article>
        ))}
      </section>

      <section className="panel setup-footer">
        <label>
          <span>Posture Reminder Frequency</span>
          <select
            value={reminderFrequency}
            onChange={(event) => onReminderFrequencyChange(event.target.value)}
          >
            <option value="off">Off</option>
            <option value="10">Every 10 minutes</option>
            <option value="20">Every 20 minutes</option>
            <option value="30">Every 30 minutes</option>
          </select>
        </label>
        <label>
          <span>Hand Size</span>
          <select
            value={handSize}
            onChange={(event) => onHandSizeChange(event.target.value as 'small' | 'medium' | 'large')}
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </label>
        <p className="panel-copy">
          Reminders appear as light overlays during game and free-play sessions.
        </p>
      </section>
    </main>
  );
}
