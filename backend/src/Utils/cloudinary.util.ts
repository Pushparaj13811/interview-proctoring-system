import cloudinary from "../Config/cloudinary";
import fs from "fs";
import { promisify } from "util";

const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

export interface CloudinaryTransformation {
  [key: string]: unknown;
}

export interface CloudinaryUploadOptions {
  folder?: string;
  publicId?: string;
  resourceType?: 'video' | 'image' | 'raw' | 'auto';
  chunkSize?: number;
  timeout?: number;
  transformation?: CloudinaryTransformation[];
  tags?: string[];
  context?: Record<string, string>;
}

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  resource_type: string;
  format: string;
  bytes: number;
  duration?: number;
  width?: number;
  height?: number;
  created_at: string;
}

export class CloudinaryUtil {
  /**
   * Upload file from buffer to Cloudinary
   */
  static async uploadFromBuffer(
    buffer: Buffer,
    options: CloudinaryUploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    const {
      folder = 'uploads',
      publicId,
      resourceType = 'auto',
      chunkSize = 6000000,
      timeout = 600000,
      transformation,
      tags,
      context
    } = options;

    return new Promise((resolve, reject) => {
      const uploadOptions: Record<string, unknown> = {
        resource_type: resourceType,
        folder,
        chunk_size: chunkSize,
        timeout,
      };

      if (publicId) uploadOptions.public_id = publicId;
      if (transformation) uploadOptions.transformation = transformation;
      if (tags) uploadOptions.tags = tags;
      if (context) uploadOptions.context = context;

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            reject(new Error(`Cloudinary upload failed: ${error.message}`));
          } else if (result?.secure_url) {
            resolve(result as CloudinaryUploadResult);
          } else {
            reject(new Error('Cloudinary upload result is missing secure_url'));
          }
        }
      );

      uploadStream.end(buffer);
    });
  }

  /**
   * Upload file from disk to Cloudinary
   */
  static async uploadFromFile(
    filePath: string,
    options: CloudinaryUploadOptions = {},
    deleteAfterUpload: boolean = false
  ): Promise<CloudinaryUploadResult> {
    try {
      const buffer = await readFile(filePath);
      const result = await this.uploadFromBuffer(buffer, options);

      // Delete file after successful upload if requested
      if (deleteAfterUpload) {
        await unlink(filePath).catch(console.warn);
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to upload file from disk: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload video with optimized settings
   */
  static async uploadVideo(
    bufferOrPath: Buffer | string,
    sessionId: string,
    options: Partial<CloudinaryUploadOptions> = {}
  ): Promise<CloudinaryUploadResult> {
    const uploadOptions: CloudinaryUploadOptions = {
      resourceType: 'video',
      folder: 'interview-videos',
      publicId: `sessions/${sessionId}/${Date.now()}`,
      chunkSize: 6000000,
      timeout: 600000,
      tags: ['interview', 'session', sessionId],
      context: {
        session_id: sessionId,
        upload_type: 'video'
      },
      ...options
    };

    if (Buffer.isBuffer(bufferOrPath)) {
      return this.uploadFromBuffer(bufferOrPath, uploadOptions);
    } else {
      return this.uploadFromFile(bufferOrPath, uploadOptions, true);
    }
  }

  /**
   * Upload image with optimized settings
   */
  static async uploadImage(
    bufferOrPath: Buffer | string,
    sessionId: string,
    eventId: string,
    options: Partial<CloudinaryUploadOptions> = {}
  ): Promise<CloudinaryUploadResult> {
    const uploadOptions: CloudinaryUploadOptions = {
      resourceType: 'image',
      folder: 'event-snapshots',
      publicId: `events/${sessionId}/${eventId}`,
      tags: ['snapshot', 'event', sessionId, eventId],
      context: {
        session_id: sessionId,
        event_id: eventId,
        upload_type: 'image'
      },
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ],
      ...options
    };

    if (Buffer.isBuffer(bufferOrPath)) {
      return this.uploadFromBuffer(bufferOrPath, uploadOptions);
    } else {
      return this.uploadFromFile(bufferOrPath, uploadOptions, true);
    }
  }

  /**
   * Upload from URL
   */
  static async uploadFromUrl(
    url: string,
    sessionId: string,
    options: Partial<CloudinaryUploadOptions> = {}
  ): Promise<CloudinaryUploadResult> {
    try {
      const uploadOptions: Record<string, unknown> = {
        resource_type: 'video',
        folder: 'interview-videos',
        public_id: `sessions/${sessionId}/${Date.now()}`,
        tags: ['interview', 'session', sessionId],
        context: {
          session_id: sessionId,
          upload_type: 'video_url'
        },
        ...options
      };

      const result = await cloudinary.uploader.upload(url, uploadOptions);
      return result as CloudinaryUploadResult;
    } catch (error) {
      throw new Error(`Failed to upload from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete resource from Cloudinary
   */
  static async deleteResource(
    publicId: string,
    resourceType: 'video' | 'image' | 'raw' = 'video'
  ): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (error) {
      throw new Error(`Failed to delete resource: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get resource information
   */
  static async getResourceInfo(
    publicId: string,
    resourceType: 'video' | 'image' | 'raw' = 'video'
  ): Promise<unknown> {
    try {
      return await cloudinary.api.resource(publicId, { resource_type: resourceType });
    } catch (error) {
      throw new Error(`Failed to get resource info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate transformation URL
   */
  static generateTransformationUrl(
    publicId: string,
    transformation: CloudinaryTransformation[],
    resourceType: 'video' | 'image' = 'video'
  ): string {
    return cloudinary.url(publicId, {
      resource_type: resourceType,
      transformation
    });
  }
}

export default CloudinaryUtil;