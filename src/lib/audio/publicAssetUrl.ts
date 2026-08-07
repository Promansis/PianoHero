export function resolvePublicAssetUrl(pathname: string): string {
  if (typeof document === 'undefined') {
    return pathname;
  }

  return new URL(pathname.replace(/^\//, ''), document.baseURI).toString();
}
