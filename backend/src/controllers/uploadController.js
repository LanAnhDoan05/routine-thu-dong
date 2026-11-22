const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mediaService = require('../services/mediaService');
const cloudinaryService = require('../services/cloudinaryService');
const { sendSuccess, sendError } = require('../utils/response');

// Sử dụng memoryStorage để lưu file vào Buffer trong RAM, tương thích môi trường Serverless / Vercel
const storage = multer.memoryStorage();
const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB tối đa

const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': new Set(['.jpg', '.jpeg']),
  'image/png': new Set(['.png']),
  'image/webp': new Set(['.webp']),
};

function fileFilter(req, file, cb) {
  const allowedExtensions = ALLOWED_IMAGE_TYPES[file.mimetype];
  const extension = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions || !allowedExtensions.has(extension)) {
    const error = new Error('Chỉ chấp nhận file ảnh JPG, JPEG, PNG hoặc WEBP');
    error.statusCode = 400;
    return cb(error);
  }
  cb(null, true);
}

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
  },
  fileFilter,
});

/**
 * Upload single file helper: Cloudinary ưu tiên, database dự phòng
 */
async function processSingleUpload(file) {
  if (cloudinaryService.isConfigured()) {
    try {
      const ext = path.extname(file.originalname).slice(1).toLowerCase() || 'webp';
      const cleanName = path.basename(file.originalname, path.extname(file.originalname))
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 30);
      const publicId = `${cleanName}_${Date.now().toString(36)}`;

      const cRes = await cloudinaryService.uploadBuffer(file.buffer, {
        folder: 'routine_products',
        publicId,
        format: ext,
      });

      console.info(`[uploadController] Uploaded image to Cloudinary: public_id=${cRes.public_id}`);
      return {
        url: cRes.secure_url,
        secure_url: cRes.secure_url,
        public_id: cRes.public_id,
        provider: 'cloudinary',
        width: cRes.width,
        height: cRes.height,
        format: cRes.format,
        size: cRes.bytes || file.size,
        originalName: file.originalname,
        mimetype: file.mimetype,
      };
    } catch (cErr) {
      console.warn(`[uploadController] Cloudinary upload unavailable or timed out: ${cErr.message}. Gracefully falling back to MySQL database storage.`);
    }
  }

  // Fallback: Database MySQL (media_files)
  const extensions = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
  };
  const ext = extensions[file.mimetype] || path.extname(file.originalname) || '.jpg';
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const filename = `img-${uniqueSuffix}${ext}`;

  const saved = await mediaService.saveMediaFile({
    filename,
    mimetype: file.mimetype,
    size: file.size,
    buffer: file.buffer,
  });

  // Tùy chọn lưu đĩa nếu local
  try {
    const uploadDir = path.resolve(__dirname, '../../public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    fs.writeFileSync(path.join(uploadDir, filename), file.buffer);
  } catch (diskErr) {
    // non-blocking trên Vercel
  }

  return {
    url: saved.url,
    id: saved.id,
    filename,
    provider: 'database',
    originalName: file.originalname,
    size: file.size,
    mimetype: file.mimetype,
  };
}

/**
 * Xử lý sau khi upload 1 file
 */
async function handleUploadSuccess(req, res, next) {
  try {
    if (!req.file) {
      return sendError(res, 'Vui lòng chọn file hình ảnh cần tải lên', 400);
    }

    const uploaded = await processSingleUpload(req.file);

    return sendSuccess(
      res,
      uploaded,
      uploaded.provider === 'cloudinary' ? 'Tải hình ảnh lên Cloudinary thành công' : 'Tải hình ảnh lên máy chủ thành công',
      201
    );
  } catch (err) {
    next(err);
  }
}

/**
 * Xử lý sau khi upload nhiều file cùng lúc
 */
async function handleMultipleUploadSuccess(req, res, next) {
  try {
    const files = req.files || [];
    if (!Array.isArray(files) || files.length === 0) {
      return sendError(res, 'Vui lòng chọn ít nhất một file hình ảnh cần tải lên', 400);
    }

    const results = [];
    for (const file of files) {
      const uploaded = await processSingleUpload(file);
      results.push(uploaded);
    }

    return sendSuccess(
      res,
      {
        count: results.length,
        items: results,
        urls: results.map((r) => r.url),
      },
      `Đã tải lên thành công ${results.length} hình ảnh`,
      201
    );
  } catch (err) {
    next(err);
  }
}

/**
 * Kiểm tra trạng thái tích hợp Cloudinary (không in Secret)
 */
async function getStorageStatus(req, res, next) {
  try {
    const isReady = cloudinaryService.isConfigured();
    const { cloud_name, api_key } = cloudinaryService.getCloudinaryConfig();

    return sendSuccess(
      res,
      {
        provider: 'cloudinary',
        mode: 'direct',
        cloudinary: {
          configured: isReady,
          cloudName: cloud_name || null,
          apiKeyPresent: !!api_key,
        },
      },
      'Hệ thống đang hoạt động ở chế độ upload trực tiếp lên Cloudinary'
    );
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadSingle: upload.single('image'),
  uploadMultiple: upload.array('images', 10),
  handleUploadSuccess,
  handleMultipleUploadSuccess,
  getStorageStatus,
  fileFilter,
  MAX_IMAGE_SIZE_BYTES,
};
