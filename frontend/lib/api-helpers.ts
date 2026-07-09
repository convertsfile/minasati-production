// lib/api-helpers.ts
//
// Shared helpers for working around backend API contract quirks that the
// ported frontend needs to handle gracefully. Centralising these helpers keeps
// the per-page fix surgical and consistent.

/**
 * Backend shape for /api/auth/me: { status: "success", data: UserResource }
 * where UserResource is itself an ApiResponse envelope: { success, message, data: User }.
 *
 * This helper extracts the inner UserResource from the wire response and
 * returns the inner `data` (the actual User) so call sites can treat it like
 * a normal ApiResponse envelope.
 */
export function unwrapAuthMeResponse(payload: any): any {
  if (!payload || typeof payload !== 'object') return payload;

  // 1) Wire shape: { status: "success", data: UserResource }
  if (payload.status && payload.data && typeof payload.data === 'object') {
    // 1a) UserResource is the standard ApiResponse { success, message, data }
    if ('success' in payload.data) {
      return payload.data.data;
    }
    // 1b) UserResource is the raw user object
    return payload.data;
  }

  // 2) Already-unwrapped shape: { success, message, data: User }
  if ('success' in payload && 'data' in payload) {
    return payload.data;
  }

  return payload;
}

/**
 * Read the user record out of the /api/auth/me wire response. The legacy
 * endpoint returns the non-standard envelope; the inventory marks this as a
 * documented holdover. Always normalise the result to a flat user object so
 * downstream code does not have to care about which path the backend took.
 */
export function readUserFromAuthMe(json: any): any {
  return unwrapAuthMeResponse(json);
}
