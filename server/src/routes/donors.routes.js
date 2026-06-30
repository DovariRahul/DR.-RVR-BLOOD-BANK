const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { donorRegisterValidator, donorUpdateValidator, paginationValidator } = require('../middleware/validator');
const {
  registerDonor, getMyProfile, updateDonor, toggleAvailability, respondToRequest, getDonors, deleteDonorAccount
} = require('../controllers/donors.controller');

router.post('/register', optionalAuth, donorRegisterValidator, registerDonor);
router.get('/profile', authenticate, authorize('donor'), getMyProfile);
router.put('/:id', authenticate, donorUpdateValidator, updateDonor);
router.patch('/:id/availability', authenticate, toggleAvailability);
router.get('/', authenticate, authorize('admin'), paginationValidator, getDonors);

// Donor response to a request
router.post('/respond/:id', authenticate, authorize('donor'), respondToRequest);

// Delete donor account (password-verified)
router.delete('/account', authenticate, authorize('donor'), deleteDonorAccount);

module.exports = router;
