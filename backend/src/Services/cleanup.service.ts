import fs from "fs";
import path from "path";
import { promisify } from "util";

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);

export class CleanupService {
  private static instance: CleanupService;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): CleanupService {
    if (!this.instance) {
      this.instance = new CleanupService();
    }
    return this.instance;
  }

  /**
   * Start automatic cleanup service
   */
  startAutoCleanup(intervalHours: number = 6): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Run cleanup immediately
    this.runCleanup();

    // Set interval for regular cleanup
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, intervalHours * 60 * 60 * 1000);

    console.log(`Cleanup service started with ${intervalHours}h interval`);
  }

  /**
   * Stop automatic cleanup service
   */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('Cleanup service stopped');
    }
  }

  /**
   * Run cleanup manually
   */
  async runCleanup(): Promise<void> {
    try {
      console.log('Starting cleanup process...');

      // Cleanup orphaned upload files (older than 48 hours)
      await this.cleanupOrphanedFiles();

      console.log('Cleanup process completed');
    } catch (error) {
      console.error('Cleanup process failed:', error);
    }
  }

  /**
   * Clean up orphaned files in upload directories
   */
  private async cleanupOrphanedFiles(): Promise<void> {
    const uploadDirs = [
      path.join(process.cwd(), 'uploads', 'videos'),
      path.join(process.cwd(), 'uploads', 'images')
    ];

    const cutoffTime = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago

    for (const dir of uploadDirs) {
      try {
        const files = await readdir(dir);
        let deletedCount = 0;

        for (const file of files) {
          try {
            const filePath = path.join(dir, file);
            const stats = await stat(filePath);

            // Delete files older than cutoff time
            if (stats.mtime < cutoffTime) {
              await unlink(filePath);
              deletedCount++;
            }
          } catch (error) {
            console.warn(`Failed to process file ${file}:`, error);
          }
        }

        if (deletedCount > 0) {
          console.log(`Cleaned up ${deletedCount} orphaned files from ${dir}`);
        }
      } catch (error) {
        console.warn(`Failed to cleanup directory ${dir}:`, error);
      }
    }
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats(): Promise<{
    totalSessions: number;
    totalChunkFiles: number;
    totalUploadFiles: number;
    diskUsage: string;
  }> {
    try {
      const uploadDirs = [
        path.join(process.cwd(), 'uploads', 'videos'),
        path.join(process.cwd(), 'uploads', 'images'),
        path.join(process.cwd(), 'uploads', 'chunks')
      ];

      let totalFiles = 0;
      let totalSize = 0;
      let totalSessions = 0;

      // Count chunk sessions
      try {
        const chunksDir = path.join(process.cwd(), 'uploads', 'chunks');
        const sessions = await readdir(chunksDir);
        totalSessions = sessions.length;
      } catch (error) {
        // Directory might not exist
      }

      // Count files and calculate total size
      for (const dir of uploadDirs) {
        try {
          const files = await readdir(dir);

          for (const file of files) {
            try {
              const filePath = path.join(dir, file);
              const stats = await stat(filePath);

              if (stats.isFile()) {
                totalFiles++;
                totalSize += stats.size;
              }
            } catch (error) {
              // Skip files that can't be accessed
            }
          }
        } catch (error) {
          // Directory might not exist
        }
      }

      const diskUsage = this.formatBytes(totalSize);

      return {
        totalSessions,
        totalChunkFiles: totalFiles,
        totalUploadFiles: totalFiles,
        diskUsage
      };
    } catch (error) {
      console.error('Failed to get cleanup stats:', error);
      return {
        totalSessions: 0,
        totalChunkFiles: 0,
        totalUploadFiles: 0,
        diskUsage: '0 B'
      };
    }
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default CleanupService;