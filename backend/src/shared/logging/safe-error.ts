/**
 * Content-free error serialization for privacy-sensitive logging.
 *
 * NEVER pass raw Telegram updates, request bodies, prayer text, or any
 * user-controlled object into these helpers. They emit only the error's
 * class name, a truncated message, and a truncated stack.
 *
 * Rationale: the application must remain diagnosable in production without
 * ever exposing sensitive content (logging invariants in the SRS / threat
 * model). Stack traces contain code locations, not user data. Error messages
 * in this codebase are fixed strings or Telegram API descriptions, never user
 * content. If a future change ever throws with user-controlled text inside the
 * message, replace this helper with a stricter allow-list before deploying.
 */

const MAX_MESSAGE_LENGTH = 500;
const MAX_STACK_LENGTH = 2000;

export interface SafeErrorLog {
  errorName: string;
  errorMessage: string;
  errorStack?: string;
}

export function serializeSafeError(err: unknown): SafeErrorLog {
  if (err instanceof Error) {
    const name = err.name || err.constructor.name || 'Error';
    const message = truncate(sanitize(err.message), MAX_MESSAGE_LENGTH);
    const stack =
      typeof err.stack === 'string' ? truncate(sanitize(err.stack), MAX_STACK_LENGTH) : undefined;

    // exactOptionalPropertyTypes: omit errorStack entirely when absent.
    return stack
      ? { errorName: name, errorMessage: message, errorStack: stack }
      : { errorName: name, errorMessage: message };
  }

  // A non-Error value was thrown (string, object, etc.).
  // Do NOT stringify arbitrary objects: they could carry sensitive payloads.
  return {
    errorName: 'NonErrorThrown',
    errorMessage: 'A non-Error value was thrown; details withheld for privacy.',
  };
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max)}…[truncated]`;
}

function sanitize(value: string): string {
  // Collapse control characters so one log line stays parseable.
  return value.replace(/[\u0000-\u001F\u007F]/g, ' ');
}
