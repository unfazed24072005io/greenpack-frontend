// Greenpack Pro - Auth Store (Firebase Version)
import { create } from 'zustand';
import { auth } from '@/lib/firebase';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  
  login: async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    set({ user: result.user });
  },
  
  logout: async () => {
    await signOut(auth);
    set({ user: null });
  },
  
  checkAuth: () => {
    // Set up listener for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      set({ user, loading: false });
    });
    // Return unsubscribe function for cleanup
    return unsubscribe;
  },
}));