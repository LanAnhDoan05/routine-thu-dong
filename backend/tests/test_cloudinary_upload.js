const test = require('node:test');
const assert = require('node:assert/strict');
const cloudinaryService = require('../src/services/cloudinaryService');
const uploadController = require('../src/controllers/uploadController');

test('Cloudinary integration tests', async (t) => {
  await t.test('detects direct cloudinary configuration status', () => {
    const configured = cloudinaryService.isConfigured();
    assert.strictEqual(typeof configured, 'boolean');
    assert.strictEqual(configured, true);
  });

  await t.test('reads cloud configuration without exposing secrets', () => {
    const config = cloudinaryService.getCloudinaryConfig();
    assert.strictEqual(config.cloud_name, 'ubkdyrwp');
    assert.strictEqual(config.api_key, '821468172265738');
    assert.ok(config.api_secret);
  });

  await t.test('fileFilter accepts valid image extensions and rejects invalid', () => {
    const validJpg = { mimetype: 'image/jpeg', originalname: 'photo.jpg' };
    const validPng = { mimetype: 'image/png', originalname: 'icon.png' };
    const validWebp = { mimetype: 'image/webp', originalname: 'hero.webp' };
    const invalidPdf = { mimetype: 'application/pdf', originalname: 'doc.pdf' };
    const invalidExe = { mimetype: 'application/x-msdownload', originalname: 'app.exe' };

    uploadController.fileFilter({}, validJpg, (err, accept) => {
      assert.strictEqual(err, null);
      assert.strictEqual(accept, true);
    });

    uploadController.fileFilter({}, validPng, (err, accept) => {
      assert.strictEqual(err, null);
      assert.strictEqual(accept, true);
    });

    uploadController.fileFilter({}, validWebp, (err, accept) => {
      assert.strictEqual(err, null);
      assert.strictEqual(accept, true);
    });

    uploadController.fileFilter({}, invalidPdf, (err, accept) => {
      assert.ok(err);
      assert.strictEqual(err.statusCode, 400);
    });

    uploadController.fileFilter({}, invalidExe, (err, accept) => {
      assert.ok(err);
      assert.strictEqual(err.statusCode, 400);
    });
  });

  await t.test('live Cloudinary ping succeeds with authenticated account', async () => {
    const pingResult = await cloudinaryService.ping();
    assert.strictEqual(pingResult.ok, true);
    assert.strictEqual(pingResult.status, 'ok');
  });

  await t.test('live uploadBuffer succeeds and returns Cloudinary secure URL', async () => {
    const base64Pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const dummyBuffer = Buffer.from(base64Pixel, 'base64');
    const result = await cloudinaryService.uploadBuffer(dummyBuffer, {
      folder: 'routine_tests',
      publicId: `test_pixel_${Date.now()}`
    });

    assert.ok(result.secure_url.startsWith('https://res.cloudinary.com/ubkdyrwp/'));
    assert.strictEqual(result.format, 'png');

    // Clean up
    if (result.public_id) {
      await cloudinaryService.deleteImage(result.public_id);
    }
  });
});
