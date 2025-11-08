import { storage } from '../../storage';
import crypto from 'crypto';

// Encryption helpers
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'dev-key-do-not-use-in-production';
const IV_LENGTH = 16;

function decrypt(text: string): string {
  if (!text) return '';
  
  try {
    const parts = text.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error: any) {
    console.error('Decryption failed:', error?.message || 'Unknown error');
    throw new Error('Token decryption failed');
  }
}

// Firebase Admin SDK types
interface FirebaseApp {
  firestore(): any;
  auth(): any;
  storage(): any;
}

export class FirebaseService {
  private app: FirebaseApp | null = null;
  private organizationId: number;
  private firebaseAdmin: any = null;

  constructor(organizationId: number) {
    this.organizationId = organizationId;
  }

  async initialize(): Promise<void> {
    const integration = await storage.getIntegration(this.organizationId, 'firebase');
    
    if (!integration) {
      throw new Error('Firebase integration not configured');
    }

    if (!integration.credentialsEncrypted) {
      throw new Error('Firebase credentials not configured');
    }

    // Decrypt credentials
    const decryptedData = decrypt(integration.credentialsEncrypted);
    const credentials = JSON.parse(decryptedData);
    
    // Firebase config from credentials
    const firebaseConfig = {
      apiKey: credentials.apiKey,
      authDomain: credentials.authDomain,
      projectId: credentials.projectId,
      storageBucket: credentials.storageBucket,
      messagingSenderId: credentials.messagingSenderId,
      appId: credentials.appId,
      // For admin SDK
      serviceAccount: credentials.serviceAccount,
    };

    // Initialize Firebase Admin SDK if service account is provided
    if (firebaseConfig.serviceAccount) {
      try {
        // Dynamic import to avoid bundling issues
        this.firebaseAdmin = await import('firebase-admin');
        
        // Initialize admin app
        if (!this.firebaseAdmin.apps.length) {
          this.app = this.firebaseAdmin.initializeApp({
            credential: this.firebaseAdmin.credential.cert(firebaseConfig.serviceAccount),
            projectId: firebaseConfig.projectId,
            storageBucket: firebaseConfig.storageBucket,
          });
        } else {
          this.app = this.firebaseAdmin.app();
        }
      } catch (error) {
        console.error('Firebase Admin SDK initialization failed:', error);
        throw new Error('Failed to initialize Firebase Admin SDK');
      }
    } else {
      throw new Error('Firebase service account credentials required for server-side operations');
    }
  }

  private ensureInitialized(): void {
    if (!this.app) {
      throw new Error('Firebase service not initialized. Call initialize() first.');
    }
  }

  // Firestore methods
  async getDocument(collection: string, docId: string) {
    this.ensureInitialized();
    const doc = await this.app!.firestore().collection(collection).doc(docId).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() };
  }

  async getCollection(collection: string, options?: { limit?: number; orderBy?: string; where?: any[] }) {
    this.ensureInitialized();
    let query: any = this.app!.firestore().collection(collection);
    
    if (options?.where) {
      query = query.where(...options.where);
    }
    
    if (options?.orderBy) {
      query = query.orderBy(options.orderBy);
    }
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    const snapshot = await query.get();
    const docs: any[] = [];
    snapshot.forEach((doc: any) => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    
    return docs;
  }

  async createDocument(collection: string, data: any, docId?: string) {
    this.ensureInitialized();
    const collectionRef = this.app!.firestore().collection(collection);
    
    if (docId) {
      await collectionRef.doc(docId).set(data);
      return { id: docId, ...data };
    } else {
      const docRef = await collectionRef.add(data);
      return { id: docRef.id, ...data };
    }
  }

  async updateDocument(collection: string, docId: string, data: any) {
    this.ensureInitialized();
    await this.app!.firestore().collection(collection).doc(docId).update(data);
    return { id: docId, ...data };
  }

  async deleteDocument(collection: string, docId: string) {
    this.ensureInitialized();
    await this.app!.firestore().collection(collection).doc(docId).delete();
    return { success: true };
  }

  // Auth methods
  async getUser(uid: string) {
    this.ensureInitialized();
    try {
      const userRecord = await this.app!.auth().getUser(uid);
      return userRecord;
    } catch (error) {
      return null;
    }
  }

  async getUserByEmail(email: string) {
    this.ensureInitialized();
    try {
      const userRecord = await this.app!.auth().getUserByEmail(email);
      return userRecord;
    } catch (error) {
      return null;
    }
  }

  async createUser(userData: { email: string; password?: string; displayName?: string; phoneNumber?: string }) {
    this.ensureInitialized();
    const userRecord = await this.app!.auth().createUser(userData);
    return userRecord;
  }

  async updateUser(uid: string, userData: any) {
    this.ensureInitialized();
    const userRecord = await this.app!.auth().updateUser(uid, userData);
    return userRecord;
  }

  async deleteUser(uid: string) {
    this.ensureInitialized();
    await this.app!.auth().deleteUser(uid);
    return { success: true };
  }

  async setCustomUserClaims(uid: string, claims: any) {
    this.ensureInitialized();
    await this.app!.auth().setCustomUserClaims(uid, claims);
    return { success: true };
  }

  async verifyIdToken(idToken: string) {
    this.ensureInitialized();
    const decodedToken = await this.app!.auth().verifyIdToken(idToken);
    return decodedToken;
  }

  // Storage methods (if needed)
  async getStorageFile(path: string) {
    this.ensureInitialized();
    const file = this.app!.storage().bucket().file(path);
    const [exists] = await file.exists();
    if (!exists) {
      return null;
    }
    
    const [metadata] = await file.getMetadata();
    return metadata;
  }

  async uploadFile(path: string, data: Buffer | string, contentType?: string) {
    this.ensureInitialized();
    const file = this.app!.storage().bucket().file(path);
    await file.save(data, {
      metadata: {
        contentType: contentType || 'application/octet-stream',
      },
    });
    
    return { path, success: true };
  }

  async deleteFile(path: string) {
    this.ensureInitialized();
    await this.app!.storage().bucket().file(path).delete();
    return { success: true };
  }

  async getSignedUrl(path: string, expiresIn: number = 3600) {
    this.ensureInitialized();
    const [url] = await this.app!.storage().bucket().file(path).getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresIn * 1000,
    });
    
    return url;
  }
}

export default FirebaseService;