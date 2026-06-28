const express = require('express');
const router = express.Router();
const { authenticate } = require('../utils/middlewares');
const { createReport, getMyReports } = require('../controllers/reportController');

// User-facing report routes (any logged-in user).
router.use(authenticate);

router.post('/', createReport);     // submit an issue/suggestion
router.get('/mine', getMyReports);  // my reports + admin replies

module.exports = router;
