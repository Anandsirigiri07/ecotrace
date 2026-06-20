import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
  AuthError
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useQuery as useTanStackQuery } from '@tanstack/react-query';
import { auth, db, googleProvider } from '../services/firebase';
import { queryClient } from './useQuery';
import { UserProfile } from '../types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // React Query caching layer for user profile Firestore interaction
  const { data: profile = null, refetch: refreshProfile } = useTanStackQuery<UserProfile | null, Error>({
    queryKey: ['profile', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return null;
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      return snap.exists() ? (snap.data() as UserProfile) : null;
    },
    enabled: !!user?.uid,
    staleTime: 1000 * 60 * 15, // 15 mins profile caching
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth, 
      async (firebaseUser) => {
        setLoading(true);
        if (firebaseUser) {
          try {
            // Create/update user profile in Firestore
            await ensureUserProfile(firebaseUser);
            setUser(firebaseUser);
            // Invalidate the cache to ensure we pull fresh profile data
            await queryClient.invalidateQueries({ queryKey: ['profile', firebaseUser.uid] });
          } catch (err: unknown) {
            console.error('Error during auth state change profile sync:', err);
            setError(err instanceof Error ? err.message : String(err));
          }
        } else {
          setUser(null);
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
