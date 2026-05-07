const express = require("express");
const router = express.Router();
const {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getRoleMenus,
  assignMenusToRole,
} = require("../controllers/roleController");
const { authenticate, authorize } = require("../middlewares/auth");

router.get("/", authenticate, authorize("admin"), getAllRoles);
router.get("/:id", authenticate, authorize("admin"), getRoleById);
router.post("/", authenticate, authorize("admin"), createRole);
router.put("/:id", authenticate, authorize("admin"), updateRole);
router.delete("/:id", authenticate, authorize("admin"), deleteRole);
router.get("/:id/menus", authenticate, authorize("admin"), getRoleMenus);
router.post("/:id/menus", authenticate, authorize("admin"), assignMenusToRole);

module.exports = router;
