import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
  AuthError
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { UserProfile } from '../types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async (uid: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth, 
      async (firebaseUser) => {
        setLoading(true);
        if (firebaseUser) {
          try {
            // Create/update user profile in Firestore
            await ensureUserProfile(firebaseUser);
            await fetchProfile(firebaseUser.uid);
            setUser(firebaseUser);
          } catch (err: unknown) {
            console.error('Error during auth state change profile sync:', err);
            setError(err instanceof Error ? err.message : String(err));
          }
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      },
      (err: Error) => {
        console.error('Auth state error:', err);
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      setError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const errorVal = err as AuthError;
      // Handle specific auth errors
      if (errorVal.code === 'auth/popup-blocked') {
        setError('Popup blocked. Please allow popups for this site.');
      } else if (errorVal.code === 'auth/unauthorized-domain') {
        setError('Domain not authorized. Contact support.');
        console.error('Add this domain to Firebase Auth authorized domains:', 
          window.location.hostname);
      } else if (errorVal.code === 'auth/popup-closed-by-user') {
        // User closed popup - not an error
        return;
      } else {
        setError('Sign in failed. Please try again.');
        console.error('Sign in error:', errorVal.code, errorVal.message);
      }
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.uid);
    }
  };

  return { 
    user, 
    profile, 
    loading, 
    error, 
    signIn, 
    signOut, 
    loginWithGoogle: signIn, 
    logout: signOut,
    refreshProfile 
  };
};

async function ensureUserProfile(user: User) {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  
  if (!snap.exists()) {
    // First time login - create profile
    await setDoc(userRef, {
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      country: 'India',
      dietPreference: 'vegetarian',
      joinedAt: serverTimestamp(),
      currentStreak: 0,
      longestStreak: 0,
      lastLogDate: null
    });
  }
}
