import { useMemo, useState } from 'react';
import type { NotationReadingPrompt, NotationReadingStep } from '../../lib/learning/types';

interface NotationReadingExerciseProps {
  step: NotationReadingStep;
  onComplete: () => void;
}

const NOTE_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const PITCH_CLASS_NAMES: Record<number, string> = {
  0: 'C',
  1: 'C#',
  2: 'D',
  3: 'D#',
  4: 'E',
  5: 'F',
  6: 'F#',
  7: 'G',
  8: 'G#',
  9: 'A',
  10: 'A#',
  11: 'B',
};

function pitchClassLetter(midi: number): string {
  const name = PITCH_CLASS_NAMES[midi % 12] ?? '';
  return name.replace('#', '');
}

function renderStaff(prompt: NotationReadingPrompt) {
  const { midi, clef } = prompt;
  const staffTop = 20;
  const lineGap = 10;
  const lines = [0, 1, 2, 3, 4].map((i) => staffTop + i * lineGap);
  const refMidi = clef === 'treble' ? 64 : 43; // E4 / G2 bottom lines
  const semisFromRef = midi - refMidi;
  const diatonicSteps = Math.round((semisFromRef * 7) / 12);
  const noteY = staffTop + 4 * lineGap - diatonicSteps * (lineGap / 2);
  const ledgerLines: number[] = [];
  if (noteY > staffTop + 4 * lineGap) {
    for (let y = staffTop + 5 * lineGap; y <= noteY + 1; y += lineGap) ledgerLines.push(y);
  } else if (noteY < staffTop) {
    for (let y = staffTop - lineGap; y >= noteY - 1; y -= lineGap) ledgerLines.push(y);
  }

  return (
    <svg width="160" height="120" viewBox="0 0 160 120" aria-label={`${clef} clef staff`} role="img">
      {lines.map((y) => (
        <line key={y} x1="10" x2="150" y1={y} y2={y} stroke="currentColor" strokeWidth="1" />
      ))}
      <text x="14" y={staffTop + 4 * lineGap - 2} fontSize="32" fill="currentColor">
        {clef === 'treble' ? '\u{1D11E}' : '\u{1D122}'}
      </text>
      {ledgerLines.map((y) => (
        <line key={`ledger-${y}`} x1="70" x2="98" y1={y} y2={y} stroke="currentColor" strokeWidth="1" />
      ))}
      <ellipse cx="84" cy={noteY} rx="7" ry="5" fill="currentColor" />
    </svg>
  );
}

export function NotationReadingExercise({ step, onComplete }: NotationReadingExerciseProps) {
  const prompts = useMemo(() => step.prompts, [step.prompts]);
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const target = prompts[index];
  const passThreshold = Math.max(
    1,
    Math.floor((prompts.length * (step.passAccuracy ?? 80)) / 100),
  );
  const finished = index >= prompts.length;

  if (!target || finished) {
    const passed = correctCount >= passThreshold;
    return (
      <div className="lesson-inline-activity">
        <p className="panel-copy">
          {correctCount} / {prompts.length} correct{passed ? ' — target met.' : ' — try again to hit the target.'}
        </p>
        <div className="lesson-step-actions">
          {passed ? (
            <button className="primary-button" onClick={onComplete}>
              Mark Complete
            </button>
          ) : (
            <button
              className="secondary-button"
              onClick={() => {
                setIndex(0);
                setCorrectCount(0);
                setFeedback('idle');
              }}
            >
              Restart
            </button>
          )}
        </div>
      </div>
    );
  }

  const handleAnswer = (letter: string) => {
    const correct = pitchClassLetter(target.midi) === letter;
    setFeedback(correct ? 'correct' : 'wrong');
    if (correct) setCorrectCount((n) => n + 1);
    window.setTimeout(() => {
      setIndex((i) => i + 1);
      setFeedback('idle');
    }, 450);
  };

  return (
    <div className="lesson-inline-activity notation-reading-exercise">
      <p className="eyebrow">Prompt {index + 1} / {prompts.length}</p>
      {renderStaff(target)}
      <p className="panel-copy">Which note is this?</p>
      <div className="notation-answer-row">
        {NOTE_LETTERS.map((letter) => (
          <button
            key={letter}
            className="secondary-button"
            onClick={() => handleAnswer(letter)}
            disabled={feedback !== 'idle'}
          >
            {letter}
          </button>
        ))}
      </div>
      {feedback !== 'idle' && (
        <p className={`notation-feedback notation-feedback--${feedback}`}>
          {feedback === 'correct' ? 'Correct.' : `Answer: ${pitchClassLetter(target.midi)}`}
        </p>
      )}
    </div>
  );
}
