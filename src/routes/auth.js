const express = require("express");
const router = express.Router();
const { login, selectRole, getMe } = require("../controllers/authController");
const { authenticate } = require("../middlewares/auth");

router.post("/login", login);
router.post("/select-role", selectRole);
router.get("/me", authenticate, getMe);

module.exports = router;
