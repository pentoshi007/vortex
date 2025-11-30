const express = require('express');
const authController = require('../controllers/auth.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/change-password', auth(), (req, res) => res.send('Not implemented')); // TODO

module.exports = router;
