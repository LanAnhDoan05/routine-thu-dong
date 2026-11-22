const cloudinary = require('cloudinary').v2;

function getCloudinaryConfig() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const api_key = process.env.CLOUDINARY_API_KEY?.trim();
  const api_secret = process.env.CLOUDINARY_API_SECRET?.trim();
  return { cloud_name, api_key, api_secret };
}

function isConfigured() {
  const { cloud_name, api_key, api_secret } = getCloudinaryConfig();
  if (!cloud_name || !api_key || !api_secret) return false;
  return true;
}

function configureCloudinary() {
  const { cloud_name, api_key, api_secret } = getCloudinaryConfig();
  if (cloud_name && api_key && api_secret) {
    cloudinary.config({
      cloud_name,
      api_key,
      api_secret,
      secure: true,
    });
  }
  return cloudinary;
}

async function ping() {
  if (!isConfigured()) {
    return { ok: false, message: 'Cloudinary credentials are not configured or still using placeholder secret.' };
  }
  configureCloudinary();
  try {
    const res = await cloudinary.api.ping();
    return { ok: true, status: res.status };
  } catch (err) {
    return { ok: false, error: err?.message || err };
  }
}

/**
 * Upload an image buffer to Cloudinary using stream
 * @param {Buffer} buffer
 * @param {Object} options
 * @returns {Promise<Object>}
 */
function uploadBuffer(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    if (!isConfigured()) {
      const err = new Error('Cloudinary chưa được cấu hình Secret hợp lệ.');
      err.code = 'CLOUDINARY_NOT_CONFIGURED';
      return reject(err);
    }

    configureCloudinary();

    const uploadOptions = {
      folder: options.folder || 'routine_products',
      resource_type: 'image',
      format: options.format,
      public_id: options.publicId,
      transformation: options.transformation || [
        { quality: 'auto', fetch_format: 'auto' }
      ],
      ...options,
    };

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        return reject(error);
      }
      resolve({
        url: result.secure_url,
        secure_url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        created_at: result.created_at,
      });
    });

    stream.end(buffer);
  });
}

/**
 * Delete image from Cloudinary by publicId
 * @param {string} publicId
 * @returns {Promise<Object>}
 */
async function deleteImage(publicId) {
  if (!isConfigured() || !publicId) return { ok: false };
  configureCloudinary();
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return { ok: result.result === 'ok', result };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

module.exports = {
  isConfigured,
  getCloudinaryConfig,
  ping,
  uploadBuffer,
  deleteImage,
};
