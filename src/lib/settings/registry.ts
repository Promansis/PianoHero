import {
  DEFAULT_INPUT_MODE,
  INPUT_KEYBOARD_MAPPING_SETTING_KEY,
  INPUT_MODE_SETTING_KEY,
  INPUT_SETTINGS_CATEGORY,
} from '../input/settings';
import {
  CAPSTONE_RESULTS_KEY,
  COMPLETED_LESSONS_KEY,
  COMPLETED_STEPS_KEY,
  GATING_ENABLED_KEY,
  LEARNING_SETTINGS_CATEGORY,
} from '../learning/learningProgress';

export type SettingValueKind = 'boolean' | 'integer' | 'json' | 'string';
export type SettingOwner = 'app' | 'audio' | 'gameplay' | 'input' | 'learning' | 'progress' | 'settings' | 'visual';
export type SettingStorageKind = 'persisted' | 'browser-local' | 'in-memory';
export type SettingResetBehavior = 'delete-user-data' | 'reset-learning-progress' | 'preserve';

export interface SettingDefinition {
  applyOwner: SettingOwner;
  category: string;
  defaultValue: string;
  key: string;
  resetBehavior: SettingResetBehavior;
  storage: SettingStorageKind;
  uiOwner: SettingOwner;
  valueKind: SettingValueKind;
}

export const SETTINGS_REGISTRY = [
  {
    category: INPUT_SETTINGS_CATEGORY,
    key: INPUT_MODE_SETTING_KEY,
    defaultValue: DEFAULT_INPUT_MODE,
    valueKind: 'string',
    uiOwner: 'settings',
    applyOwner: 'input',
    resetBehavior: 'delete-user-data',
    storage: 'persisted',
  },
  {
    category: INPUT_SETTINGS_CATEGORY,
    key: INPUT_KEYBOARD_MAPPING_SETTING_KEY,
    defaultValue: '',
    valueKind: 'json',
    uiOwner: 'input',
    applyOwner: 'input',
    resetBehavior: 'delete-user-data',
    storage: 'persisted',
  },
  {
    category: INPUT_SETTINGS_CATEGORY,
    key: 'midiDeviceId',
    defaultValue: '',
    valueKind: 'string',
    uiOwner: 'settings',
    applyOwner: 'input',
    resetBehavior: 'delete-user-data',
    storage: 'persisted',
  },
  {
    category: 'practice',
    key: 'postureReminderMinutes',
    defaultValue: '0',
    valueKind: 'integer',
    uiOwner: 'settings',
    applyOwner: 'app',
    resetBehavior: 'delete-user-data',
    storage: 'persisted',
  },
  {
    category: 'practice',
    key: 'breakReminderMinutes',
    defaultValue: '0',
    valueKind: 'integer',
    uiOwner: 'settings',
    applyOwner: 'app',
    resetBehavior: 'delete-user-data',
    storage: 'persisted',
  },
  {
    category: 'practice',
    key: 'dailyGoalMinutes',
    defaultValue: '0',
    valueKind: 'integer',
    uiOwner: 'settings',
    applyOwner: 'progress',
    resetBehavior: 'delete-user-data',
    storage: 'persisted',
  },
  {
    category: 'gameplay',
    key: 'metronomeDefault',
    defaultValue: 'false',
    valueKind: 'boolean',
    uiOwner: 'settings',
    applyOwner: 'gameplay',
    resetBehavior: 'delete-user-data',
    storage: 'persisted',
  },
  {
    category: 'gameplay',
    key: 'waitModeDefault',
    defaultValue: 'false',
    valueKind: 'boolean',
    uiOwner: 'settings',
    applyOwner: 'gameplay',
    resetBehavior: 'delete-user-data',
    storage: 'persisted',
  },
  {
    category: 'fingering',
    key: 'displayMode',
    defaultValue: 'learning-only',
    valueKind: 'string',
    uiOwner: 'settings',
    applyOwner: 'gameplay',
    resetBehavior: 'delete-user-data',
    storage: 'persisted',
  },
  {
    category: 'audio',
    key: 'customSamplePackPath',
    defaultValue: '',
    valueKind: 'string',
    uiOwner: 'settings',
    applyOwner: 'audio',
    resetBehavior: 'delete-user-data',
    storage: 'persisted',
  },
  {
    category: 'audio',
    key: 'pitchBendEnabled',
    defaultValue: 'true',
    valueKind: 'boolean',
    uiOwner: 'settings',
    applyOwner: 'audio',
    resetBehavior: 'delete-user-data',
    storage: 'persisted',
  },
  {
    category: LEARNING_SETTINGS_CATEGORY,
    key: COMPLETED_LESSONS_KEY,
    defaultValue: '[]',
    valueKind: 'json',
    uiOwner: 'learning',
    applyOwner: 'learning',
    resetBehavior: 'reset-learning-progress',
    storage: 'persisted',
  },
  {
    category: LEARNING_SETTINGS_CATEGORY,
    key: COMPLETED_STEPS_KEY,
    defaultValue: '{}',
    valueKind: 'json',
    uiOwner: 'learning',
    applyOwner: 'learning',
    resetBehavior: 'reset-learning-progress',
    storage: 'persisted',
  },
  {
    category: LEARNING_SETTINGS_CATEGORY,
    key: GATING_ENABLED_KEY,
    defaultValue: 'false',
    valueKind: 'boolean',
    uiOwner: 'learning',
    applyOwner: 'learning',
    resetBehavior: 'reset-learning-progress',
    storage: 'persisted',
  },
  {
    category: LEARNING_SETTINGS_CATEGORY,
    key: CAPSTONE_RESULTS_KEY,
    defaultValue: '{}',
    valueKind: 'json',
    uiOwner: 'learning',
    applyOwner: 'learning',
    resetBehavior: 'reset-learning-progress',
    storage: 'persisted',
  },
] as const satisfies readonly SettingDefinition[];

export type RegisteredSettingKey = `${typeof SETTINGS_REGISTRY[number]['category']}.${typeof SETTINGS_REGISTRY[number]['key']}`;

export function getSettingCompositeKey(category: string, key: string): string {
  return `${category}.${key}`;
}

export function getSettingDefinition(category: string, key: string): SettingDefinition | null {
  return SETTINGS_REGISTRY.find((definition) => definition.category === category && definition.key === key) ?? null;
}

export function getSettingDefault(category: string, key: string): string | null {
  return getSettingDefinition(category, key)?.defaultValue ?? null;
}

export function parseBooleanSetting(value: string | null | undefined, fallback: boolean): boolean {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return fallback;
}

export function parsePositiveIntegerSetting(value: string | null | undefined): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parseIntegerSetting(value: string | null | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}
