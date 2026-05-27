import { bodyLimit } from 'hono/body-limit';
import type { Context, MiddlewareHandler } from 'hono';

export const BRIDGE_RPC_BODY_LIMIT_BYTES = 256 * 1024;
export const LIBRARY_IMPORT_BODY_LIMIT_BYTES = 50 * 1024 * 1024;
export const MIDI_FILE_LIMIT_BYTES = 10 * 1024 * 1024;
export const MIDI_UPLOAD_BODY_LIMIT_BYTES = MIDI_FILE_LIMIT_BYTES + 1024 * 1024;

const ACCESS_COOKIE_NAME = 'pianohero_web_access';

function jsonLimitError(c: Context, label: string) {
  return c.json({ error: `${label} exceeds the request body limit.` }, 413);
}

export function bridgeRpcBodyLimit(): MiddlewareHandler {
  return bodyLimit({
    maxSize: BRIDGE_RPC_BODY_LIMIT_BYTES,
    onError: (c) => jsonLimitError(c, 'Bridge request'),
  });
}

export function libraryImportBodyLimit(): MiddlewareHandler {
  return bodyLimit({
    maxSize: LIBRARY_IMPORT_BODY_LIMIT_BYTES,
    onError: (c) => jsonLimitError(c, 'Library import'),
  });
}

export function midiUploadBodyLimit(): MiddlewareHandler {
  return bodyLimit({
    maxSize: MIDI_UPLOAD_BODY_LIMIT_BYTES,
    onError: (c) => jsonLimitError(c, 'MIDI upload'),
  });
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) {
    return null;
  }

  for (const cookie of header.split(';')) {
    const [rawKey, ...rawValue] = cookie.trim().split('=');
    if (rawKey === name) {
      return decodeURIComponent(rawValue.join('='));
    }
  }

  return null;
}

function setAccessCookie(c: Context, secret: string): void {
  const secure = new URL(c.req.url).protocol === 'https:';
  c.header(
    'Set-Cookie',
    `${ACCESS_COOKIE_NAME}=${encodeURIComponent(secret)}; Path=/api; HttpOnly; SameSite=Strict${secure ? '; Secure' : ''}`,
  );
}

export function createApiAccessGate(secret: string | undefined): MiddlewareHandler {
  const expectedSecret = secret?.trim();
  return async (c, next) => {
    if (!expectedSecret) {
      await next();
      return;
    }

    const suppliedSecret =
      c.req.header('x-pianohero-access-token') ??
      new URL(c.req.url).searchParams.get('access_token') ??
      readCookie(c.req.raw, ACCESS_COOKIE_NAME);

    if (suppliedSecret !== expectedSecret) {
      return c.json({ error: 'Web API access token required.' }, 401);
    }

    if (c.req.header('x-pianohero-access-token') === expectedSecret || new URL(c.req.url).searchParams.get('access_token') === expectedSecret) {
      setAccessCookie(c, expectedSecret);
    }

    await next();
  };
}
