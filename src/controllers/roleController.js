const db = require("../config/database");

// GET /api/roles
const getAllRoles = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT * FROM roles WHERE is_active = TRUE ORDER BY id`,
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/roles/:id
const getRoleById = async (req, res, next) => {
  try {
    const result = await db.query(`SELECT * FROM roles WHERE id = $1`, [
      req.params.id,
    ]);
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Role not found" });
    }
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// POST /api/roles
const createRole = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Role name is required" });
    }

    const result = await db.query(
      `INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING *`,
      [name, description],
    );

    res.status(201).json({
      success: true,
      message: "Role created successfully",
      data: result.rows[0],
    });
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ success: false, message: "Role name already exists" });
    }
    next(err);
  }
};

// PUT /api/roles/:id
const updateRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;

    const result = await db.query(
      `UPDATE roles SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        is_active = COALESCE($3, is_active),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [name, description, is_active, id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Role not found" });
    }

    res.status(200).json({
      success: true,
      message: "Role updated successfully",
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/roles/:id
const deleteRole = async (req, res, next) => {
  try {
    const result = await db.query(
      `UPDATE roles SET is_active = FALSE WHERE id = $1 RETURNING *`,
      [req.params.id],
    );
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Role not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Role deleted successfully" });
  } catch (err) {
    next(err);
  }
};

// GET /api/roles/:id/menus - get menus assigned to role
const getRoleMenus = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT m.id, m.parent_id, m.name, m.path, m.level, m.order_number,
              rma.can_view, rma.can_create, rma.can_update, rma.can_delete
       FROM menus m
       JOIN role_menu_access rma ON rma.menu_id = m.id
       WHERE rma.role_id = $1 AND m.is_active = TRUE
       ORDER BY m.level, m.order_number`,
      [req.params.id],
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// POST /api/roles/:id/menus - assign menus to role
const assignMenusToRole = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query("BEGIN");
    const { id } = req.params;
    const { menus } = req.body; // array of { menu_id, can_view, can_create, can_update, can_delete }

    if (!menus || !Array.isArray(menus)) {
      return res
        .status(400)
        .json({ success: false, message: "menus array is required" });
    }

    // Hapus akses lama
    await client.query(`DELETE FROM role_menu_access WHERE role_id = $1`, [id]);

    // Insert akses baru
    for (const menu of menus) {
      await client.query(
        `INSERT INTO role_menu_access (role_id, menu_id, can_view, can_create, can_update, can_delete)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          id,
          menu.menu_id,
          menu.can_view ?? true,
          menu.can_create ?? false,
          menu.can_update ?? false,
          menu.can_delete ?? false,
        ],
      );
    }

    await client.query("COMMIT");

    res.status(200).json({
      success: true,
      message: "Menus assigned to role successfully",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};

module.exports = {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getRoleMenus,
  assignMenusToRole,
};
