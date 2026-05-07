const express = require("express");
const router = express.Router();
const {
  getMyMenus,
  getAllMenus,
  getAllMenusFlat,
  getMenuById,
  createMenu,
  updateMenu,
  deleteMenu,
} = require("../controllers/menuController");
const { authenticate, authorize } = require("../middlewares/auth");

router.get("/my-menus", authenticate, getMyMenus);
router.get("/flat", authenticate, authorize("admin"), getAllMenusFlat);
router.get("/", authenticate, authorize("admin"), getAllMenus);
router.get("/:id", authenticate, authorize("admin"), getMenuById);
router.post("/", authenticate, authorize("admin"), createMenu);
router.put("/:id", authenticate, authorize("admin"), updateMenu);
router.delete("/:id", authenticate, authorize("admin"), deleteMenu);

module.exports = router;
