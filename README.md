# Backend Test - Login & Management Access

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Auth**: JWT (JSON Web Token)
- **Password Hashing**: bcryptjs

## Setup & Installation

### 1. Clone Repository

```bash
git clone <repo-url>
cd backend-test
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment

```bash
cp .env.example .env
# Edit .env sesuai konfigurasi Anda
```

### 4. Setup Database PostgreSQL

```bash
# Buat database
psql -U postgres -c "CREATE DATABASE backend_tes;"

# Jalankan migration
psql -U postgres -d backend_tes -f migrations/init.sql

# Jalankan seeder
psql -U postgres -d backend_tes -f seeders/seed.sql
```

### 5. Jalankan Server

```bash
npm run dev   # development
npm start     # production
```

---

## Test Accounts

| Username | Password | Roles          |
| -------- | -------- | -------------- |
| admin    | password | admin, manager |
| john     | password | manager, staff |
| jane     | password | staff          |

> **Catatan**: Password hash di seeder tidak sesuai dengan "password". Gunakan script berikut untuk generate hash yang benar:

```bash
node -e "const b = require('bcryptjs'); b.hash('password', 10).then(h => console.log(h))"
```

Kemudian update seeder dengan hash yang dihasilkan.

---

## API Endpoints

### Authentication

#### POST /api/auth/login

Login dengan username & password.

**Request Body:**

```json
{
  "username": "admin",
  "password": "password"
}
```

**Response (Single Role):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "full_name": "Administrator",
      "email": "admin@example.com"
    },
    "role": {
      "id": 1,
      "name": "admin",
      "description": "Administrator dengan akses penuh"
    },
    "token": "<jwt_token>",
    "requires_role_selection": false
  }
}
```

**Response (Multiple Roles - perlu pilih role):**

```json
{
  "success": true,
  "message": "Login successful. Please select a role.",
  "data": {
    "user": { "id": 1, "username": "admin", "full_name": "Administrator" },
    "roles": [
      { "id": 1, "name": "admin" },
      { "id": 2, "name": "manager" }
    ],
    "requires_role_selection": true,
    "temp_token": "<temp_jwt_token>"
  }
}
```

---

#### POST /api/auth/select-role

Pilih role setelah login (untuk user dengan multiple roles).

**Headers:** `Authorization: Bearer <temp_token>`

**Request Body:**

```json
{ "role_id": 1 }
```

**Response:**

```json
{
  "success": true,
  "message": "Role selected successfully",
  "data": {
    "user": { "id": 1, "username": "admin" },
    "role": { "id": 1, "name": "admin" },
    "token": "<final_jwt_token>"
  }
}
```

---

#### GET /api/auth/me

Get data user yang sedang login.

**Headers:** `Authorization: Bearer <token>`

---

### Menu Management

| Method | Endpoint            | Auth  | Deskripsi                     |
| ------ | ------------------- | ----- | ----------------------------- |
| GET    | /api/menus/my-menus | All   | Menu sesuai role login (tree) |
| GET    | /api/menus          | Admin | Semua menu (tree)             |
| GET    | /api/menus/flat     | Admin | Semua menu (flat list)        |
| GET    | /api/menus/:id      | Admin | Detail menu                   |
| POST   | /api/menus          | Admin | Buat menu baru                |
| PUT    | /api/menus/:id      | Admin | Update menu                   |
| DELETE | /api/menus/:id      | Admin | Hapus menu (soft delete)      |

**POST /api/menus - Request Body:**

```json
{
  "parent_id": 1,
  "name": "Menu Baru",
  "path": "/menu-baru",
  "icon": "icon-name",
  "order_number": 5
}
```

**GET /api/menus/my-menus - Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "parent_id": null,
      "name": "Menu 1",
      "path": "/menu1",
      "level": 1,
      "can_view": true,
      "can_create": true,
      "can_update": true,
      "can_delete": true,
      "children": [
        {
          "id": 4,
          "parent_id": 1,
          "name": "Menu 1.1",
          "level": 2,
          "children": []
        }
      ]
    }
  ]
}
```

---

### Role Management

| Method | Endpoint             | Auth  | Deskripsi                   |
| ------ | -------------------- | ----- | --------------------------- |
| GET    | /api/roles           | Admin | Semua roles                 |
| GET    | /api/roles/:id       | Admin | Detail role                 |
| POST   | /api/roles           | Admin | Buat role baru              |
| PUT    | /api/roles/:id       | Admin | Update role                 |
| DELETE | /api/roles/:id       | Admin | Hapus role                  |
| GET    | /api/roles/:id/menus | Admin | Menu yang di-assign ke role |
| POST   | /api/roles/:id/menus | Admin | Assign menus ke role        |

**POST /api/roles/:id/menus - Request Body:**

```json
{
  "menus": [
    {
      "menu_id": 1,
      "can_view": true,
      "can_create": true,
      "can_update": true,
      "can_delete": false
    },
    {
      "menu_id": 2,
      "can_view": true,
      "can_create": false,
      "can_update": false,
      "can_delete": false
    }
  ]
}
```

---

### User Management

| Method | Endpoint       | Auth  | Deskripsi      |
| ------ | -------------- | ----- | -------------- |
| GET    | /api/users     | Admin | Semua users    |
| GET    | /api/users/:id | Admin | Detail user    |
| POST   | /api/users     | Admin | Buat user baru |
| PUT    | /api/users/:id | Admin | Update user    |
| DELETE | /api/users/:id | Admin | Hapus user     |

**POST /api/users - Request Body:**

```json
{
  "username": "newuser",
  "password": "password123",
  "full_name": "New User",
  "email": "newuser@example.com",
  "role_ids": [2, 3]
}
```

---

## ERD Description

```
users
  - id (PK)
  - username (UNIQUE)
  - password
  - full_name
  - email
  - is_active

roles
  - id (PK)
  - name (UNIQUE)
  - description
  - is_active

user_roles (junction)
  - user_id (FK -> users)
  - role_id (FK -> roles)

menus (self-referencing)
  - id (PK)
  - parent_id (FK -> menus.id) -- NULL = root menu
  - name
  - path
  - icon
  - order_number
  - level
  - is_active

role_menu_access (junction)
  - role_id (FK -> roles)
  - menu_id (FK -> menus)
  - can_view
  - can_create
  - can_update
  - can_delete
```
