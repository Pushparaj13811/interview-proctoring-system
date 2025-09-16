import CloudinaryUtil from "../Utils/cloudinary.util";

class UploadService {
  // Upload video from buffer or file path
  async uploadVideo(bufferOrPath: Buffer | string, sessionId: string): Promise<string> {
    try {
      const result = await CloudinaryUtil.uploadVideo(bufferOrPath, sessionId);
      return result.secure_url;
    } catch (error) {
      throw new Error(`Failed to upload video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Upload video from URL
  async uploadVideoFromUrl(url: string, sessionId: string): Promise<string> {
    try {
      const result = await CloudinaryUtil.uploadFromUrl(url, sessionId);
      return result.secure_url;
    } catch (error) {
      throw new Error(`Failed to upload video from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Upload image from buffer or file path
  async uploadImage(bufferOrPath: Buffer | string, sessionId: string, eventId: string): Promise<string> {
    try {
      const result = await CloudinaryUtil.uploadImage(bufferOrPath, sessionId, eventId);
      return result.secure_url;
    } catch (error) {
      throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Delete video from Cloudinary
  async deleteVideo(publicId: string): Promise<void> {
    try {
      await CloudinaryUtil.deleteResource(publicId, 'video');
    } catch (error) {
      throw new Error(`Failed to delete video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get video information from Cloudinary
  async getVideoInfo(publicId: string) {
    try {
      return await CloudinaryUtil.getResourceInfo(publicId, 'video');
    } catch (error) {
      throw new Error(`Failed to get video info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }




}

export default UploadService;