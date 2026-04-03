interface SetupGuideScreenProps {
  reminderFrequency: string;
  handSize: 'small' | 'medium' | 'large';
  onReminderFrequencyChange: (value: string) => void;
  onHandSizeChange: (value: 'small' | 'medium' | 'large') => void;
  onOpenKeyboardSetup: () => void;
  onStartPractice: () => void;
  onSkip: () => void;
}

function SeatHeightDiagram() {
  return (
    <svg className="setup-diagram-svg" viewBox="0 0 140 90" aria-hidden="true">
      {/* Keyboard surface */}
      <rect x="72" y="38" width="58" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.45"/>
      <line x1="82" y1="38" x2="82" y2="48" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
      <line x1="92" y1="38" x2="92" y2="48" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
      <line x1="102" y1="38" x2="102" y2="48" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
      <line x1="112" y1="38" x2="112" y2="48" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
      {/* Bench */}
      <rect x="12" y="66" width="52" height="5" rx="2" fill="currentColor" opacity="0.25"/>
      {/* Body */}
      <rect x="30" y="38" width="11" height="28" rx="4" fill="currentColor" opacity="0.4"/>
      {/* Head */}
      <circle cx="35" cy="29" r="9" fill="currentColor" opacity="0.4"/>
      {/* Arm — horizontal, elbow at body side, hand at keyboard */}
      <line x1="30" y1="47" x2="72" y2="43" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" opacity="0.55"/>
      {/* Dashed guide line showing parallel height */}
      <line x1="12" y1="43" x2="130" y2="43" stroke="currentColor" strokeWidth="1" strokeDasharray="5 4" opacity="0.28"/>
      <text x="12" y="84" fontSize="9.5" fill="currentColor" opacity="0.5" fontFamily="sans-serif">forearms ≈ parallel to floor</text>
    </svg>
  );
}

function DistanceDiagram() {
  return (
    <svg className="setup-diagram-svg" viewBox="0 0 140 90" aria-hidden="true">
      {/* Keyboard (top edge) */}
      <rect x="38" y="10" width="80" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.45"/>
      <line x1="50" y1="10" x2="50" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
      <line x1="63" y1="10" x2="63" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
      <line x1="76" y1="10" x2="76" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
      <line x1="89" y1="10" x2="89" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
      <line x1="102" y1="10" x2="102" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
      {/* Torso (top-down oval) */}
      <ellipse cx="78" cy="66" rx="18" ry="14" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
      {/* Head */}
      <circle cx="78" cy="42" r="10" fill="currentColor" opacity="0.35"/>
      {/* Left arm angling forward to keyboard */}
      <line x1="62" y1="60" x2="44" y2="22" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.55"/>
      {/* Right arm */}
      <line x1="94" y1="60" x2="112" y2="22" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.55"/>
      {/* Elbow position dots */}
      <circle cx="53" cy="41" r="3.5" fill="currentColor" opacity="0.5"/>
      <circle cx="103" cy="41" r="3.5" fill="currentColor" opacity="0.5"/>
      <text x="20" y="86" fontSize="9.5" fill="currentColor" opacity="0.5" fontFamily="sans-serif">elbows slightly in front of torso</text>
    </svg>
  );
}

function PostureDiagram() {
  return (
    <svg className="setup-diagram-svg" viewBox="0 0 140 90" aria-hidden="true">
      {/* Spine — straight vertical line */}
      <line x1="70" y1="78" x2="70" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.35"/>
      {/* Head */}
      <circle cx="70" cy="15" r="10" fill="currentColor" opacity="0.4"/>
      {/* Shoulders — relaxed horizontal */}
      <line x1="44" y1="32" x2="96" y2="32" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" opacity="0.5"/>
      {/* Body */}
      <rect x="60" y="32" width="20" height="32" rx="6" fill="currentColor" opacity="0.35"/>
      {/* Feet on floor */}
      <rect x="55" y="75" width="12" height="5" rx="2" fill="currentColor" opacity="0.3"/>
      <rect x="73" y="75" width="12" height="5" rx="2" fill="currentColor" opacity="0.3"/>
      {/* Alignment arrow */}
      <path d="M90 14 L90 78" stroke="currentColor" strokeWidth="1" strokeDasharray="4 3" opacity="0.25"/>
      <text x="16" y="86" fontSize="9.5" fill="currentColor" opacity="0.5" fontFamily="sans-serif">tall back, shoulders relaxed</text>
    </svg>
  );
}

function HandShapeDiagram() {
  return (
    <svg className="setup-diagram-svg" viewBox="0 0 140 90" aria-hidden="true">
      {/* Piano keys (5 white keys) */}
      <rect x="18" y="52" width="18" height="32" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4"/>
      <rect x="38" y="52" width="18" height="32" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4"/>
      <rect x="58" y="52" width="18" height="32" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4"/>
      <rect x="78" y="52" width="18" height="32" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4"/>
      <rect x="98" y="52" width="18" height="32" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4"/>
      {/* Curved hand arch */}
      <path d="M22 52 Q68 12 116 52" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" opacity="0.55"/>
      {/* Finger tips — 5 dots on keys */}
      <circle cx="27" cy="52" r="4" fill="currentColor" opacity="0.5"/>
      <circle cx="47" cy="52" r="4" fill="currentColor" opacity="0.5"/>
      <circle cx="67" cy="52" r="4" fill="currentColor" opacity="0.5"/>
      <circle cx="87" cy="52" r="4" fill="currentColor" opacity="0.5"/>
      <circle cx="107" cy="52" r="4" fill="currentColor" opacity="0.5"/>
      <text x="20" y="87" fontSize="9.5" fill="currentColor" opacity="0.5" fontFamily="sans-serif">curved fingers, level wrists</text>
    </svg>
  );
}

const CHECKLIST = [
  {
    title: 'Seat Height',
    description: 'Adjust the bench until your forearms are close to parallel with the floor.',
    Diagram: SeatHeightDiagram,
  },
  {
    title: 'Distance From Keys',
    description: 'Sit close enough that your elbows rest slightly in front of your body.',
    Diagram: DistanceDiagram,
  },
  {
    title: 'Posture',
    description: 'Keep your back tall, shoulders relaxed, and both feet grounded.',
    Diagram: PostureDiagram,
  },
  {
    title: 'Hand Shape',
    description: 'Let the fingers stay curved with level wrists and relaxed thumbs.',
    Diagram: HandShapeDiagram,
  },
];

export function SetupGuideScreen({
  reminderFrequency,
  handSize,
  onReminderFrequencyChange,
  onHandSizeChange,
  onOpenKeyboardSetup,
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
          <button className="secondary-button" onClick={onOpenKeyboardSetup}>
            Keyboard Setup
          </button>
          <button className="primary-button" onClick={onStartPractice}>
            Start Practice
          </button>
        </div>
      </section>

      <section className="setup-grid">
        {CHECKLIST.map((item) => (
          <article className="panel setup-card" key={item.title}>
            <item.Diagram />
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
