export async function saveSetting(
  category: string,
  key: string,
  value: string,
): Promise<{ saved: boolean }> {
  try {
    if (!window.appBridge) {
      return { saved: false };
    }

    await window.appBridge.setSetting(category, key, value);
    return { saved: true };
  } catch {
    return { saved: false };
  }
}
