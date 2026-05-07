const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/database");
require("dotenv").config();

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  });
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    // Cari user + roles
    const userResult = await db.query(
      `SELECT u.id, u.username, u.password, u.full_name, u.email, u.is_active
       FROM users u WHERE u.username = $1`,
      [username],
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    // Ambil semua roles user
    const rolesResult = await db.query(
      `SELECT r.id, r.name, r.description
       FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = $1 AND r.is_active = TRUE`,
      [user.id],
    );

    const roles = rolesResult.rows;

    if (roles.length === 0) {
      return res.status(403).json({
        success: false,
        message: "User has no assigned roles",
      });
    }

    // Jika hanya 1 role, langsung generate token
    if (roles.length === 1) {
      const token = generateToken({
        user_id: user.id,
        username: user.username,
        role_id: roles[0].id,
        role_name: roles[0].name,
      });

      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          user: {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            email: user.email,
          },
          role: roles[0],
          token,
          requires_role_selection: false,
        },
      });
    }

    // Jika lebih dari 1 role, kembalikan daftar roles untuk dipilih
    return res.status(200).json({
      success: true,
      message: "Login successful. Please select a role.",
      data: {
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          email: user.email,
        },
        roles,
        requires_role_selection: true,
        // Temp token untuk select role step
        temp_token: generateToken({
          user_id: user.id,
          username: user.username,
          temp: true,
        }),
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/select-role
const selectRole = async (req, res, next) => {
  try {
    const { role_id } = req.body;
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Token required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    if (!decoded.temp) {
      return res.status(400).json({
        success: false,
        message: "This endpoint is only for role selection",
      });
    }

    if (!role_id) {
      return res
        .status(400)
        .json({ success: false, message: "role_id is required" });
    }

    // Validasi role milik user
    const roleCheck = await db.query(
      `SELECT r.id, r.name, r.description
       FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = $1 AND r.id = $2 AND r.is_active = TRUE`,
      [decoded.user_id, role_id],
    );

    if (roleCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Role not found or not assigned to user",
      });
    }

    const role = roleCheck.rows[0];

    // Get user info
    const userResult = await db.query(
      `SELECT id, username, full_name, email FROM users WHERE id = $1`,
      [decoded.user_id],
    );
    const user = userResult.rows[0];

    const finalToken = generateToken({
      user_id: user.id,
      username: user.username,
      role_id: role.id,
      role_name: role.name,
    });

    return res.status(200).json({
      success: true,
      message: "Role selected successfully",
      data: {
        user,
        role,
        token: finalToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.username, u.full_name, u.email, u.is_active,
              r.id as role_id, r.name as role_name, r.description as role_description
       FROM users u
       JOIN roles r ON r.id = $2
       WHERE u.id = $1`,
      [req.user.user_id, req.user.role_id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, selectRole, getMe };
