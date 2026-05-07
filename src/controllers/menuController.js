const db = require("../config/database");

// Helper: build tree dari flat array
const buildMenuTree = (menus, parentId = null) => {
  return menus
    .filter((m) => m.parent_id === parentId)
    .sort((a, b) => a.order_number - b.order_number)
    .map((m) => ({
      ...m,
      children: buildMenuTree(menus, m.id),
    }));
};

// GET /api/menus/my-menus - menu sesuai role yg login
const getMyMenus = async (req, res, next) => {
  try {
    const { role_id } = req.user;

    const result = await db.query(
      `SELECT m.id, m.parent_id, m.name, m.path, m.icon, m.order_number, m.level,
              rma.can_view, rma.can_create, rma.can_update, rma.can_delete
       FROM menus m
       JOIN role_menu_access rma ON rma.menu_id = m.id
       WHERE rma.role_id = $1 AND rma.can_view = TRUE AND m.is_active = TRUE
       ORDER BY m.level, m.order_number`,
      [role_id],
    );

    const tree = buildMenuTree(result.rows);

    res.status(200).json({
      success: true,
      data: tree,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/menus - semua menu (admin)
const getAllMenus = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT * FROM menus WHERE is_active = TRUE ORDER BY level, order_number`,
    );

    const tree = buildMenuTree(result.rows);

    res.status(200).json({
      success: true,
      data: tree,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/menus/flat - semua menu flat list
const getAllMenusFlat = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT m.*, p.name as parent_name 
       FROM menus m 
       LEFT JOIN menus p ON p.id = m.parent_id
       WHERE m.is_active = TRUE 
       ORDER BY m.level, m.order_number`,
    );

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/menus/:id
const getMenuById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(`SELECT * FROM menus WHERE id = $1`, [id]);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Menu not found" });
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// POST /api/menus
const createMenu = async (req, res, next) => {
  try {
    const { parent_id, name, path, icon, order_number } = req.body;

    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Menu name is required" });
    }

    // Hitung level otomatis
    let level = 1;
    if (parent_id) {
      const parentResult = await db.query(
        `SELECT level FROM menus WHERE id = $1`,
        [parent_id],
      );
      if (parentResult.rows.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "Parent menu not found" });
      }
      level = parentResult.rows[0].level + 1;
    }

    const result = await db.query(
      `INSERT INTO menus (parent_id, name, path, icon, order_number, level)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [parent_id || null, name, path, icon, order_number || 0, level],
    );

    res.status(201).json({
      success: true,
      message: "Menu created successfully",
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/menus/:id
const updateMenu = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { parent_id, name, path, icon, order_number, is_active } = req.body;

    const existing = await db.query(`SELECT * FROM menus WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Menu not found" });
    }

    let level = existing.rows[0].level;
    if (parent_id !== undefined) {
      if (parent_id === null) {
        level = 1;
      } else {
        const parentResult = await db.query(
          `SELECT level FROM menus WHERE id = $1`,
          [parent_id],
        );
        if (parentResult.rows.length === 0) {
          return res
            .status(400)
            .json({ success: false, message: "Parent menu not found" });
        }
        level = parentResult.rows[0].level + 1;
      }
    }

    const result = await db.query(
      `UPDATE menus SET
        parent_id = COALESCE($1, parent_id),
        name = COALESCE($2, name),
        path = COALESCE($3, path),
        icon = COALESCE($4, icon),
        order_number = COALESCE($5, order_number),
        level = $6,
        is_active = COALESCE($7, is_active),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 RETURNING *`,
      [parent_id, name, path, icon, order_number, level, is_active, id],
    );

    res.status(200).json({
      success: true,
      message: "Menu updated successfully",
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/menus/:id
const deleteMenu = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await db.query(`SELECT * FROM menus WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Menu not found" });
    }

    await db.query(`UPDATE menus SET is_active = FALSE WHERE id = $1`, [id]);

    res.status(200).json({
      success: true,
      message: "Menu deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyMenus,
  getAllMenus,
  getAllMenusFlat,
  getMenuById,
  createMenu,
  updateMenu,
  deleteMenu,
};
