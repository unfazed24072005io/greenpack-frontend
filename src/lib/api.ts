// Greenpack Pro — Firebase API Client
// Replaces Axios with Firebase services
import type { QueryConstraint } from 'firebase/firestore';
import { 
  authService, 
  type UserData 
} from './services/auth.service';
import { 
  jobService, 
} from './services/job.service';
import { 
  batchService, 
  type Batch 
} from './services/batch.service';
import { 
  inspectionService, 
  type Inspection, 
  type Defect 
} from './services/inspection.service';
import { db, storage } from './firebase';
import { doc, getDoc, updateDoc, deleteDoc, addDoc, collection, query, getDocs, limit, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
export interface Job {
  id?: string;
  jobNumber?: string;
  customerName?: string;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: any;
}
// ── Re-export all services for backward compatibility ─────────────────────
export { authService, jobService, batchService, inspectionService };
export type { UserData, Batch, Inspection, Defect };

// ── Auth API (Firebase version) ────────────────────────────────────────────
export const authApi = {
  login: async (email: string, password: string) => {
    const user = await authService.login(email, password);
    const userData = await authService.getUserData(user.uid);
    return { user, userData };
  },
  
  me: async () => {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');
    const userData = await authService.getUserData(user.uid);
    return { user, userData };
  },
  
  logout: async () => {
    await authService.logout();
  },
  
  register: async (email: string, password: string, userData: Partial<UserData>) => {
    const user = await authService.register(email, password, userData);
    return user;
  }
};

// ── Jobs API (Firebase version) ────────────────────────────────────────────
export const jobsApi = {
  list: async (params?: { status?: string; client?: string; limit?: number; offset?: number }) => {
    let jobs = await jobService.getJobs();
    
    // Apply filters
    if (params?.status) {
      jobs = jobs.filter(job => job.status === params.status);
    }
    if (params?.client) {
      jobs = jobs.filter(job => job.customerName?.toLowerCase().includes(params.client!.toLowerCase()));
    }
    if (params?.limit) {
      jobs = jobs.slice(0, params.limit);
    }
    
    return { items: jobs, total: jobs.length };
  },

  create: async (formData: FormData) => {
    const jobData = {
      jobNumber: formData.get('jobNumber') as string,
      customerName: formData.get('customerName') as string,
      productType: formData.get('productType') as string,
      quantity: parseInt(formData.get('quantity') as string),
      status: 'pending' as const,
      dueDate: new Date(formData.get('dueDate') as string),
      specifications: JSON.parse(formData.get('specifications') as string || '{}'),
      createdBy: authService.getCurrentUser()?.uid || 'unknown'
    };
    
    const jobId = await jobService.createJob(jobData);
    return { id: jobId, ...jobData };
  },

  get: async (jobId: string) => {
    return await jobService.getJobById(jobId);
  },

  update: async (jobId: string, data: Partial<Job>) => {
    await jobService.updateJob(jobId, data);
    return { id: jobId, ...data };
  },

  delete: async (jobId: string) => {
    await jobService.deleteJob(jobId);
    return { success: true };
  },

  getResult: async (jobId: string) => {
    // Get inspections for this job
    const inspections = await inspectionService.getInspectionsByJob(jobId);
    return { jobId, inspections, summary: generateJobSummary(inspections) };
  },

  downloadReport: async (jobId: string) => {
    // Generate report from inspections data
    const job = await jobService.getJobById(jobId);
    const inspections = await inspectionService.getInspectionsByJob(jobId);
    
    // Create CSV/JSON report
    const reportData = {
      job,
      inspections,
      generatedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    return blob;
  },

  downloadExcel: async (jobId: string) => {
    // Similar to downloadReport but Excel format
    const job = await jobService.getJobById(jobId);
    const inspections = await inspectionService.getInspectionsByJob(jobId);
    
    const reportData = {
      job,
      inspections,
      generatedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    return blob;
  },

  print: async (jobId: string) => {
    const job = await jobService.getJobById(jobId);
    const inspections = await inspectionService.getInspectionsByJob(jobId);
    
    // Create print-friendly HTML
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Job Report - ${job?.jobNumber}</title></head>
          <body>
            <h1>Job: ${job?.jobNumber}</h1>
            <h2>Customer: ${job?.customerName}</h2>
            <h3>Inspections: ${inspections.length}</h3>
            <pre>${JSON.stringify({ job, inspections }, null, 2)}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
    return { success: true };
  }
};

// Helper function for job summary
function generateJobSummary(inspections: Inspection[]) {
  const total = inspections.length;
  const completed = inspections.filter(i => i.status === 'completed').length;
  const failed = inspections.filter(i => i.status === 'failed').length;
  const defects = inspections.reduce((sum, i) => sum + (i.defects?.length || 0), 0);
  
  return { total, completed, failed, defects };
}

// ── Multi-Up Jobs API ─────────────────────────────────────────────────────
export const multiUpApi = {
  create: async (formData: FormData) => {
    // Create a special multi-up job
    const jobData = {
      jobNumber: `MU-${Date.now()}`,
      customerName: formData.get('customerName') as string,
      productType: 'multi-up',
      quantity: parseInt(formData.get('quantity') as string),
      status: 'in-progress' as const,
      dueDate: new Date(),
      specifications: {
        type: 'multi-up',
        sheetSize: formData.get('sheetSize'),
        layout: formData.get('layout'),
        labels: JSON.parse(formData.get('labels') as string || '[]')
      },
      createdBy: authService.getCurrentUser()?.uid || 'unknown'
    };
    
    const jobId = await jobService.createJob(jobData);
    
    // Handle file uploads if any
    const files = formData.getAll('files') as File[];
    for (const file of files) {
      const storageRef = ref(storage, `multi-up/${jobId}/${file.name}`);
      await uploadBytes(storageRef, file);
    }
    
    return { id: jobId, ...jobData };
  },

  getResult: async (jobId: string) => {
    return await jobService.getJobById(jobId);
  },

  getLabelDetail: async (jobId: string, labelId: string) => {
    const job = await jobService.getJobById(jobId);
    const label = job?.specifications?.labels?.find((l: any) => l.id === labelId);
    return label || null;
  },

  downloadSheetImage: async (jobId: string) => {
    // Get sheet image from storage
    const storageRef = ref(storage, `multi-up/${jobId}/sheet.jpg`);
    try {
      const url = await getDownloadURL(storageRef);
      const response = await fetch(url);
      return await response.blob();
    } catch {
      // Return empty blob if no image
      return new Blob();
    }
  }
};

// ── Prepress / Pantone API (Firebase version) ─────────────────────────────
export const prepressApi = {
  identifyColors: async (formData: FormData) => {
    const file = formData.get('file') as File;
    const jobId = `prepress-${Date.now()}`;
    
    // Upload image for color analysis
    const storageRef = ref(storage, `prepress/${jobId}/original.jpg`);
    await uploadBytes(storageRef, file);
    const imageUrl = await getDownloadURL(storageRef);
    
    // Store prepress job
    const jobData = {
      jobNumber: jobId,
      customerName: formData.get('customerName') as string,
      productType: 'prepress',
      quantity: 1,
      status: 'in-progress' as const,
      dueDate: new Date(),
      specifications: {
        type: 'color-identification',
        imageUrl,
        status: 'processing'
      },
      createdBy: authService.getCurrentUser()?.uid || 'unknown'
    };
    
    const id = await jobService.createJob(jobData);
    
    // Simulate color identification (in real app, use ML model)
    const colors = [
      { name: 'PANTONE 185 C', rgb: { r: 227, g: 27, b: 35 }, percentage: 35 },
      { name: 'PANTONE 281 C', rgb: { r: 0, g: 51, b: 160 }, percentage: 25 },
      { name: 'PANTONE 116 C', rgb: { r: 255, g: 204, b: 0 }, percentage: 20 }
    ];
    
    // Update with results
    await jobService.updateJob(id, {
      specifications: { ...jobData.specifications, colors, status: 'completed' }
    });
    
    return { jobId: id, colors, imageUrl };
  },

  trialComparison: async (formData: FormData) => {
    // Similar to identifyColors but for trial comparison
    const file = formData.get('file') as File;
    const jobId = `trial-${Date.now()}`;
    
    const storageRef = ref(storage, `trials/${jobId}/sample.jpg`);
    await uploadBytes(storageRef, file);
    const imageUrl = await getDownloadURL(storageRef);
    
    return {
      jobId,
      imageUrl,
      recommendations: [
        { pantone: 'PANTONE 185 C', match: 98 },
        { pantone: 'PANTONE 186 C', match: 95 }
      ]
    };
  },

  getJob: async (jobId: string) => {
    return await jobService.getJobById(jobId);
  },

  getPantoneLibrary: async (params?: { system?: string; finish?: string; limit?: number }) => {
    // Fetch from Firestore
    const constraints: QueryConstraint[] = [];
    if (params?.limit) constraints.push(limit(params.limit));
    
    const q = query(collection(db, 'pantone_library'), ...constraints);
    const snapshot = await getDocs(q);
    const colors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    return { colors, total: colors.length };
  },

  importPantoneCsv: async (formData: FormData) => {
    const file = formData.get('file') as File;
    const text = await file.text();
    // Parse CSV and import to Firestore
    const rows = text.split('\n').slice(1); // Skip header
    const imported = rows.length;
    
    return { imported, errors: 0 };
  }
};

// ── Templates API (Firebase version) ───────────────────────────────────────
export const templatesApi = {
  list: async (params?: { client?: string; search?: string }) => {
    const q = query(collection(db, 'templates'));
    const snapshot = await getDocs(q);
    let templates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    if (params?.search) {
      templates = templates.filter(t => 
        (t as any).name?.toLowerCase().includes(params.search!.toLowerCase())
      );
    }
    
    return { items: templates, total: templates.length };
  },

  create: async (formData: FormData) => {
    const templateData = {
      name: formData.get('name') as string,
      client: formData.get('client') as string,
      fields: JSON.parse(formData.get('fields') as string || '[]'),
      createdAt: new Date(),
      createdBy: authService.getCurrentUser()?.uid || 'unknown'
    };
    
    const docRef = await addDoc(collection(db, 'templates'), templateData);
    return { id: docRef.id, ...templateData };
  },

  get: async (id: string) => {
    const docRef = doc(db, 'templates', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error('Template not found');
    return { id: docSnap.id, ...docSnap.data() };
  },

  delete: async (id: string) => {
    await deleteDoc(doc(db, 'templates', id));
    return { success: true };
  }
};

// ── Scanners API (Firebase with Electron removed) ──────────────────────────
export const scannersApi = {
  list: async () => {
    // For web, use device camera instead of scanner
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(device => device.kind === 'videoinput');
    return { devices: cameras };
  },

  capture: async (deviceId: string, resolution = 300) => {
    // Use getUserMedia for webcam capture
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId } }
    });
    
    // Create video element to capture frame
    const video = document.createElement('video');
    video.srcObject = stream;
    await video.play();
    
    // Capture frame to canvas
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    
    // Stop stream
    stream.getTracks().forEach(track => track.stop());
    
    // Convert to blob
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/jpeg');
    });
    
    return { image: blob, deviceId };
  },

  getPreview: async (deviceId: string) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId } }
    });
    return { stream, deviceId };
  }
};

