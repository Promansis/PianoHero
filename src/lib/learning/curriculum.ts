import type {
  DiagramSpec,
  DrillSpec,
  Lesson,
  LessonCheckSpec,
  LessonStep,
  LearningTier,
  MiniCheckSpec,
} from './types';

type RichLessonStepOptions = {
  learningGoal?: string;
  coachTip?: string;
  miniCheck?: MiniCheckSpec;
  completionCheck?: LessonCheckSpec;
};

type RichLessonOptions = {
  learningGoals?: string[];
  coachNotes?: string[];
  miniTest?: MiniCheckSpec;
  completionChecks?: LessonCheckSpec[];
};

function tip(title: string, body: string, diagram?: DiagramSpec, options: RichLessonStepOptions = {}): LessonStep {
  return { kind: 'tip', title, body, diagram, ...options };
}

function keyboardTip(
  title: string,
  body: string,
  midiNotes: number[],
  labels?: Record<number, string>,
  options: RichLessonStepOptions = {},
): LessonStep {
  return tip(title, body, { kind: 'keyboard-highlight', midiNotes, labels }, options);
}

function fingerTip(title: string, body: string, hand: 'left' | 'right', options: RichLessonStepOptions = {}): LessonStep {
  return tip(title, body, { kind: 'finger-numbers', hand }, options);
}

function setupTip(
  title: string,
  body: string,
  variant: 'seat-height' | 'distance' | 'posture' | 'hand-shape',
  options: RichLessonStepOptions = {},
): LessonStep {
  return tip(title, body, { kind: 'setup-diagram', variant }, options);
}

function drill(title: string, body: string, drillSpec: DrillSpec, options: RichLessonStepOptions = {}): LessonStep {
  return {
    kind: 'drill',
    title,
    body,
    drill: drillSpec,
    passAccuracy: 70,
    ...options,
  };
}

function scale(title: string, body: string, root: number, scaleName: string, options: RichLessonStepOptions = {}): LessonStep {
  return {
    kind: 'scale',
    title,
    body,
    root,
    scaleName,
    passAccuracy: 70,
    ...options,
  };
}

function interval(
  title: string,
  body: string,
  difficulty: 'easy' | 'medium' | 'hard',
  options: RichLessonStepOptions = {},
): LessonStep {
  return {
    kind: 'interval',
    title,
    body,
    difficulty,
    passAccuracy: 70,
    ...options,
  };
}

