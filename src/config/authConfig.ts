// ============================================================
// CitySync — Government Demo Authentication Configuration
// ============================================================

/**
 * Fictional demo credentials for hackathon evaluation.
 * 
 * SECURITY DISCLAIMER:
 * This is a frontend-only hackathon demonstration. In a production
 * deployment, authentication and role authorization must be enforced
 * securely server-side with HTTPS, secure HTTP-only session cookies or JWTs,
 * and a verified identity provider. Never use frontend credentials for
 * sensitive government services.
 */
export const DEMO_GOV_CREDENTIALS = {
  username: 'gcc_admin',
  password: 'citysync2026',
  displayName: 'Greater Chennai Corporation Admin',
  department: 'GCC Works & Infrastructure Department',
  role: 'government' as const,
};

export const AUTH_STORAGE_KEY = 'citysync_demo_auth';

export interface AuthSession {
  isAuthenticated: boolean;
  username: string;
  displayName: string;
  department: string;
  role: 'government';
  loginTime: string;
}

export function getStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.isAuthenticated && parsed.role === 'government') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // LocalStorage quota or access issue
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function validateGovCredentials(username: string, password: string): { success: boolean; errorKey?: string } {
  const trimmedUser = username.trim();
  const trimmedPass = password.trim();

  if (!trimmedUser || !trimmedPass) {
    return { success: false, errorKey: 'auth.errorRequired' };
  }

  if (
    trimmedUser.toLowerCase() === DEMO_GOV_CREDENTIALS.username.toLowerCase() &&
    trimmedPass === DEMO_GOV_CREDENTIALS.password
  ) {
    return { success: true };
  }

  return { success: false, errorKey: 'auth.errorInvalid' };
}
