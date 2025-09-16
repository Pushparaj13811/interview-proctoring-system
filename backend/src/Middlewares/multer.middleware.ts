import multer from "multer";
import type { Request } from "express";
import path from "path";
import fs from "fs";
import { promisify } from "util";
import AppError from "../Utils/appError";

const mkdir = promisify(fs.mkdir);

// Ensure upload directories exist
const UPLOAD_DIRS = {
  videos: path.join(process.cwd(), 'uploads', 'videos'),
  images: path.join(process.cwd(), 'uploads', 'images')
};

// Create directories if they don't exist
Object.values(UPLOAD_DIRS).forEach(dir => {
  mkdir(dir, { recursive: true }).catch(console.error);
});

// Storage configurations
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIRS.videos);
  },
  filename: (req, file, cb) => {
    const sessionId = req.params.sessionId;
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `video-${sessionId}-${timestamp}${ext}`);
  }
});

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIRS.images);
  },
  filename: (req, file, cb) => {
    const { sessionId, eventId } = req.params;
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `image-${sessionId}-${eventId}-${timestamp}${ext}`);
  }
});


// File filters
const videoFileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only video files are allowed', 400));
  }
};

const imageFileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only image files are allowed', 400));
  }
};

// Multer configurations
export const videoUpload = multer({
  storage: videoStorage,
  fileFilter: videoFileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max
  }
});

export const imageUpload = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
});


// Memory storage for backward compatibility (use sparingly)
export const memoryUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: videoFileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024
  }
});

export { UPLOAD_DIRS };