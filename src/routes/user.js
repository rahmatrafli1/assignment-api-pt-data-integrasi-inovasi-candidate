const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require("../controllers/userController");
const { authenticate, authorize } = require("../middlewares/auth");

router.get("/", authenticate, authorize("admin"), getAllUsers);
router.get("/:id", authenticate, authorize("admin"), getUserById);
router.post("/", authenticate, authorize("admin"), createUser);
router.put("/:id", authenticate, authorize("admin"), updateUser);
router.delete("/:id", authenticate, authorize("admin"), deleteUser);

module.exports = router;