function quiz(
  title: string,
  body: string,
  quizType: 'chord' | 'scale' | 'interval' | 'mixed',
  options: RichLessonStepOptions = {},
): LessonStep {
  return {
    kind: 'quiz',
    title,
    body,
    quizType,
    passAccuracy: 70,
    ...options,
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
  options: RichLessonOptions = {},
): Lesson {
  return {
    id: `${tier}-${String(order).padStart(2, '0')}-${slug}`,
    tier,
    order,
    title,
    summary,
    estMinutes,
    steps,
    ...options,
  };
}

export const CURRICULUM: LearningTier[] = [
  {
    id: 'novice',
    order: 1,
    title: 'Novice',
    summary: 'No experience required. Learn the keyboard map, hand shape, and first steady notes.',
    capstone: {
      songFileName: 'ode-to-joy.mid',
      displayTitle: 'Ode to Joy (Beethoven)',
      accuracyThreshold: 85,
      tempoPercent: 90,
      handFilter: 'right',
      description: 'Play the melody of Ode to Joy with your right hand at 90% tempo. Reach 85% accuracy to unlock the Beginner tier.',
    },
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
            undefined,
            {
              learningGoal: 'Recognize the repeating black-key layout before naming individual notes.',
              miniCheck: {
                kind: 'self-check',
                prompt: 'Can you point to three different groups of two black keys without counting from the edge?',
                successLabel: 'Two-black-key groups located',
              },
            },
          ),
          keyboardTip(
            'Middle C is your home base',
            'Find the white key just to the left of a two-black-key group. That is C. The C closest to the center of the keyboard is middle C.',
            [60],
            { 60: 'Middle C' },
            {
              coachTip: 'Always locate the nearest pair of black keys first, then move left by one white key.',
            },
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
            {
              learningGoal: 'Match a simple pulse without losing track of the beat.',
              completionCheck: {
                kind: 'accuracy',
                label: 'Keep the first steady-note drill at 70% accuracy or better.',
                minimumAccuracy: 70,
              },
            },
          ),
        ],
        {
          learningGoals: [
            'Spot two-black and three-black patterns quickly.',
            'Use middle C as a visual landmark before starting a drill.',
          ],
          miniTest: {
            kind: 'multiple-choice',
            prompt: 'Which white key sits immediately to the left of a two-black-key group?',
            choices: [
              { label: 'C', explanation: 'That left-adjacent white key is always C.' },
              { label: 'D' },
              { label: 'F' },
            ],
            expectedAnswer: 'C',
          },
        },
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
            {
              learningGoal: 'Link each right-hand finger to a number without hesitation.',
            },
          ),
          fingerTip(
            'Left hand numbers',
            'The numbers stay the same on the left hand: thumb is still 1 and pinky is still 5.',
            'left',
            {
              coachTip: 'Use the same numbering language on both hands so fingering instructions stay consistent.',
            },
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
            {
              miniCheck: {
                kind: 'self-check',
                prompt: 'Did each finger stay over its own key instead of sliding the whole hand?',
                successLabel: 'Hand stayed in position',
              },
            },
          ),
        ],
        {
          learningGoals: [
            'Memorize finger numbers for both hands.',
            'Keep one finger assigned to each key in C position.',
          ],
        },
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
      lesson(
        'novice',
        5,
        'rhythm-values',
        'Reading Note Values',
        'Count quarter, half, and whole notes accurately with a steady pulse.',
        9,
        [
          tip(
            'Feel the beat before you count notes',
            'A beat is the steady pulse underneath the music. Quarter notes last for one beat, half notes last for two beats, and whole notes last for four beats.',
          ),
          tip(
            'Count all the way through long notes',
            'Do not stop counting when you hold a note. Say the beats evenly out loud so the note lasts its full value and releases exactly on time.',
          ),
          drill(
            'Quarter-note taps on middle C',
            'Play middle C with the right hand for one beat at a time. Keep each attack even and let the pulse stay steady from note to note.',
            {
              kind: 'single-note-rhythm',
              bpm: 72,
              midi: 60,
              hand: 'right',
              patternBeats: [1, 1, 1, 1],
              repetitions: 3,
            },
          ),
          drill(
            'Half notes and whole notes on middle C',
            'Hold each note all the way to the end of its count. Stay relaxed in the hand while the sound lasts.',
            {
              kind: 'single-note-rhythm',
              bpm: 66,
              midi: 60,
              hand: 'right',
              patternBeats: [2, 2, 4, 2, 4],
            },
          ),
        ],
      ),
      lesson(
        'novice',
        6,
        'first-song',
        'First Song Builder',
        'Build and play a simple C-position melody with good preparation habits.',
        10,
        [
          tip(
            'Prepare a song before you play it',
            'First find the starting note, then check which fingers you need, then look for repeated notes and small steps. That short preview helps beginners play with fewer stops.',
          ),
          keyboardTip(
            'Right hand stays in C position',
            'Place fingers 1 to 5 on C, D, E, F, and G. Keep the hand quiet and let each finger wait above its own key.',
            [60, 62, 64, 65, 67],
            { 60: '1', 62: '2', 64: '3', 65: '4', 67: '5' },
          ),
          drill(
            'Build your first C-position tune',
            'Play this short melody slowly. Keep repeated notes matched and let each step move to the next key without lifting the whole hand.',
            {
              kind: 'melody',
              bpm: 72,
              notes: [
                { midi: 60, beats: 1, hand: 'right' },
                { midi: 62, beats: 1, hand: 'right' },
                { midi: 64, beats: 1, hand: 'right' },
                { midi: 62, beats: 1, hand: 'right' },
                { midi: 60, beats: 1, hand: 'right' },
                { midi: 60, beats: 1, hand: 'right' },
                { midi: 62, beats: 1, hand: 'right' },
                { midi: 64, beats: 1, hand: 'right' },
                { midi: 65, beats: 1, hand: 'right' },
                { midi: 64, beats: 1, hand: 'right' },
                { midi: 62, beats: 1, hand: 'right' },
                { midi: 60, beats: 2, hand: 'right' },
              ],
            },
          ),
          tip(
            'Practice in small phrases',
            'Work in two- or four-note groups, then connect them. If you make a mistake, stop calmly, reset the hand, and begin the phrase again with the same steady count.',
          ),
        ],
      ),
    ],
  },
  {
    id: 'beginner',
    order: 2,
    title: 'Beginner',
    summary: 'Build finger independence, start scales, and play your first melodic phrases.',
    capstone: {
      songFileName: 'mary-had-a-little-lamb.mid',
      displayTitle: 'Mary Had a Little Lamb',
      accuracyThreshold: 85,
      tempoPercent: 100,
      handFilter: 'both',
      description: 'Play Mary Had a Little Lamb with both hands. Reach 85% accuracy to unlock the Intermediate tier.',
    },
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
      lesson(
        'beginner',
        5,
        'note-values',
        'Quarter, Half, Whole Notes',
        'Read and play mixed note values inside short four-beat phrases.',
        9,
        [
          tip(
            'Count note values inside a four-beat bar',
            'In common beginner music, quarter notes get one beat, half notes get two beats, and whole notes fill all four beats. Keep the count moving even while one note lasts longer than another.',
          ),
          drill(
            'Single-note value reading',
            'Stay on one key so you can focus only on rhythm. Count 1-2-3-4 out loud and make the note lengths match the beat exactly.',
            {
              kind: 'single-note-rhythm',
              bpm: 72,
              midi: 64,
              hand: 'right',
              patternBeats: [1, 1, 2, 1, 1, 4],
            },
          ),
          drill(
            'Short melody with mixed note values',
            'Read the rhythm first, then play. Let the longer notes ring fully instead of clipping them short.',
            {
              kind: 'melody',
              bpm: 72,
              notes: [
                { midi: 60, beats: 1, hand: 'right' },
                { midi: 62, beats: 1, hand: 'right' },
                { midi: 64, beats: 2, hand: 'right' },
                { midi: 65, beats: 1, hand: 'right' },
                { midi: 64, beats: 1, hand: 'right' },
                { midi: 62, beats: 2, hand: 'right' },
                { midi: 60, beats: 4, hand: 'right' },
              ],
            },
          ),
        ],
      ),
      lesson(
        'beginner',
        6,
        'metronome-basics',
        'Play With the Click',
        'Use a slow metronome to line up your hands with a reliable beat.',
        10,
        [
          tip(
            'Meet the click instead of chasing it',
            'Start by listening for one full bar before you play. Count along with the click so your hands arrive with the beat instead of reacting late to it.',
          ),
          drill(
            'Quarter notes with the metronome',
            'Play one steady note exactly with each click. If the timing wobbles, lower the tempo and make the pulse comfortable again.',
            {
              kind: 'single-note-rhythm',
              bpm: 64,
              midi: 60,
              hand: 'right',
              patternBeats: [1, 1, 1, 1, 1, 1, 1, 1],
            },
          ),
          drill(
            'Five-finger pattern with a slow click',
            'Keep every note aligned to the beat. Accuracy matters more than speed, so keep the hand calm and the tone even.',
            {
              kind: 'five-finger-pattern',
              bpm: 68,
              startMidi: 60,
              handMode: 'right',
              direction: 'up-down',
              repetitions: 2,
            },
          ),
          tip(
            'Raise the tempo only after clean repetitions',
            'A good metronome habit is to stay at one tempo until you can play it accurately twice in a row with relaxed shoulders and steady counting. Then move up only a little.',
          ),
        ],
      ),
    ],
  },
  {
    id: 'intermediate',
    order: 3,
    title: 'Intermediate',
    summary: 'Add thumb crossing, more key signatures, harmony basics, and two-hand control.',
    capstone: {
      songFileName: 'minuet-in-g.mid',
      displayTitle: 'Minuet in G (Bach)',
      accuracyThreshold: 80,
      tempoPercent: 90,
      handFilter: 'both',
      description: 'Play the Minuet in G excerpt with both hands. Reach 80% accuracy to unlock the Advanced tier.',
    },
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
      lesson(
        'intermediate',
        5,
        'dotted-rhythms',
        'Dotted Rhythms',
        'Learn to count and play long-short dotted rhythms without rushing.',
        10,
        [
          tip(
            'A dot adds half of the original note value',
            'A dotted quarter note lasts for one and a half beats, so an eighth note often follows to complete beat two. Count the long note fully before the short note arrives.',
          ),
          drill(
            'Long-short dotted pulse',
            'Feel the long-short shape clearly instead of rushing the short note. Keep the beat steady underneath the uneven rhythm.',
            {
              kind: 'single-note-rhythm',
              bpm: 76,
              midi: 67,
              hand: 'right',
              patternBeats: [1.5, 0.5, 1.5, 0.5, 1.5, 0.5, 2],
            },
          ),
          drill(
            'Dotted-rhythm phrase in one hand',
            'Read the rhythm first, then play the notes. Let the dotted notes stretch fully and drop into the short notes cleanly.',
            {
              kind: 'melody',
              bpm: 74,
              notes: [
                { midi: 64, beats: 1.5, hand: 'right' },
                { midi: 67, beats: 0.5, hand: 'right' },
                { midi: 65, beats: 1.5, hand: 'right' },
                { midi: 69, beats: 0.5, hand: 'right' },
                { midi: 67, beats: 1, hand: 'right' },
                { midi: 65, beats: 1, hand: 'right' },
                { midi: 64, beats: 2, hand: 'right' },
              ],
            },
          ),
          tip(
            'Do not shorten the long note to make room',
            'Most dotted-rhythm problems come from clipping the long note and hurrying the short one. Count through the long value, then let the short note land lightly and exactly.',
          ),
        ],
      ),
      lesson(
        'intermediate',
        6,
        'more-inversions',
        'Broken Chords in Motion',
        'Turn chord shapes into smooth broken-chord motion with relaxed technique.',
        11,
        [
          tip(
            'Broken chords are one harmony spread across time',
            'Instead of striking the notes together, you play them one after another. Keep the wrist loose and think of the notes as one grouped shape, not separate finger jobs.',
          ),
          drill(
            'C major broken chord',
            'Travel through the chord smoothly and keep the hand compact between finger changes.',
            {
              kind: 'arpeggio',
              bpm: 82,
              rootMidi: 60,
              quality: 'major',
              hands: 'right',
              octaves: 2,
              direction: 'up-down',
            },
          ),
          drill(
            'A minor broken chord',
            'Use the same grouped feeling in a minor sound. Listen for an even tone from bottom to top and back down.',
            {
              kind: 'arpeggio',
              bpm: 82,
              rootMidi: 57,
              quality: 'minor',
              hands: 'left',
              octaves: 2,
              direction: 'up-down',
            },
          ),
          tip(
            'Hear the harmony while the fingers move',
            'Practice broken chords as one harmonic gesture. If the hand gets tight, slow down and regroup the notes mentally before you try again.',
          ),
        ],
      ),
    ],
  },
  {
    id: 'advanced',
    order: 4,
    title: 'Advanced',
    summary: 'Work through minor systems, arpeggios, seventh chords, and quicker coordination.',
    capstone: {
      songFileName: 'prelude-in-c.mid',
      displayTitle: 'Prelude in C (Bach, WTC)',
      accuracyThreshold: 80,
      tempoPercent: 100,
      handFilter: 'both',
      description: 'Play the Prelude in C Major with both hands. Reach 80% accuracy to unlock the Expert tier.',
    },
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
      lesson(
        'advanced',
        5,
        'syncopation',
        'Syncopation',
        'Feel off-beat motion clearly while the underlying pulse stays steady.',
        11,
        [
          tip(
            'Syncopation leans across the beat',
            'Instead of always changing notes on strong beats, syncopation carries motion into weaker parts of the bar. The pulse must stay solid even when the accents feel displaced.',
          ),
          tip(
            'Subdivide before you play',
            'Count smaller parts of the beat out loud before touching the keys. That keeps off-beat entries relaxed and prevents guessing.',
          ),
          drill(
            'Syncopated single-note pattern',
            'Keep the internal beat steady while the note changes arrive away from the strongest beats. Think long-short-long instead of stiff counting.',
            {
              kind: 'single-note-rhythm',
              bpm: 84,
              midi: 69,
              hand: 'right',
              patternBeats: [0.5, 1.5, 0.5, 1.5, 1, 1, 2],
            },
          ),
          drill(
            'Short syncopated phrase',
            'Let the held notes connect across the beat and avoid punching every attack the same way.',
            {
              kind: 'melody',
              bpm: 82,
              notes: [
                { midi: 69, beats: 0.5, hand: 'right' },
                { midi: 71, beats: 1.5, hand: 'right' },
                { midi: 72, beats: 0.5, hand: 'right' },
                { midi: 71, beats: 1.5, hand: 'right' },
                { midi: 69, beats: 1, hand: 'right' },
                { midi: 67, beats: 1, hand: 'right' },
                { midi: 69, beats: 2, hand: 'right' },
              ],
            },
          ),
        ],
      ),
      lesson(
        'advanced',
        6,
        'faster-scale-presets',
        'Fast Scale Presets',
        'Practice faster scales with efficient motion, even tone, and clean crossings.',
        11,
        [
          tip(
            'Speed comes from efficient motion',
            'At faster tempos, keep the fingertips close to the keys, use only the motion you need, and avoid pressing harder. Even tone matters more than maximum speed.',
          ),
          scale(
            'E major speed check',
            'Run E major with a controlled tempo and clean thumb crossings. Stay loose through the sharper key shape.',
            4,
            'Major',
          ),
          scale(
            'B major speed check',
            'Repeat the same approach in B major. Group the pattern in small units instead of trying to push the whole scale at once.',
            11,
            'Major',
          ),
          tip(
            'Increase tempo only after relaxed accuracy',
            'Play the scale evenly at least twice with no stumbles before you move the metronome higher. If tension appears, back down immediately and rebuild the motion.',
          ),
        ],
      ),
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
      lesson(
        'expert',
        5,
        'polyrhythms',
        'Polyrhythms',
        'Prepare 3:2 coordination by stabilizing each rhythmic layer against one pulse.',
        11,
        [
          tip(
            'Polyrhythms need a shared pulse',
            'For a 3:2 pattern, both rhythms must fit inside the same beat space. Count the common pulse first so neither hand tries to speed up independently.',
          ),
          tip(
            'Separate the layers before combining them',
            'Practice the triplet layer alone, then the duple layer alone. Only combine them after both feel automatic and relaxed.',
          ),
          drill(
            'Triplet-layer preparation',
            'Play three even notes inside each beat group. Keep the spacing exact and do not let the hand tighten as the notes get closer together.',
            {
              kind: 'single-note-rhythm',
              bpm: 72,
              midi: 72,
              hand: 'right',
              patternBeats: [0.6667, 0.6667, 0.6667, 0.6667, 0.6667, 0.6667],
            },
          ),
          drill(
            'Duple-layer preparation',
            'Now play the simpler two-note layer with the same steady pulse. This is groundwork for later true hands-together polyrhythm practice.',
            {
              kind: 'single-note-rhythm',
              bpm: 72,
              midi: 48,
              hand: 'left',
              patternBeats: [1, 1, 1, 1],
            },
          ),
        ],
      ),
      lesson(
        'expert',
        6,
        'full-checkpoint',
        'Full Expert Checkpoint',
        'Review expert technique and theory with a short capstone checkpoint.',
        12,
        [
          tip(
            'Treat this as a musical checkup',
            'Start for accuracy, then continuity, then speed. The goal is controlled playing under pressure, not forcing every step at full intensity.',
          ),
          scale(
            'Chromatic control review',
            'Run the chromatic scale with even touch and precise fingering. Every semitone should sound equally deliberate.',
            0,
            'Chromatic',
          ),
          drill(
            'Dominant seventh arpeggio review',
            'Keep the pattern light and organized while both hands travel through the full shape.',
            {
              kind: 'arpeggio',
              bpm: 104,
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
            'Finish with a mixed theory session so your listening and recognition stay connected to your technique work.',
            'mixed',
          ),
        ],
      ),
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