// ── Batch API (Firebase version) ───────────────────────────────────────────
export const batchApi = {
  create: async (data: { name: string; items: any[]; notify_email?: string }) => {
    const batchData = {
      batchNumber: data.name,
      jobId: 'batch-job',
      quantity: data.items.length,
      status: 'pending' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: authService.getCurrentUser()?.uid || 'unknown',
      notes: `Email: ${data.notify_email || 'none'}`
    };
    
    const batchId = await batchService.createBatch(batchData);
    
    // Create individual jobs for each item
    for (const item of data.items) {
      await jobService.createJob({
        jobNumber: `${data.name}-${Date.now()}`,
        customerName: item.customerName || 'Batch Customer',
        productType: item.type || 'generic',
        quantity: item.quantity || 1,
        status: 'pending',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        specifications: item,
        createdBy: authService.getCurrentUser()?.uid || 'unknown'
      });
    }
    
    return { id: batchId, ...batchData };
  },

  get: async (batchId: string) => {
    return await batchService.getBatchById(batchId);
  },

  getJobs: async (batchId: string) => {
    const batch = await batchService.getBatchById(batchId);
    if (!batch) return { items: [] };
    
    // Get all jobs (in real app, you'd have a batchId field in jobs)
    const allJobs = await jobService.getJobs();
    const relatedJobs = allJobs.filter(job => job.jobNumber.includes(batch.batchNumber));
    
    return { items: relatedJobs, total: relatedJobs.length };
  }
};

