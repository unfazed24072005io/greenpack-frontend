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
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";

export interface Inspection {
  id?: string;
  batchId: string;
  jobId: string;
  type: 'prepress' | 'press' | 'final';
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  defects: Defect[];
  images: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  notes?: string;
}

export interface Defect {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  location: { x: number; y: number };
  description: string;
  imageUrl?: string;
}

export const inspectionService = {
  async createInspection(data: Omit<Inspection, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date();
    const docRef = await addDoc(collection(db, 'inspections'), {
      ...data,
      createdAt: now,
      updatedAt: now
    });
    return docRef.id;
  },

  async getInspectionsByBatch(batchId: string): Promise<Inspection[]> {
    const q = query(
      collection(db, 'inspections'),
      where('batchId', '==', batchId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Inspection));
  },

  async getInspectionsByJob(jobId: string): Promise<Inspection[]> {
    const q = query(
      collection(db, 'inspections'),
      where('jobId', '==', jobId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Inspection));
  },

  async updateInspection(id: string, data: Partial<Inspection>): Promise<void> {
    const docRef = doc(db, 'inspections', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date()
    });
  },

  async deleteInspection(id: string): Promise<void> {
    const docRef = doc(db, 'inspections', id);
    await deleteDoc(docRef);
  },

  async uploadInspectionImage(file: File, inspectionId: string): Promise<string> {
    const storageRef = ref(storage, `inspections/${inspectionId}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  },

  async getInspectionById(id: string): Promise<Inspection | null> {
    const docRef = doc(db, 'inspections', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Inspection : null;
  }
};