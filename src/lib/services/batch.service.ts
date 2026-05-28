import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp,
  getDoc
} from "firebase/firestore";
import { db } from "../firebase";

export interface Batch {
  id?: string;
  batchNumber: string;
  jobId: string;
  quantity: number;
  status: 'pending' | 'running' | 'completed' | 'rejected';
  startTime?: Date;
  endTime?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  notes?: string;
}

export const batchService = {
  async createBatch(data: Omit<Batch, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date();
    const docRef = await addDoc(collection(db, 'batches'), {
      ...data,
      createdAt: now,
      updatedAt: now
    });
    return docRef.id;
  },

  async getBatchesByJob(jobId: string): Promise<Batch[]> {
    const q = query(
      collection(db, 'batches'),
      where('jobId', '==', jobId),
      orderBy('batchNumber', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Batch));
  },

  async updateBatch(id: string, data: Partial<Batch>): Promise<void> {
    const docRef = doc(db, 'batches', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date()
    });
  },

  async deleteBatch(id: string): Promise<void> {
    const docRef = doc(db, 'batches', id);
    await deleteDoc(docRef);
  },

  async getBatchById(id: string): Promise<Batch | null> {
    const docRef = doc(db, 'batches', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Batch : null;
  }
};