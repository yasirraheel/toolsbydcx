# ⚡ ToolsByDcx — AI Tool Access & Credit Management Platform

<div align="center">

![Platform](https://img.shields.io/badge/Platform-ToolsByDcx-22c55e?style=for-the-badge&logo=rocket&logoColor=white)
![React](https://img.shields.io/badge/Frontend-React%2018-61dafb?style=for-the-badge&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-339933?style=for-the-badge&logo=node.js&logoColor=white)
![MySQL](https://img.shields.io/badge/Database-MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Chrome Extension](https://img.shields.io/badge/Extension-Manifest%20V3-FFA000?style=for-the-badge&logo=googlechrome&logoColor=white)

<br/>

**A multi-tenant SaaS platform and Chrome extension ecosystem for automated AI tool access, subscription tier enforcement, and real-time generation credit orchestration.**

[Features](#-key-features) • [Architecture](#-architecture) • [Extension](#-companion-chrome-extension) • [Quick Start](#-quick-start) • [API Reference](#-api-endpoints) • [Configuration](#%EF%B8%8F-environment-variables)

</div>

---

## 🌟 Key Features

### ⚡ Automated AI Generation Credit Engine
- **Per-Generation Billing**: Automatically deducts **50 credits per video generation** when a user submits a prompt or presses <kbd>Enter</kbd> on supported AI generation tools (e.g. Google Flow FX).
- **Flexible Subscription Quotas**: Supports metered plans (e.g. 25 or 200 credits) and VIP tiers with **Unlimited Credits** (-1).
- **Real-Time On-Screen Feedback**: Injects an interactive floating pill showing generation status, credits consumed, and remaining balance.
- **Over-Quota Protection**: Blocks requests and returns HTTP 402 with an upgrade prompt when balances fall below generation requirements.

### 🎛️ Unified Admin Suite
- **Accounts Hub**: Pool account status, health monitoring, active device metrics, and allocation controls.
- **User Management**: Searchable user roster, role assignment, active device binding, and manual credit balance overrides.
- **Subscription Plans**: Tier creation, billing cycles, pricing, feature lists, and assigned AI generation credit quotas.

### 👤 Modern User Dashboard
- **Executive Dark Theme**: Clean #090d16 canvas with emerald accents, sticky navigation, and full-width responsive layout.
- **KPI Metrics**: Real-time remaining generation credit counter, active plan status, subscription validity countdown, and direct launch links.
- **Self-Service Profile**: Password update, security controls, and quick-launch extensions.

### 🧩 Companion Chrome Extension (Manifest V3)
- **Zero-Friction Access**: Injects tokens and manages sessions without exposing sensitive platform credentials to end users.
- **Intelligent DOM Observers**: Detects prompt submissions and model generation life-cycles.
- **Active Device Heartbeat**: Reports live device presence to enforce account concurrency limits.
- **Glassmorphic Popup**: Quick balance lookup, system status, and direct launch buttons.

---

## 🏗️ Architecture & Tech Stack

`mermaid
graph TD
    User([End User / Browser]) <--> Ext[ToolsByDcx Chrome Extension - MV3]
    Ext <--> Tool[Google Flow / AI Tools]
    Ext <--> API[Node.js Express API Server]
    User <--> Web[React 18 Dashboard & Admin Panel]
    Web <--> API
    API <--> DB[(MySQL Database)]
`

| Layer | Technology |
|---|---|
| **Frontend UI** | React 18, React Hooks, Lucide Icons, Modern Dark Theme |
| **Backend API** | Node.js, Express 5, JWT, bcryptjs, Nodemailer |
| **Alternative Backend** | PHP (pi.php) for cPanel / Apache environments |
| **Database** | MySQL (Connection pooling, auto-migrations, relational schema) |
| **Extension** | Chrome Extensions Manifest V3, Background Service Worker, Content Scripts |

---

## 📁 Repository Structure

`
toolsbydcx/
├── FlowByDcx-extesnion/        # Chrome Extension (Manifest V3)
│   ├── manifest.json           # Extension configuration & permissions
│   ├── background.js           # Background service worker & session manager
│   ├── content.js              # Page-level injection script
│   ├── dcx_extra.js            # Prompt hook & 50-credit generation handler
│   ├── popup.html / popup.js   # Extension popup interface
│   └── site_bridge.js          # Web-to-extension communication bridge
├── public/                     # Static assets & HTML template
├── scripts/                    # Helper utilities & icon generators
├── server/                     # Node.js Express backend
│   ├── index.js                # API server & route handlers
│   └── db.js                   # MySQL connection pool & table seeding
├── src/                        # React frontend source code
│   ├── components/             # Reusable UI components (Navbar, Modals)
│   ├── pages/                  # Views: UserDashboard, AdminUsers, AdminPlans, etc.
│   ├── context/                # Authentication & Theme context
│   └── App.js                  # Main routing and layout
├── .env.example                # Sample environment configuration
├── .gitignore                  # Git ignore rules
├── api.php                     # Standalone PHP backend endpoint
└── package.json                # Project dependencies & scripts
`

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** >= 18.x
- **MySQL** >= 8.0 or MariaDB >= 10.4
- **Google Chrome** (for extension companion)

### 1. Clone & Install Dependencies
`ash
git clone https://github.com/yasirraheel/toolsbydcx.git
cd toolsbydcx
npm install
`

### 2. Configure Environment Variables
Copy .env.example to .env and fill in your database credentials:
`ash
cp .env.example .env
`
Example .env:
`env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=flowbydcx

PORT=3000
SERVER_PORT=5000
JWT_SECRET=your_super_secure_jwt_secret_key_here
REACT_APP_API_URL=http://localhost:5000/api
`

### 3. Start the Backend API Server
`ash
npm run server
`
The server will automatically connect to MySQL, create required tables, and seed initial plans.

### 4. Start the Frontend Application
In a separate terminal:
`ash
npm start
`
Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

### 5. Install the Chrome Extension
1. Open Chrome and navigate to chrome://extensions.
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked**.
4. Select the FlowByDcx-extesnion folder from this repository.

---

## 📡 API Endpoints

### Authentication & User
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/login | Authenticate user & return JWT token |
| POST | /api/register | Register new user account |
| GET | /api/user/dashboard | Get current user stats, active plan, and credit balance |
| GET | /api/user/credits | Fetch dynamic user credit quota |

### Extension Integration
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/extension/verify | Validate user session and return available accounts |
| POST | /api/extension/use-credits | Intercepts generation and deducts 50 credits |
| POST | /api/extension/heartbeat | Updates active device status and session timer |
| POST | /api/extension/auto-signout | Revokes session upon logout or inactivity |

### Admin Management
| Method | Endpoint | Description |
|---|---|---|
| GET/POST/PUT | /api/admin/plans | Manage subscription tiers, pricing, and assigned credits |
| GET/POST/PUT | /api/admin/users | Manage registered users, devices, and credit quotas |
| GET/POST/PUT | /api/admin/accounts | Manage shared tool pool accounts |

---

## ⚙️ Credit Deduction Flow

`
[User clicks "Generate" or hits Enter on Google Flow]
                          │
                          ▼
             [dcx_extra.js Content Script]
        Interprets prompt submit + starts cooldown
                          │
                          ▼
            [POST /api/extension/use-credits]
                     { cost: 50 }
                          │
         ┌────────────────┴────────────────┐
         ▼                                 ▼
[Metered User]                     [Unlimited User]
Check if balance >= 50              Bypass deduction
Deduct 50 in MySQL                  Returns 999999 credits
Return remaining balance            Continues immediately
         │
         ▼
[Extension Notification]
"🎬 Video generating · 50 credits used · [N] left"
`

---

## 📄 License

Distributed under the MIT License. See LICENSE for more information.
