import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, getDoc } from "firebase/firestore";
import { db } from "../firebase";
export interface Job {
  id?: string;
  // Add your job fields here
  [key: string]: any;
}
export const jobService = {
  async createJob(data: any): Promise<string> {
    const docRef = await addDoc(collection(db, 'jobs'), {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return docRef.id;
  },

  async getJobs(): Promise<any[]> {
    const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getJobById(id: string): Promise<any> {
    const docRef = doc(db, 'jobs', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error('Job not found');
    return { id: docSnap.id, ...docSnap.data() };
  },

  async updateJob(id: string, data: any): Promise<void> {
    const docRef = doc(db, 'jobs', id);
    await updateDoc(docRef, { ...data, updatedAt: new Date() });
  },

  async deleteJob(id: string): Promise<void> {
    const docRef = doc(db, 'jobs', id);
    await deleteDoc(docRef);
  }
};