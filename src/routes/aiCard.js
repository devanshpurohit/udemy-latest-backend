const express = require('express');
const router = express.Router();
const aiCardController = require('../controllers/aiCardController');
const { protect, admin } = require('../middleware/auth');

// Public verification (during registration)
router.post('/verify', aiCardController.verifyCard);

// All other AI card routes are protected and admin only
router.use(protect);
router.use(admin);

router.post('/generate', aiCardController.generateCard);
router.get('/', aiCardController.getAllCards);
router.delete('/:id', aiCardController.deleteCard);


module.exports = router;
