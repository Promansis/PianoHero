import { describe, expect, it } from 'vitest';
import { DEFAULT_INPUT_MODE } from '../input/settings';
import {
  getSettingCompositeKey,
  getSettingDefault,
  getSettingDefinition,
  parseBooleanSetting,
  parseIntegerSetting,
  parsePositiveIntegerSetting,
  SETTINGS_REGISTRY,
} from './registry';

describe('settings registry', () => {
  it('registers high-pressure settings with defaults and owners', () => {
    expect(getSettingDefault('input', 'mode')).toBe(DEFAULT_INPUT_MODE);
    expect(getSettingDefault('practice', 'dailyGoalMinutes')).toBe('0');
    expect(getSettingDefault('practice', 'postureReminderMinutes')).toBe('0');
    expect(getSettingDefault('practice', 'breakReminderMinutes')).toBe('0');
    expect(getSettingDefault('gameplay', 'metronomeDefault')).toBe('false');
    expect(getSettingDefault('fingering', 'displayMode')).toBe('learning-only');
    expect(getSettingDefault('audio', 'customSamplePackPath')).toBe('');

    expect(getSettingDefinition('audio', 'customSamplePackPath')).toMatchObject({
      applyOwner: 'audio',
      resetBehavior: 'delete-user-data',
      uiOwner: 'settings',
    });
    expect(getSettingDefinition('learning', 'completedLessons')).toMatchObject({
      applyOwner: 'learning',
      resetBehavior: 'reset-learning-progress',
    });
  });

  it('keeps registry composite keys unique', () => {
    const keys = SETTINGS_REGISTRY.map((definition) =>
      getSettingCompositeKey(definition.category, definition.key),
    );

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('parses booleans and integers with explicit fallback behavior', () => {
    expect(parseBooleanSetting('true', false)).toBe(true);
    expect(parseBooleanSetting('false', true)).toBe(false);
    expect(parseBooleanSetting(null, true)).toBe(true);

    expect(parseIntegerSetting('12', 4)).toBe(12);
    expect(parseIntegerSetting('12.5', 4)).toBe(4);
    expect(parseIntegerSetting('nope', 4)).toBe(4);

    expect(parsePositiveIntegerSetting('20')).toBe(20);
    expect(parsePositiveIntegerSetting('0')).toBeNull();
    expect(parsePositiveIntegerSetting('-1')).toBeNull();
    expect(parsePositiveIntegerSetting('')).toBeNull();
  });
});
