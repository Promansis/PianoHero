import { useEffect } from 'react';
import { ACHIEVEMENTS } from '../../lib/achievements/achievementDefinitions';

interface AchievementToastProps {
  achievementId: string | null;
  onClose: () => void;
}

export function AchievementToast({ achievementId, onClose }: AchievementToastProps) {
  useEffect(() => {
    if (!achievementId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onClose();
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [achievementId, onClose]);

  if (!achievementId) {
    return null;
  }

  const definition = ACHIEVEMENTS.find((achievement) => achievement.id === achievementId);
  if (!definition) {
    return null;
  }

  return (
    <aside className="achievement-toast" role="status" aria-live="polite">
      <div className="achievement-toast-icon">{definition.icon}</div>
      <div>
        <p className="eyebrow">Achievement Unlocked</p>
        <strong>{definition.name}</strong>
        <p className="panel-copy">{definition.description}</p>
      </div>
      <button className="secondary-button" onClick={onClose}>
        Dismiss
      </button>
    </aside>
  );
}
