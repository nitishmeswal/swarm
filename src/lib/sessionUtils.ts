// TODO: Replace with Express.js backend API

export interface SessionValidationResult {
  isValid: boolean;
  session: any | null;
  user: any | null;
  error?: string;
}

export async function validateSession(): Promise<SessionValidationResult> {
  // TODO: Replace with Express.js backend API
  return {
    isValid: false,
    session: null,
    user: null,
    error: 'Backend disabled'
  };
}

export function isSessionValid(session: any | null): boolean {
  // TODO: Replace with Express.js backend API
  return false;
}

export async function getSessionInfo(): Promise<{ session: any | null; user: any | null }> {
  // TODO: Replace with Express.js backend API
  return { session: null, user: null };
}

export async function clearSession(): Promise<void> {
  // TODO: Replace with Express.js backend API
}

export function createDebouncedSessionValidator(delay: number = 100) {
  return async (): Promise<SessionValidationResult> => {
    return validateSession();
  };
}
