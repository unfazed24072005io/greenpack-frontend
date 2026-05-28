import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

export interface UserData {
  uid: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
  createdAt: Date;
  companyName?: string;
}

export const authService = {
  async login(email: string, password: string): Promise<User> {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  },

  async register(email: string, password: string, userData: Partial<UserData>): Promise<User> {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', result.user.uid), {
      ...userData,
      uid: result.user.uid,
      email,
      createdAt: new Date(),
      role: userData.role || 'operator'
    });
    return result.user;
  },

  async logout(): Promise<void> {
    await signOut(auth);
  },

  getCurrentUser(): User | null {
    return auth.currentUser;
  },

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  },

  async getUserData(uid: string): Promise<UserData | null> {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() as UserData : null;
  }
};