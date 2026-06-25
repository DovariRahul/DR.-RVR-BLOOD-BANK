const express = require('express');
const router = express.Router();
const { getPublicStats, getPublicDonorsByGroup } = require('../controllers/stats.controller');

router.get('/public', getPublicStats);
router.get('/public/donors', getPublicDonorsByGroup);

module.exports = router;
