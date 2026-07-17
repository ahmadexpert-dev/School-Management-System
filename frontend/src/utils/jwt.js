// Decodes a JWT payload client-side for expiry checks only — never trust
// this for anything security-sensitive, the server independently verifies
// the signature on every request.
export function decodeJwtPayload(token) {
  try {
    const [, payload] = token.split('.');
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

export function getTokenExpiryMs(token) {
  const payload = decodeJwtPayload(token);
  return payload?.exp ? payload.exp * 1000 : null;
}

export function isTokenExpired(token) {
  const expiryMs = getTokenExpiryMs(token);
  return expiryMs !== null && Date.now() >= expiryMs;
}
