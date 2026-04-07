import type { DiagramSpec, DrillSpec, Lesson, LessonStep, LearningTier } from './types';

function tip(title: string, body: string, diagram?: DiagramSpec): LessonStep {
  return { kind: 'tip', title, body, diagram };
}

function keyboardTip(title: string, body: string, midiNotes: number[], labels?: Record<number, string>): LessonStep {
  return tip(title, body, { kind: 'keyboard-highlight', midiNotes, labels });
}

function fingerTip(title: string, body: string, hand: 'left' | 'right'): LessonStep {
  return tip(title, body, { kind: 'finger-numbers', hand });
}

function setupTip(
  title: string,
  body: string,
  variant: 'seat-height' | 'distance' | 'posture' | 'hand-shape',
): LessonStep {
  return tip(title, body, { kind: 'setup-diagram', variant });
}

function drill(title: string, body: string, drillSpec: DrillSpec): LessonStep {
  return {
    kind: 'drill',
    title,
    body,
    drill: drillSpec,
    passAccuracy: 70,
  };
}

function scale(title: string, body: string, root: number, scaleName: string): LessonStep {
  return {
    kind: 'scale',
    title,
    body,
    root,
    scaleName,
    passAccuracy: 70,
  };
}

function interval(title: string, body: string, difficulty: 'easy' | 'medium' | 'hard'): LessonStep {
  return {
    kind: 'interval',
    title,
    body,
    difficulty,
    passAccuracy: 70,
  };
}

function quiz(title: string, body: string, quizType: 'chord' | 'scale' | 'interval' | 'mixed'): LessonStep {
  return {
    kind: 'quiz',
    title,
    body,
    quizType,
    passAccuracy: 70,
  };
}

function lesson(
  tier: LearningTier['id'],
  order: number,
  slug: string,
  title: string,
  summary: string,
  estMinutes: number,
  steps: LessonStep[],
): Lesson {
  return {
    id: `${tier}-${String(order).padStart(2, '0')}-${slug}`,
    tier,
    order,
    title,
    summary,
    estMinutes,
    steps,
  };
}

function stubLesson(
  tier: LearningTier['id'],
  order: number,
  slug: string,
  title: string,
  summary: string,
): Lesson {
  return {
    id: `${tier}-${String(order).padStart(2, '0')}-${slug}`,
    tier,
    order,
    title,
    summary,
    estMinutes: 5,
    steps: [],
    isStub: true,
  };
}