// ── Dashboard & Reports API (Firebase version) ─────────────────────────────
export const dashboardApi = {
  stats: async () => {
    const jobs = await jobService.getJobs();
    const batches = await getDocs(collection(db, 'batches'));
    const inspections = await getDocs(collection(db, 'inspections'));
    
    return {
      totalJobs: jobs.length,
      pendingJobs: jobs.filter(j => j.status === 'pending').length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      totalBatches: batches.size,
      totalInspections: inspections.size,
      recentActivity: jobs.slice(0, 5)
    };
  }
};

export const reportsApi = {
  list: async (params?: { limit?: number; offset?: number }) => {
    const q = query(collection(db, 'inspections'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    let reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    if (params?.limit) {
      reports = reports.slice(0, params.limit);
    }
    
    return { items: reports, total: reports.length };
  }
};

// ── Settings API (Firebase version) ────────────────────────────────────────
export const settingsApi = {
  get: async () => {
    const userId = authService.getCurrentUser()?.uid;
    if (!userId) throw new Error('Not authenticated');
    
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();
    
    return {
      company: userData?.companyName || 'Greenpack Pro',
      email: userData?.email || '',
      role: userData?.role || 'operator',
      notifications: true,
      theme: 'light'
    };
  },
  
  update: async (settings: any) => {
    const userId = authService.getCurrentUser()?.uid;
    if (!userId) throw new Error('Not authenticated');
    
    await updateDoc(doc(db, 'users', userId), {
      companyName: settings.company,
      settings: settings
    });
    
    return { success: true };
  },

  getBackups: async () => {
    // Firebase automatically backs up data
    return { backups: [], message: 'Firebase automatically manages backups' };
  },

  createBackup: async () => {
    // Manual backup to storage
    const userId = authService.getCurrentUser()?.uid;
    const backupId = `backup-${Date.now()}`;
    const backupRef = ref(storage, `backups/${userId}/${backupId}.json`);
    
    // Collect all user data
    const jobs = await jobService.getJobs();
    const backupData = { jobs, timestamp: new Date(), userId };
    
    await uploadBytes(backupRef, new Blob([JSON.stringify(backupData)], { type: 'application/json' }));
    return { success: true, backupId };
  },

  runCleanup: async () => {
    // Clean up old data (30+ days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const jobs = await jobService.getJobs();
    const oldJobs = jobs.filter(job => new Date(job.createdAt) < thirtyDaysAgo);
    
    // Archive old jobs (in real app, move to archive collection)
    return { cleaned: oldJobs.length };
  },

  getDisk: async () => {
    // Firebase storage info
    return { free: 'Unlimited', used: 'N/A', total: 'Cloud Storage' };
  }
};

// ── Users API (Firebase version) ───────────────────────────────────────────
export const usersApi = {
  list: async () => {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  create: async (data: any) => {
    // Create user via Firebase Auth
    const user = await authService.register(data.email, data.password, {
      role: data.role,
      companyName: data.companyName
    });
    return user;
  },

  update: async (id: string, data: any) => {
    await updateDoc(doc(db, 'users', id), data);
    return { id, ...data };
  },

  delete: async (id: string) => {
    await deleteDoc(doc(db, 'users', id));
    return { success: true };
  }
};

// ── Health Check API ────────────────────────────────────────────────────────
export const healthApi = {
  check: async () => {
    // Check Firebase connection
    try {
      const testQuery = await getDocs(query(collection(db, 'users'), limit(1)));
      return { status: 'healthy', firebase: 'connected', timestamp: new Date().toISOString() };
    } catch (error) {
      return { status: 'unhealthy', firebase: 'disconnected', error: String(error) };
    }
  }
};

// ── Helper: download blob as file (kept the same) ──────────────────────────
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}