const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { bloodRequestValidator, paginationValidator } = require('../middleware/validator');
const {
  createRequest, getRequest, getRequests, updateRequestStatus, cancelRequest
} = require('../controllers/requests.controller');

router.post('/', authenticate, authorize('patient', 'donor', 'admin'), bloodRequestValidator, createRequest);
router.get('/', authenticate, paginationValidator, getRequests);
router.get('/:id', authenticate, getRequest);
router.patch('/:id/status', authenticate, authorize('admin'), updateRequestStatus);
router.patch('/:id/cancel', authenticate, cancelRequest);

module.exports = router;
