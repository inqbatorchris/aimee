import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  onAuthStateChanged,
  sendPasswordResetEmail,
  type User as FirebaseUser
} from "firebase/auth";

// This is a placeholder configuration
// In production, replace these with actual Firebase project credentials
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project"}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project"}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "demo-app-id",
};

// Check if we're in development mode (Vite sets NODE_ENV)
const isDevelopment = import.meta.env.MODE === 'development';

// Mock Firebase auth for development when API keys aren't available
class MockAuth {
  private currentUser: FirebaseUser | null = null;
  private listeners: ((user: FirebaseUser | null) => void)[] = [];

  constructor() {
    // Initialize with null user
    this.currentUser = null;
  }

  async signInWithEmailAndPassword(email: string, password: string) {
    // Basic validation
    if (!email || !password) {
      throw new Error("Email and password required");
    }
    if (password.length < 6) {
      throw new Error("Password should be at least 6 characters");
    }

    // Create a mock user
    this.currentUser = {
      uid: `mock-uid-${email.replace('@', '-at-')}`,
      email,
      displayName: email.split('@')[0],
      emailVerified: true,
      isAnonymous: false,
      metadata: {},
      providerData: [],
      refreshToken: 'mock-refresh-token',
      tenantId: null,
      delete: async () => Promise.resolve(),
      getIdToken: async () => 'mock-id-token',
      getIdTokenResult: async () => ({
        token: 'mock-id-token',
        signInProvider: 'password',
        expirationTime: new Date(Date.now() + 3600000).toISOString(),
        issuedAtTime: new Date().toISOString(),
        authTime: new Date().toISOString(),
        claims: {}
      }),
      reload: async () => Promise.resolve(),
      toJSON: () => ({}),
      phoneNumber: null,
      photoURL: null,
      providerId: 'password',
    };

    // Notify listeners
    this.listeners.forEach(listener => listener(this.currentUser));

    return { user: this.currentUser };
  }

  async createUserWithEmailAndPassword(email: string, password: string) {
    // Same implementation as signInWithEmailAndPassword
    return this.signInWithEmailAndPassword(email, password);
  }

  async signOut() {
    this.currentUser = null;
    this.listeners.forEach(listener => listener(null));
    return Promise.resolve();
  }

  async updateProfile(user: any, profile: { displayName?: string; photoURL?: string; }) {
    if (this.currentUser) {
      if (profile.displayName) {
        this.currentUser.displayName = profile.displayName;
      }
      if (profile.photoURL) {
        this.currentUser.photoURL = profile.photoURL;
      }
    }
    return Promise.resolve();
  }

  async sendPasswordResetEmail(email: string) {
    console.log(`Password reset email sent to ${email}`);
    return Promise.resolve();
  }

  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    this.listeners.push(callback);
    // Immediately call with current state
    callback(this.currentUser);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }
}

// Initialize Firebase
let app;
let auth;

try {
  // Check if Firebase API key is provided
  const hasFirebaseKeys = !!import.meta.env.VITE_FIREBASE_API_KEY && 
                          !!import.meta.env.VITE_FIREBASE_PROJECT_ID && 
                          !!import.meta.env.VITE_FIREBASE_APP_ID;

  if (isDevelopment && !hasFirebaseKeys) {
    console.warn('Firebase credentials not found, using mock authentication for development');
    auth = new MockAuth();
  } else {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  }
} catch (error) {
  console.error('Error initializing Firebase:', error);
  console.warn('Falling back to mock authentication');
  auth = new MockAuth();
}

// Authentication helpers
export const loginWithEmailAndPassword = async (email: string, password: string) => {
  return signInWithEmailAndPassword(auth as any, email, password);
};

export const registerWithEmailAndPassword = async (email: string, password: string, displayName: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth as any, email, password);
  
  // Update the user's display name
  if (userCredential.user) {
    await updateProfile(userCredential.user, { displayName });
  }
  
  return userCredential;
};

export const resetPassword = async (email: string) => {
  return sendPasswordResetEmail(auth as any, email);
};

export const logoutUser = async () => {
  return firebaseSignOut(auth as any);
};

export { auth, onAuthStateChanged };