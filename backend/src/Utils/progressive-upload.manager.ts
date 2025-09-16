import fs from "fs";
import path from "path";
import { promisify } from "util";
import crypto from "crypto";

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);

interface ProgressiveUploadSession {
  sessionId: string;
  uploadId: string;
  totalChunks: number;
  chunkSize: number;
  totalSize: number;
  uploadedChunks: Set<number>;
  chunkHashes: Map<number, string>;
  startTime: Date;
  lastActivity: Date;
  isComplete: boolean;
  resumeToken: string;
}

interface ChunkInfo {
  chunkIndex: number;
  chunkSize: number;
  chunkHash: string;
  uploaded: boolean;
  filePath?: string;
}

interface UploadProgress {
  sessionId: string;
  uploadId: string;
  totalChunks: number;
  uploadedChunks: number;
  totalSize: number;
  uploadedSize: number;
  percentComplete: number;
  isComplete: boolean;
  missingChunks: number[];
  resumeToken: string;
  estimatedTimeRemaining?: number;
}

export class ProgressiveUploadManager {
  private static instance: ProgressiveUploadManager;
  private sessions = new Map<string, ProgressiveUploadSession>();
  private baseDir = path.join(process.cwd(), 'uploads', 'progressive');
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeStorage();
    this.startCleanupTimer();
  }

  static getInstance(): ProgressiveUploadManager {
    if (!this.instance) {
      this.instance = new ProgressiveUploadManager();
    }
    return this.instance;
  }

  private async initializeStorage(): Promise<void> {
    try {
      await mkdir(this.baseDir, { recursive: true });
    } catch (error) {
      console.error('Failed to initialize progressive upload storage:', error);
    }
  }

  /**
   * Initialize a new progressive upload session
   */
  async initializeUpload(
    sessionId: string,
    totalSize: number,
    chunkSize: number = 1024 * 1024 // 1MB default
  ): Promise<{ uploadId: string; resumeToken: string; totalChunks: number }> {
    const uploadId = this.generateUploadId();
    const totalChunks = Math.ceil(totalSize / chunkSize);
    const resumeToken = this.generateResumeToken(sessionId, uploadId);

    const session: ProgressiveUploadSession = {
      sessionId,
      uploadId,
      totalChunks,
      chunkSize,
      totalSize,
      uploadedChunks: new Set(),
      chunkHashes: new Map(),
      startTime: new Date(),
      lastActivity: new Date(),
      isComplete: false,
      resumeToken
    };

    this.sessions.set(uploadId, session);
    await this.persistSession(session);

    console.log(`Progressive upload initialized: ${uploadId} (${totalChunks} chunks, ${this.formatBytes(totalSize)})`);

    return { uploadId, resumeToken, totalChunks };
  }

  /**
   * Upload a single chunk
   */
  async uploadChunk(
    uploadId: string,
    chunkIndex: number,
    chunkData: Buffer,
    chunkHash?: string
  ): Promise<{
    success: boolean;
    chunkIndex: number;
    isComplete: boolean;
    progress: UploadProgress;
  }> {
    const session = this.sessions.get(uploadId);
    if (!session) {
      throw new Error(`Upload session ${uploadId} not found`);
    }

    // Validate chunk hash if provided
    if (chunkHash) {
      const calculatedHash = crypto.createHash('md5').update(chunkData).digest('hex');
      if (calculatedHash !== chunkHash) {
        throw new Error(`Chunk ${chunkIndex} hash mismatch`);
      }
    }

    // Store chunk to disk
    const chunkDir = path.join(this.baseDir, uploadId);
    await mkdir(chunkDir, { recursive: true });

    const chunkPath = path.join(chunkDir, `chunk_${chunkIndex.toString().padStart(6, '0')}`);
    await writeFile(chunkPath, chunkData);

    // Update session
    session.uploadedChunks.add(chunkIndex);
    if (chunkHash) {
      session.chunkHashes.set(chunkIndex, chunkHash);
    }
    session.lastActivity = new Date();
    session.isComplete = session.uploadedChunks.size === session.totalChunks;

    await this.persistSession(session);

    const progress = this.getProgress(uploadId);

    console.log(`Chunk ${chunkIndex}/${session.totalChunks} uploaded for session ${session.sessionId} (${progress.percentComplete.toFixed(1)}%)`);

    return {
      success: true,
      chunkIndex,
      isComplete: session.isComplete,
      progress
    };
  }

  /**
   * Get upload progress
   */
  getProgress(uploadId: string): UploadProgress {
    const session = this.sessions.get(uploadId);
    if (!session) {
      throw new Error(`Upload session ${uploadId} not found`);
    }

    const uploadedChunks = session.uploadedChunks.size;
    const uploadedSize = uploadedChunks * session.chunkSize;
    const percentComplete = (uploadedChunks / session.totalChunks) * 100;

    const missingChunks: number[] = [];
    for (let i = 0; i < session.totalChunks; i++) {
      if (!session.uploadedChunks.has(i)) {
        missingChunks.push(i);
      }
    }

    // Calculate estimated time remaining
    let estimatedTimeRemaining: number | undefined;
    const elapsedTime = Date.now() - session.startTime.getTime();
    if (uploadedChunks > 0 && !session.isComplete) {
      const avgTimePerChunk = elapsedTime / uploadedChunks;
      const remainingChunks = session.totalChunks - uploadedChunks;
      estimatedTimeRemaining = Math.round((remainingChunks * avgTimePerChunk) / 1000); // seconds
    }

    return {
      sessionId: session.sessionId,
      uploadId,
      totalChunks: session.totalChunks,
      uploadedChunks,
      totalSize: session.totalSize,
      uploadedSize,
      percentComplete,
      isComplete: session.isComplete,
      missingChunks,
      resumeToken: session.resumeToken,
      estimatedTimeRemaining
    };
  }

  /**
   * Resume an upload session
   */
  async resumeUpload(resumeToken: string): Promise<UploadProgress | null> {
    // Find session by resume token
    const session = Array.from(this.sessions.values()).find(s => s.resumeToken === resumeToken);

    if (!session) {
      // Try to load from disk
      return await this.loadSessionFromDisk(resumeToken);
    }

    return this.getProgress(session.uploadId);
  }

  /**
   * Get missing chunks for resumable upload
   */
  getMissingChunks(uploadId: string): number[] {
    const session = this.sessions.get(uploadId);
    if (!session) {
      throw new Error(`Upload session ${uploadId} not found`);
    }

    const missing: number[] = [];
    for (let i = 0; i < session.totalChunks; i++) {
      if (!session.uploadedChunks.has(i)) {
        missing.push(i);
      }
    }

    return missing;
  }

  /**
   * Finalize upload and merge chunks
   */
  async finalizeUpload(uploadId: string): Promise<Buffer | null> {
    const session = this.sessions.get(uploadId);
    if (!session) {
      throw new Error(`Upload session ${uploadId} not found`);
    }

    if (!session.isComplete) {
      throw new Error(`Upload ${uploadId} is not complete`);
    }

    try {
      // Read and merge all chunks
      const chunkDir = path.join(this.baseDir, uploadId);
      const chunks: Buffer[] = [];

      for (let i = 0; i < session.totalChunks; i++) {
        const chunkPath = path.join(chunkDir, `chunk_${i.toString().padStart(6, '0')}`);
        const chunkData = await readFile(chunkPath);
        chunks.push(chunkData);
      }

      const mergedData = Buffer.concat(chunks);

      // Verify total size
      if (mergedData.length !== session.totalSize) {
        throw new Error(`Merged data size mismatch: expected ${session.totalSize}, got ${mergedData.length}`);
      }

      console.log(`Upload ${uploadId} finalized: ${this.formatBytes(mergedData.length)}`);

      return mergedData;
    } catch (error) {
      console.error(`Failed to finalize upload ${uploadId}:`, error);
      throw error;
    }
  }

  /**
   * Clean up upload session
   */
  async cleanupUpload(uploadId: string): Promise<void> {
    const session = this.sessions.get(uploadId);
    if (session) {
      this.sessions.delete(uploadId);
    }

    try {
      // Remove chunk files
      const chunkDir = path.join(this.baseDir, uploadId);
      const sessionFile = path.join(this.baseDir, `${uploadId}.json`);

      // Remove chunks
      for (let i = 0; i < (session?.totalChunks || 1000); i++) {
        try {
          const chunkPath = path.join(chunkDir, `chunk_${i.toString().padStart(6, '0')}`);
          await unlink(chunkPath);
        } catch (error) {
          // Chunk might not exist
        }
      }

      // Remove session file
      try {
        await unlink(sessionFile);
      } catch (error) {
        // Session file might not exist
      }

      // Try to remove empty directory
      try {
        const fs = require('fs');
        fs.rmdir(chunkDir, () => {});
      } catch (error) {
        // Directory might not be empty or might not exist
      }

      console.log(`Cleaned up upload session: ${uploadId}`);
    } catch (error) {
      console.warn(`Failed to cleanup upload ${uploadId}:`, error);
    }
  }

  /**
   * Get all active upload sessions
   */
  getActiveSessions(): UploadProgress[] {
    return Array.from(this.sessions.values()).map(session =>
      this.getProgress(session.uploadId)
    );
  }

  private generateUploadId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private generateResumeToken(sessionId: string, uploadId: string): string {
    const data = `${sessionId}:${uploadId}:${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private async persistSession(session: ProgressiveUploadSession): Promise<void> {
    try {
      const sessionData = {
        ...session,
        uploadedChunks: Array.from(session.uploadedChunks),
        chunkHashes: Array.from(session.chunkHashes.entries())
      };

      const sessionFile = path.join(this.baseDir, `${session.uploadId}.json`);
      await writeFile(sessionFile, JSON.stringify(sessionData, null, 2));
    } catch (error) {
      console.warn(`Failed to persist session ${session.uploadId}:`, error);
    }
  }

  private async loadSessionFromDisk(resumeToken: string): Promise<UploadProgress | null> {
    // This would require scanning all session files - implement if needed
    return null;
  }

  private startCleanupTimer(): void {
    // Clean up old sessions every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldSessions();
    }, 60 * 60 * 1000);
  }

  private async cleanupOldSessions(): Promise<void> {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    for (const [uploadId, session] of this.sessions.entries()) {
      if (session.lastActivity < cutoffTime) {
        await this.cleanupUpload(uploadId);
      }
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default ProgressiveUploadManager;