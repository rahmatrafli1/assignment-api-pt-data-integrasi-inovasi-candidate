const bcrypt = require("bcryptjs");
const db = require("../config/database");

// GET /api/users
const getAllUsers = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.username, u.full_name, u.email, u.is_active, u.created_at,
              COALESCE(
                json_agg(json_build_object('id', r.id, 'name', r.name) ORDER BY r.id)
                FILTER (WHERE r.id IS NOT NULL), '[]'
              ) as roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       GROUP BY u.id
       ORDER BY u.id`,
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/:id
const getUserById = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.username, u.full_name, u.email, u.is_active, u.created_at,
              COALESCE(
                json_agg(json_build_object('id', r.id, 'name', r.name) ORDER BY r.id)
                FILTER (WHERE r.id IS NOT NULL), '[]'
              ) as roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [req.params.id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// POST /api/users
const createUser = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query("BEGIN");
    const { username, password, full_name, email, role_ids } = req.body;

    if (!username || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message: "username, password, and full_name are required",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userResult = await client.query(
      `INSERT INTO users (username, password, full_name, email)
       VALUES ($1, $2, $3, $4) RETURNING id, username, full_name, email`,
      [username, hashedPassword, full_name, email],
    );

    const user = userResult.rows[0];

    if (role_ids && Array.isArray(role_ids)) {
      for (const role_id of role_ids) {
        await client.query(
          `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
          [user.id, role_id],
        );
      }
    }

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ success: false, message: "Username or email already exists" });
    }
    next(err);
  } finally {
    client.release();
  }
};

// PUT /api/users/:id
const updateUser = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query("BEGIN");
    const { id } = req.params;
    const { full_name, email, password, is_active, role_ids } = req.body;

    let passwordUpdate = "";
    const params = [full_name, email, is_active, id];

    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      passwordUpdate = ", password = $5";
      params.push(hashed);
    }

    const result = await client.query(
      `UPDATE users SET
        full_name = COALESCE($1, full_name),
        email = COALESCE($2, email),
        is_active = COALESCE($3, is_active),
        updated_at = CURRENT_TIMESTAMP
        ${passwordUpdate}
       WHERE id = $4 RETURNING id, username, full_name, email, is_active`,
      params,
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (role_ids && Array.isArray(role_ids)) {
      await client.query(`DELETE FROM user_roles WHERE user_id = $1`, [id]);
      for (const role_id of role_ids) {
        await client.query(
          `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
          [id, role_id],
        );
      }
    }

    await client.query("COMMIT");

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: result.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};

// DELETE /api/users/:id
const deleteUser = async (req, res, next) => {
  try {
    const result = await db.query(
      `UPDATE users SET is_active = FALSE WHERE id = $1 RETURNING id`,
      [req.params.id],
    );
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
