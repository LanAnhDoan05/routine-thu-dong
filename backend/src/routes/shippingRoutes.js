const express = require('express');
const router = express.Router();
const shippingController = require('../controllers/shippingController');
const { authenticate, authorizeAdmin } = require('../middlewares/auth');

// Public endpoints for address & shipping fee calculation
router.post('/check-address', shippingController.checkAddress);
router.post('/calculate', shippingController.calculateShipping);
router.post('/calculate-by-region', shippingController.calculateByRegion);
router.get('/rules', shippingController.getShippingRules);

// Admin-protected endpoints to manage shipping rules
router.post('/rules', authenticate, authorizeAdmin, shippingController.createShippingRule);
router.put('/rules/:id', authenticate, authorizeAdmin, shippingController.updateShippingRule);
router.delete('/rules/:id', authenticate, authorizeAdmin, shippingController.deleteShippingRule);

module.exports = router;
