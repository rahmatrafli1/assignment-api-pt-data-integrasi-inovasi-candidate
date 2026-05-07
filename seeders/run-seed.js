const bcrypt = require("bcryptjs");
const db = require("../src/config/database");
require("dotenv").config();

async function seed() {
  try {
    console.log("🌱 Running seeder...");

    const password = await bcrypt.hash("password", 10);

    // Clear tables
    await db.query("DELETE FROM role_menu_access");
    await db.query("DELETE FROM user_roles");
    await db.query("DELETE FROM menus");
    await db.query("DELETE FROM roles");
    await db.query("DELETE FROM users");

    // Reset sequences
    await db.query("ALTER SEQUENCE users_id_seq RESTART WITH 1");
    await db.query("ALTER SEQUENCE roles_id_seq RESTART WITH 1");
    await db.query("ALTER SEQUENCE menus_id_seq RESTART WITH 1");

    // Roles
    await db.query(`INSERT INTO roles (name, description) VALUES 
      ('admin', 'Administrator dengan akses penuh'),
      ('manager', 'Manager dengan akses manajemen'),
      ('staff', 'Staff dengan akses terbatas')`);

    // Users
    await db.query(
      `INSERT INTO users (username, password, full_name, email) VALUES 
      ('admin', $1, 'Administrator', 'admin@example.com'),
      ('john', $1, 'John Doe', 'john@example.com'),
      ('jane', $1, 'Jane Smith', 'jane@example.com')`,
      [password],
    );

    // User Roles
    await db.query(`INSERT INTO user_roles (user_id, role_id) VALUES 
      (1, 1), (1, 2),
      (2, 2), (2, 3),
      (3, 3)`);

    // Menus
    const menuData = [
      [1, null, "Menu 1", "/menu1", 1, 1],
      [2, null, "Menu 2", "/menu2", 2, 1],
      [3, null, "Menu 3", "/menu3", 3, 1],
      [4, 1, "Menu 1.1", "/menu1/1.1", 1, 2],
      [5, 1, "Menu 1.2", "/menu1/1.2", 2, 2],
      [6, 1, "Menu 1.3", "/menu1/1.3", 3, 2],
      [7, 2, "Menu 2.1", "/menu2/2.1", 1, 2],
      [8, 2, "Menu 2.2", "/menu2/2.2", 2, 2],
      [9, 2, "Menu 2.3", "/menu2/2.3", 3, 2],
      [10, 3, "Menu 3.1", "/menu3/3.1", 1, 2],
      [11, 3, "Menu 3.2", "/menu3/3.2", 2, 2],
      [12, 5, "Menu 1.2.1", "/menu1/1.2/1.2.1", 1, 3],
      [13, 5, "Menu 1.2.2", "/menu1/1.2/1.2.2", 2, 3],
      [14, 6, "Menu 1.3.1", "/menu1/1.3/1.3.1", 1, 3],
      [15, 8, "Menu 2.2.1", "/menu2/2.2/2.2.1", 1, 3],
      [16, 8, "Menu 2.2.2", "/menu2/2.2/2.2.2", 2, 3],
      [17, 8, "Menu 2.2.3", "/menu2/2.2/2.2.3", 3, 3],
      [18, 16, "Menu 2.2.2.1", "/menu2/2.2/2.2.2/2.2.2.1", 1, 4],
      [19, 16, "Menu 2.2.2.2", "/menu2/2.2/2.2.2/2.2.2.2", 2, 4],
    ];

    for (const [id, parent_id, name, path, order_number, level] of menuData) {
      await db.query(
        `INSERT INTO menus (id, parent_id, name, path, order_number, level) VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, parent_id, name, path, order_number, level],
      );
    }

    await db.query(
      `SELECT setval('menus_id_seq', (SELECT MAX(id) FROM menus))`,
    );

    // Role Menu Access - Admin: semua menu
    await db.query(
      `INSERT INTO role_menu_access (role_id, menu_id, can_view, can_create, can_update, can_delete)
       SELECT 1, id, TRUE, TRUE, TRUE, TRUE FROM menus`,
    );

    // Manager: Menu 1 & 2 beserta sub-menu
    const managerMenus = [
      1, 2, 4, 5, 6, 7, 8, 9, 12, 13, 14, 15, 16, 17, 18, 19,
    ];
    await db.query(
      `INSERT INTO role_menu_access (role_id, menu_id, can_view, can_create, can_update, can_delete)
       SELECT 2, id, TRUE, TRUE, TRUE, FALSE FROM menus WHERE id = ANY($1)`,
      [managerMenus],
    );

    // Staff: Menu 3 & sebagian menu 2
    const staffMenus = [3, 7, 9, 10, 11];
    await db.query(
      `INSERT INTO role_menu_access (role_id, menu_id, can_view, can_create, can_update, can_delete)
       SELECT 3, id, TRUE, FALSE, FALSE, FALSE FROM menus WHERE id = ANY($1)`,
      [staffMenus],
    );

    console.log("✅ Seeder completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeder error:", err);
    process.exit(1);
  }
}

seed();