export const CURRICULUM: LearningTier[] = [
  {
    id: 'novice',
    order: 1,
    title: 'Novice',
    summary: 'No experience required. Learn the keyboard map, hand shape, and first steady notes.',
    lessons: [
      lesson(
        'novice',
        1,
        'keyboard-map',
        'Find Your Landmarks',
        'Recognize black-key groups, octaves, and middle C before you play.',
        8,
        [
          keyboardTip(
            'Two black keys, then three',
            'The keyboard repeats in a visible pattern. Find a group of two black keys, then a group of three. That pattern tells you where every white key lives.',
            [1, 3, 6, 8, 10],
          ),
          keyboardTip(
            'Middle C is your home base',
            'Find the white key just to the left of a two-black-key group. That is C. The C closest to the center of the keyboard is middle C.',
            [60],
            { 60: 'Middle C' },
          ),
          drill(
            'Tap middle C in steady quarter notes',
            'Play a single note four times with even timing. This is your first coordination drill.',
            {
              kind: 'single-note-rhythm',
              bpm: 72,
              midi: 60,
              hand: 'right',
              patternBeats: [1, 1, 1, 1],
              repetitions: 2,
            },
          ),
        ],
      ),
      lesson(
        'novice',
        2,
        'finger-numbers',
        'Meet Fingers 1 to 5',
        'Attach a number to each finger so later drills make sense immediately.',
        8,
        [
          fingerTip(
            'Right hand numbers',
            'Thumb is 1, index is 2, middle is 3, ring is 4, and pinky is 5. Say the numbers out loud once while you look at your hand.',
            'right',
          ),
          fingerTip(
            'Left hand numbers',
            'The numbers stay the same on the left hand: thumb is still 1 and pinky is still 5.',
            'left',
          ),
          keyboardTip(
            'C position uses five neighboring white keys',
            'Place right-hand fingers 1 to 5 on C, D, E, F, and G. Keep one finger resting over each key.',
            [60, 62, 64, 65, 67],
            { 60: '1', 62: '2', 64: '3', 65: '4', 67: '5' },
          ),
          drill(
            'Right-hand five-finger walk',
            'Play up and back down once without lifting the hand out of position.',
            {
              kind: 'five-finger-pattern',
              bpm: 76,
              startMidi: 60,
              handMode: 'right',
              direction: 'up-down',
              repetitions: 1,
            },
          ),
        ],
      ),
      lesson(
        'novice',
        3,
        'posture-and-shape',
        'Set Up Your Body',
        'Use a relaxed seat, tall posture, and curved fingers before you chase notes.',
        7,
        [
          setupTip(
            'Sit at the right height',
            'Adjust the bench until your forearms are close to parallel with the floor. If the shoulders lift to reach the keys, the bench is too low.',
            'seat-height',
          ),
          setupTip(
            'Stay tall and relaxed',
            'Sit toward the front half of the bench, keep both feet grounded, and let the shoulders stay loose.',
            'posture',
          ),
          setupTip(
            'Use a rounded hand shape',
            'Let the fingers stay curved and the knuckles feel lightly lifted. Avoid collapsing the fingertips.',
            'hand-shape',
          ),
          drill(
            'Single-note pulse with a relaxed wrist',
            'Repeat one note slowly and keep the hand quiet between each tap.',
            {
              kind: 'single-note-rhythm',
              bpm: 68,
              midi: 64,
              hand: 'right',
              patternBeats: [1, 1, 2, 1, 1, 2],
            },
          ),
        ],
      ),
      lesson(
        'novice',
        4,
        'first-c-pattern',
        'First C-Major Pattern',
        'Turn your C position into a simple playable pattern with both hands.',
        10,
        [
          keyboardTip(
            'Both hands can mirror a five-finger shape',
            'Left hand starts on C below middle C. Right hand starts on middle C. Each hand uses five neighboring white keys.',
            [48, 50, 52, 53, 55, 60, 62, 64, 65, 67],
          ),
          drill(
            'Right hand up and down',
            'Stay even. One finger, one key.',
            {
              kind: 'five-finger-pattern',
              bpm: 80,
              startMidi: 60,
              handMode: 'right',
              direction: 'up-down',
              repetitions: 2,
            },
          ),
          drill(
            'Left hand up and down',
            'Mirror the same shape with the left hand.',
            {
              kind: 'five-finger-pattern',
              bpm: 80,
              startMidi: 48,
              handMode: 'left',
              direction: 'up-down',
              repetitions: 2,
            },
          ),
          drill(
            'Both hands together in parallel',
            'Keep the fingertips close to the keys and move both hands at the same time.',
            {
              kind: 'five-finger-pattern',
              bpm: 72,
              startMidi: 60,
              handMode: 'parallel',
              direction: 'up-down',
              repetitions: 1,
            },
          ),
        ],
      ),
      stubLesson('novice', 5, 'rhythm-values', 'Reading Note Values', 'Quarter, half, and whole-note timing coming soon.'),
      stubLesson('novice', 6, 'first-song', 'First Song Builder', 'A guided beginner melody lesson is coming soon.'),
    ],
  },
  {
    id: 'beginner',
    order: 2,
    title: 'Beginner',
    summary: 'Build finger independence, start scales, and play your first melodic phrases.',
    lessons: [
      lesson(
        'beginner',
        1,
        'finger-independence',
        'Make All Five Fingers Work',
        'Strengthen each finger with simple patterns before crossing the thumb.',
        10,
        [
          drill(
            'Right-hand five-finger repetitions',
            'Repeat the pattern twice and listen for an even pulse.',
            {
              kind: 'five-finger-pattern',
              bpm: 88,
              startMidi: 60,
              handMode: 'right',
              direction: 'up-down',
              repetitions: 2,
            },
          ),
          drill(
            'Left-hand five-finger repetitions',
            'Keep the left wrist level and avoid twisting toward the thumb.',
            {
              kind: 'five-finger-pattern',
              bpm: 88,
              startMidi: 48,
              handMode: 'left',
              direction: 'up-down',
              repetitions: 2,
            },
          ),
          drill(
            'Parallel hand independence',
            'Let both hands move together while each finger keeps its own lane.',
            {
              kind: 'motion-pattern',
              bpm: 76,
              startMidi: 60,
              intervals: [0, 2, 4, 5, 7, 5, 4, 2, 0],
              handMode: 'parallel',
              repetitions: 1,
            },
          ),
        ],
      ),
      lesson(
        'beginner',
        2,
        'c-major-scale',
        'First One-Octave Scale',
        'Learn the C-major scale slowly in each hand.',
        12,
        [
          tip(
            'No black keys in C major',
            'C major uses only white keys. That lets you focus on movement and fingering without accidentals.',
          ),
          scale(
            'C major, right hand',
            'Run one octave of C major and aim for an even tone.',
            0,
            'Major',
          ),
          scale(
            'C major, left hand',
            'Repeat the same scale with the left hand.',
            0,
            'Major',
          ),
        ],
      ),
      lesson(
        'beginner',
        3,
        'simple-intervals',
        'Hear Steps and Skips',
        'Start naming simple intervals by sound before you play larger jumps.',
        8,
        [
          tip(
            'A 2nd is a step, a 3rd is a skip',
            'Small intervals show up constantly in melodies. Recognizing them early makes reading and ear training easier.',
          ),
          interval(
            'Easy interval trainer',
            'Complete one easy interval session and aim to identify the sound before clicking.',
            'easy',
          ),
        ],
      ),
      lesson(
        'beginner',
        4,
        'first-melody',
        'Play a Familiar Phrase',
        'Use a simple melody drill to connect rhythm, fingering, and listening.',
        9,
        [
          drill(
            'Ode to Joy fragment',
            'Play the phrase slowly with your right hand. Let repeated notes feel identical.',
            {
              kind: 'melody',
              bpm: 74,
              notes: [
                { midi: 64, beats: 1, hand: 'right' },
                { midi: 64, beats: 1, hand: 'right' },
                { midi: 65, beats: 1, hand: 'right' },
                { midi: 67, beats: 1, hand: 'right' },
                { midi: 67, beats: 1, hand: 'right' },
                { midi: 65, beats: 1, hand: 'right' },
                { midi: 64, beats: 1, hand: 'right' },
                { midi: 62, beats: 1, hand: 'right' },
                { midi: 60, beats: 1, hand: 'right' },
                { midi: 60, beats: 1, hand: 'right' },
                { midi: 62, beats: 1, hand: 'right' },
                { midi: 64, beats: 1, hand: 'right' },
                { midi: 64, beats: 1.5, hand: 'right' },
                { midi: 62, beats: 0.5, hand: 'right' },
                { midi: 62, beats: 2, hand: 'right' },
              ],
            },
          ),
        ],
      ),
      stubLesson('beginner', 5, 'note-values', 'Quarter, Half, Whole Notes', 'A rhythm-reading unit is coming soon.'),
      stubLesson('beginner', 6, 'metronome-basics', 'Play With the Click', 'A slow-metronome coordination lesson is coming soon.'),
    ],
  },
  {
    id: 'intermediate',
    order: 3,
    title: 'Intermediate',
    summary: 'Add thumb crossing, more key signatures, harmony basics, and two-hand control.',
    lessons: [
      lesson(
        'intermediate',
        1,
        'major-key-expansion',
        'Expand Beyond C Major',
        'Add common major scales so the keyboard stops feeling key-specific.',
        12,
        [
          scale('G major scale', 'One sharp. Listen for F-sharp and keep the hand relaxed through the thumb crossing.', 7, 'Major'),
          scale('F major scale', 'One flat. Notice B-flat and keep the thumb quiet.', 5, 'Major'),
          scale('D major scale', 'Two sharps. Stay precise on F-sharp and C-sharp.', 2, 'Major'),
        ],
      ),
      lesson(
        'intermediate',
        2,
        'thumb-crossing',
        'Smooth Thumb Crossing',
        'Practice moving the thumb under without twisting the wrist.',
        10,
        [
          tip(
            'The thumb crosses under, the hand does not jump',
            'Think of the hand gliding sideways while the thumb sneaks to the next key. Keep the wrist supple.',
          ),
          drill(
            'Crossing pattern in C',
            'This pattern imitates the center of a scale where the thumb needs to move cleanly.',
            {
              kind: 'melody',
              bpm: 82,
              notes: [
                { midi: 60, beats: 1, hand: 'right' },
                { midi: 62, beats: 1, hand: 'right' },
                { midi: 64, beats: 1, hand: 'right' },
                { midi: 65, beats: 1, hand: 'right' },
                { midi: 67, beats: 1, hand: 'right' },
                { midi: 69, beats: 1, hand: 'right' },
                { midi: 67, beats: 1, hand: 'right' },
                { midi: 65, beats: 1, hand: 'right' },
                { midi: 64, beats: 1, hand: 'right' },
                { midi: 62, beats: 1, hand: 'right' },
                { midi: 60, beats: 1, hand: 'right' },
              ],
            },
          ),
          scale('Confirm the motion in G major', 'Use the scale screen to run the full pattern after the shorter drill.', 7, 'Major'),
        ],
      ),
      lesson(
        'intermediate',
        3,
        'triads-and-inversions',
        'Build Triads and Inversions',
        'Start hearing harmony as stacked 3rds instead of isolated notes.',
        10,
        [
          tip(
            'Triads come from 1, 3, and 5',
            'A root-position triad stacks the first, third, and fifth notes of a scale. Inversions reorder those same notes.',
          ),
          quiz(
            'Chord identification checkpoint',
            'Complete one chord-focused quiz session to reinforce the sound and label of common triads.',
            'chord',
          ),
        ],
      ),
      lesson(
        'intermediate',
        4,
        'two-hand-coordination',
        'Coordinate Both Hands',
        'Move both hands together in parallel and contrary motion.',
        11,
        [
          drill(
            'Parallel motion drill',
            'Let both hands rise and fall together.',
            {
              kind: 'motion-pattern',
              bpm: 78,
              startMidi: 60,
              intervals: [0, 2, 4, 5, 7, 5, 4, 2, 0],
              handMode: 'parallel',
            },
          ),
          drill(
            'Contrary motion drill',
            'Hands move away from each other, then return.',
            {
              kind: 'motion-pattern',
              bpm: 70,
              startMidi: 60,
              intervals: [0, 2, 4, 5, 7, 5, 4, 2, 0],
              handMode: 'contrary',
            },
          ),
          interval(
            'Medium interval trainer',
            'Finish with a medium interval session to keep the ear working alongside the hands.',
            'medium',
          ),
        ],
      ),
      stubLesson('intermediate', 5, 'dotted-rhythms', 'Dotted Rhythms', 'A dotted-rhythm lesson is coming soon.'),
      stubLesson('intermediate', 6, 'more-inversions', 'Broken Chords in Motion', 'A broken-chord practice lesson is coming soon.'),
    ],
  },
  {
    id: 'advanced',
    order: 4,
    title: 'Advanced',
    summary: 'Work through minor systems, arpeggios, seventh chords, and quicker coordination.',
    lessons: [
      lesson(
        'advanced',
        1,
        'minor-scale-systems',
        'Compare Minor Scale Systems',
        'Natural, harmonic, and melodic minor each solve a different musical problem.',
        12,
        [
          scale('A natural minor', 'Notice the darker color without changing the fingering logic too much.', 9, 'Natural Minor'),
          scale('A harmonic minor', 'Listen for the raised seventh and its stronger pull back to the tonic.', 9, 'Harmonic Minor'),
          scale('A melodic minor', 'Feel the smoother ascent with raised sixth and seventh.', 9, 'Melodic Minor'),
        ],
      ),
      lesson(
        'advanced',
        2,
        'two-octave-arpeggios',
        'Two-Octave Arpeggios',
        'Run broken chords farther up the keyboard without losing shape.',
        11,
        [
          drill(
            'C major arpeggio run',
            'Keep the hand compact while the thumb and third finger trade the workload.',
            {
              kind: 'arpeggio',
              bpm: 88,
              rootMidi: 60,
              quality: 'major',
              hands: 'right',
              octaves: 2,
              direction: 'up-down',
            },
          ),
          drill(
            'A minor arpeggio run',
            'Repeat the same idea in a minor sonority.',
            {
              kind: 'arpeggio',
              bpm: 88,
              rootMidi: 57,
              quality: 'minor',
              hands: 'right',
              octaves: 2,
              direction: 'up-down',
            },
          ),
        ],
      ),
      lesson(
        'advanced',
        3,
        'seventh-chords',
        'Hear Seventh Chords',
        'Add the seventh above the triad and start naming richer chord colors.',
        9,
        [
          tip(
            'Seventh chords stretch harmony farther',
            'A seventh chord keeps the triad but adds one more scale step above it. That extra note changes the color immediately.',
          ),
          quiz(
            'Mixed harmony checkpoint',
            'Use a mixed quiz to switch quickly between chord, scale, and interval recognition.',
            'mixed',
          ),
        ],
      ),
      lesson(
        'advanced',
        4,
        'independent-rhythms',
        'Independent Rhythms',
        'Ask the hands to do different rhythmic jobs while staying together.',
        12,
        [
          drill(
            'Wide interval jumps',
            'Land repeated leaps cleanly before you add both hands.',
            {
              kind: 'interval-jumps',
              bpm: 84,
              baseMidi: 60,
              intervals: [7, 12, 5, 9, 12],
              handMode: 'alternating',
              noteBeats: 1,
            },
          ),
          interval(
            'Harder listening set',
            'Finish with a hard interval session and keep your focus under pressure.',
            'hard',
          ),
        ],
      ),
      stubLesson('advanced', 5, 'syncopation', 'Syncopation', 'A syncopation lesson is coming soon.'),
      stubLesson('advanced', 6, 'faster-scale-presets', 'Fast Scale Presets', 'A faster scale-automation lesson is coming soon.'),
    ],
  },
  {
    id: 'expert',
    order: 5,
    title: 'Expert',
    summary: 'Push past common tonal drills into chromaticism, modes, voice-leading, and faster control.',
    lessons: [
      lesson(
        'expert',
        1,
        'chromatic-control',
        'Chromatic Control',
        'Every semitone matters when the keyboard stops giving you white-key landmarks.',
        12,
        [
          scale('Chromatic scale', 'Stay relaxed and precise while every key changes.', 0, 'Chromatic'),
          drill(
            'Chromatic interval ladder',
            'Move through tight semitone motion without blurring the attack of each note.',
            {
              kind: 'interval-jumps',
              bpm: 92,
              baseMidi: 60,
              intervals: [1, 2, 3, 4, 5, 6],
              handMode: 'right',
              noteBeats: 0.5,
            },
          ),
        ],
      ),
      lesson(
        'expert',
        2,
        'modal-colors',
        'Modal Colors',
        'Treat scale choices as colors, not just finger patterns.',
        10,
        [
          quiz(
            'Scale-color checkpoint',
            'Use a scale-focused quiz session to sharpen recognition of different scalar flavors.',
            'scale',
          ),
          interval(
            'Hard interval trainer',
            'Continue with a hard session and aim to identify wider intervals quickly.',
            'hard',
          ),
        ],
      ),
      lesson(
        'expert',
        3,
        'voice-leading',
        'Voice Leading',
        'Smooth note-to-note movement keeps harmony connected and efficient.',
        10,
        [
          tip(
            'Move the fewest notes possible',
            'Good voice leading keeps common tones and moves the remaining notes by the smallest practical distance.',
          ),
          drill(
            'Contrary-motion voice-leading pattern',
            'Let each hand travel just enough to connect the next harmony cleanly.',
            {
              kind: 'motion-pattern',
              bpm: 86,
              startMidi: 64,
              intervals: [0, 3, 5, 7, 5, 3, 0],
              handMode: 'contrary',
              noteBeats: 0.75,
            },
          ),
        ],
      ),
      lesson(
        'expert',
        4,
        'fast-arpeggio-runs',
        'Fast Arpeggio Runs',
        'Increase speed without letting finger substitutions or crossings get tense.',
        11,
        [
          drill(
            'Dominant seventh run',
            'Keep the motion light and let the forearm guide the larger shape.',
            {
              kind: 'arpeggio',
              bpm: 108,
              rootMidi: 55,
              quality: 'dominant7',
              hands: 'parallel',
              octaves: 2,
              direction: 'up-down',
              noteBeats: 0.5,
            },
          ),
          quiz(
            'Mixed expert checkpoint',
            'Finish with a mixed quiz to confirm that technique and theory are moving together.',
            'mixed',
          ),
        ],
      ),
      stubLesson('expert', 5, 'polyrhythms', 'Polyrhythms', 'A triplets-against-eighths lesson is coming soon.'),
      stubLesson('expert', 6, 'full-checkpoint', 'Full Expert Checkpoint', 'A capstone assessment lesson is coming soon.'),
    ],
  },
];

export const ALL_LESSONS = CURRICULUM.flatMap((tier) => tier.lessons);
export const LESSONS_BY_ID = new Map(ALL_LESSONS.map((lesson) => [lesson.id, lesson]));
export const TIERS_BY_ID = new Map(CURRICULUM.map((tier) => [tier.id, tier]));

export function getLessonById(lessonId: string): Lesson | undefined {
  return LESSONS_BY_ID.get(lessonId);
}

export function getTierByLessonId(lessonId: string): LearningTier | undefined {
  const lesson = getLessonById(lessonId);
  return lesson ? TIERS_BY_ID.get(lesson.tier) : undefined;
}
