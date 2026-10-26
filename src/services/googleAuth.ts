import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Reuse or initialize the Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const SHEETS_READONLY_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';

export const provider = new GoogleAuthProvider();
// Strictly read-only scope for Google Sheets
provider.addScope(SHEETS_READONLY_SCOPE);

const REMEMBERED_EMAIL_KEY = 'php_repairhub_connected_google_email_v1';
const PERSISTED_TOKEN_KEY = 'php_repairhub_google_oauth_token_v1';
const PERSISTED_TOKEN_EXP_KEY = 'php_repairhub_google_oauth_exp_v1';

let inMemoryAccessToken: string | null = null;
let tokenExpiresAt: number | null = null;
let isSigningIn = false;

function restorePersistedToken(): { token: string; expiresAt: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const savedToken = localStorage.getItem(PERSISTED_TOKEN_KEY);
    const savedExp = Number(localStorage.getItem(PERSISTED_TOKEN_EXP_KEY));
    if (savedToken && savedExp && Date.now() < savedExp) {
      inMemoryAccessToken = savedToken;
      tokenExpiresAt = savedExp;
      return { token: savedToken, expiresAt: savedExp };
    }
    if (savedToken || savedExp) {
      localStorage.removeItem(PERSISTED_TOKEN_KEY);
      localStorage.removeItem(PERSISTED_TOKEN_EXP_KEY);
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

// Hydrate valid token from localStorage on module initialization so page reloads keep live API access without popups
restorePersistedToken();

// Listen for cross-tab token updates
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === PERSISTED_TOKEN_KEY || e.key === PERSISTED_TOKEN_EXP_KEY) {
      restorePersistedToken();
    }
  });
}

function getRememberedGoogleEmail(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(REMEMBERED_EMAIL_KEY);
  } catch {
    return null;
  }
}

function setRememberedGoogleEmail(email: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (email) {
      localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim().toLowerCase());
    } else {
      localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    }
  } catch {
    // ignore
  }
}

function setPersistedToken(token: string, expiresInSeconds = 3300): void {
  inMemoryAccessToken = token;
  // Safe buffer: 55 minutes (3300s) for a 3600s token
  const safeSeconds = Math.max(300, expiresInSeconds - 300);
  tokenExpiresAt = Date.now() + safeSeconds * 1000;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PERSISTED_TOKEN_KEY, token);
      localStorage.setItem(PERSISTED_TOKEN_EXP_KEY, String(tokenExpiresAt));
    } catch {
      // ignore storage errors
    }
  }
}

/**
 * Silently check and restore any valid non-expired OAuth token from memory or localStorage
 * without ever opening a browser popup window.
 */
export const silentRefreshAccessToken = async (_emailHint?: string): Promise<string | null> => {
  if (typeof window === 'undefined') return null;
  if (isSigningIn) return inMemoryAccessToken;

  if (inMemoryAccessToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
    return inMemoryAccessToken;
  }

  const restored = restorePersistedToken();
  if (restored) {
    return restored.token;
  }

  return null;
};

/**
 * Check if a valid, unexpired Google Sheets token is currently available
 */
export const hasValidToken = (): boolean => {
  if (inMemoryAccessToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
    return true;
  }
  const restored = restorePersistedToken();
  return !!restored;
};

/**
 * Invalidate and discard the Google Sheets access token immediately
 */
export const invalidateToken = (): void => {
  inMemoryAccessToken = null;
  tokenExpiresAt = null;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(PERSISTED_TOKEN_KEY);
      localStorage.removeItem(PERSISTED_TOKEN_EXP_KEY);
    } catch {
      // ignore
    }
  }
};

/**
 * Auth state listener:
 * Restores the Firebase Auth user session and any unexpired OAuth token from storage
 * without triggering any browser popup window.
 */
export const initAuth = (
  onAuthSuccess?: (user: User | null, token: string) => void,
  onAuthExpiredOrMissing?: (user: User | null) => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user?.email) {
      setRememberedGoogleEmail(user.email);
    }

    const token = await silentRefreshAccessToken(user?.email || getRememberedGoogleEmail() || undefined);
    if (token) {
      if (onAuthSuccess) onAuthSuccess(user, token);
      return;
    }

    if (onAuthExpiredOrMissing) onAuthExpiredOrMissing(user);
  });
};

/**
 * Obtain a fresh Google Sheets OAuth access token via explicit user-initiated click popup
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google sign-in did not return a valid Sheets access token.');
    }

    if (result.user?.email) {
      setRememberedGoogleEmail(result.user.email);
    }

    setPersistedToken(credential.accessToken, 3600);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    console.error('Google Sign-In failed');
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Retrieve the current token if valid and unexpired (never opens a popup)
 */
export const getAccessToken = async (allowSilentRefresh = true): Promise<string | null> => {
  if (inMemoryAccessToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
    return inMemoryAccessToken;
  }

  if (allowSilentRefresh) {
    const refreshed = await silentRefreshAccessToken();
    if (refreshed) return refreshed;
  }

  invalidateToken();
  return null;
};

/**
 * Sign out and clear tokens
 */
export const logout = async (): Promise<void> => {
  invalidateToken();
  setRememberedGoogleEmail(null);
  await signOut(auth);
};
