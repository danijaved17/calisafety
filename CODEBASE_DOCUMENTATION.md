# California SafetyNet — Codebase Documentation

> Written as part of the CaliSafety revival project.
> This document explains the original codebase in plain English — what it is, how it was built, how it works, what was broken, and what needs to change.

---

## 1. What Is This App?

**California SafetyNet** is an emergency alert system for California counties. It was built as a final-year Software Engineering project at SFSU (Fall 2023, Team 02).

The app lets:
- **Citizens** register, log in, and view safety alerts for their county
- **County Department Directors** log in and post new alerts (fire, weather, health, security)
- **Anyone** search for a California county on the home page and see its active alerts on a map

---

## 2. How Was It Hosted? (AWS Explained)

The original team rented a **virtual Linux computer from Amazon Web Services** called an EC2 instance. Think of it as a computer that lives in Amazon's data center, always on, connected to the internet.

The team would:
1. Connect to that remote computer using SSH (a secure terminal connection), using the `.pem` key file in the `credentials/` folder
2. Run `node server.js` on it to start the app
3. The MySQL database also ran on that same computer

The server address was: `softwareengineering.servehttp.com`

**Why it stopped working:** EC2 instances cost money (or use free-tier credits that expire). Once the team and I graduated, we stopped paying/maintaining it, so the server went offline.

**Why Vercel is better for this project:** Vercel is free for small projects, deploys automatically from GitHub, and doesn't require managing a Linux server manually.

---

## 3. Technology Stack

| Layer | Technology | What it does |
|-------|-----------|--------------|
| Frontend | HTML, CSS, Vanilla JavaScript | The web pages users see |
| Backend | Node.js + Express.js | Handles API requests, talks to the database |
| Database | MySQL | Stores users, counties, alerts |
| Authentication | Firebase Authentication | Handles email/password login securely |
| Maps | Google Maps API | Displays California county map on home page |
| Original Hosting | AWS EC2 | Linux server that ran the app |

**No frontend framework** (no React, no Vue). Every page is a separate `.html` file. JavaScript files are loaded manually in each HTML file.

---

## 4. Folder & File Structure

```
calisafety/
├── application/              ← Everything that runs the app
│   ├── server.js             ← Backend: all API routes live here
│   ├── database.js           ← Database: creates tables + seeds data on startup
│   ├── database_config.json  ← MySQL connection credentials (hardcoded)
│   ├── firebase-key.json     ← Firebase admin credentials (hardcoded)
│   ├── TEST648.sql           ← Full database schema (SQL file)
│   ├── package.json          ← Node.js dependency list
│   │
│   ├── index.html            ← Home page (search + Google Maps)
│   ├── UserLogin.html        ← Citizen login page
│   ├── DirectorLogin.html    ← Director login page
│   ├── register.html         ← New user registration page
│   ├── UserProfile.html      ← Citizen's profile (shows their county alerts)
│   ├── directorProfile.html  ← Director's dashboard (post new alerts)
│   ├── results.html          ← County search results page
│   │
│   ├── NavBar.js             ← Builds the navigation bar dynamically
│   ├── login.js              ← Handles citizen login (calls backend + stores session)
│   ├── register.js           ← Handles new user signup
│   ├── triggerAlert.js       ← Director posts a new alert
│   ├── UserProfile.js        ← Loads county alerts for the logged-in citizen
│   ├── DirectorProfile.js    ← Loads director info on their dashboard
│   ├── search.js             ← (Database search utility — mostly unused)
│   │
│   ├── IndexStyles.css       ← Main page styles
│   ├── UserLogin.css         ← Login page styles
│   ├── combined_styles.css   ← Additional shared styles
│   ├── results.css           ← Search results styles
│   ├── mobile.css            ← Mobile-specific styles
│   │
│   └── introductionSite/     ← Team member intro pages (not part of the app)
│
├── credentials/              ← SSH keys and server info (do NOT commit these)
│   ├── Software_Engineering.pem  ← SSH private key for the old EC2 server
│   └── README.md             ← Instructions for connecting to the old server
│
├── Milestones/               ← Class project milestone documents
└── README.md                 ← Project overview
```

---

## 5. Database Design

The database is named `TEST648` and has 6 tables. Here's what each one stores:

### County
Stores the California counties the app knows about.

| Column | Type | Description |
|--------|------|-------------|
| County_ID | INTEGER | Unique ID (auto-generated) |
| County_Name | VARCHAR | Name of the county (e.g. "CountyA") |
| Latitude | DECIMAL | GPS latitude for placing on the map |
| Longitude | DECIMAL | GPS longitude |
| Image_Path | VARCHAR | Path to the county emblem image |

**Seed data:** CountyA, CountyB, CountyC (placeholder names — not real CA counties)

---

### User
Stores registered users.

| Column | Type | Description |
|--------|------|-------------|
| User_ID | VARCHAR(55) | The Firebase UID (a unique string like "abc123xyz") |
| Password | VARCHAR | Password hash — but see note below |
| Email_Address | VARCHAR | User's email (must be unique) |
| Phone_Number | BIGINT | Phone number |
| Role | TEXT | "P1" = Director, "P2" = Citizen, "P3" = Unknown |
| County_ID | INTEGER | Which county this user belongs to |
| Verified | INTEGER | 0 = not verified, 1 = verified |

> **Bug:** The `Password` column stores a Firebase-generated hash string, not a bcrypt hash. The `bcrypt` package is installed but never called anywhere in the code. This means the password stored in MySQL is not actually used for anything — Firebase handles all authentication. The MySQL password field is essentially dead weight.

---

### Department
Stores the four types of government departments.

| Column | Type | Description |
|--------|------|-------------|
| Department_ID | INTEGER | Unique ID |
| Department_Name | TEXT | One of: Sheriff/Security, Weather, Health, Fire |
| County_ID | INTEGER | Which county this department belongs to |

---

### Metrics
Stores safety metric readings from departments (e.g. air quality index, fire risk level).

| Column | Type | Description |
|--------|------|-------------|
| Metric_ID | INTEGER | Unique ID |
| Department_ID | INTEGER | Which department recorded this |
| County_ID | INTEGER | Which county |
| Metric_Type | VARCHAR | Description of the metric (e.g. "FireMetric1") |
| Metric_Value | DECIMAL | Numeric value of the metric |
| Timestamp | DATETIME | When it was recorded |

> **Note:** Metrics are only used to link Alerts to a department type. In practice, the app uses the Metric_ID as a category ID (1=Security, 2=Health, 3=Weather, 4=Fire). This is a confusing design — the Metric_ID is treated like a type code.

---

### Alert
Stores emergency alerts posted by directors.

| Column | Type | Description |
|--------|------|-------------|
| Alert_ID | INTEGER | Unique ID |
| Metric_ID | INTEGER | Category of alert (1=Security, 2=Weather, 3=Health, 4=Fire) |
| Alert_Message | TEXT | The alert message text |
| Triggered_By | INTEGER | User_ID of the director who posted it |
| Timestamp | DATETIME | When the alert was created |
| County_ID | INTEGER | Which county this alert is for |

> **Note:** `County_ID` was added to the Alert table after the initial design via an `ALTER TABLE` statement in `database.js`. The `TEST648.sql` file does not include this column — the two files are out of sync.

---

### User_Alerts
A junction table connecting users to alerts. Tracks which alerts a user is subscribed to.

| Column | Type | Description |
|--------|------|-------------|
| User_ID | INTEGER | References User table |
| Alert_ID | INTEGER | References Alert table |

> This is a **many-to-many** relationship — one user can have many alerts, and one alert can affect many users. This is the correct design pattern for this use case.

---

### Entity Relationship Diagram (Text)

```
County ──── Department ──── Metrics ──── Alert
  │                                        │
  └──────────── User ──── User_Alerts ─────┘
```

- A County has many Departments
- A Department has many Metrics
- A Metric is linked to many Alerts
- A User belongs to one County
- User_Alerts links Users to Alerts (many-to-many)

---

## 6. How the Backend Works

**File:** [application/server.js](application/server.js)

The backend is a single Express.js file. When you run `node server.js`:
1. It connects to MySQL
2. It registers all API routes
3. It starts listening on port 3000
4. It serves all HTML/CSS/JS files as static files from the same folder

All API routes are defined inside a function called `startServer()`. There are no separate controller or route files — everything is in one place.

### API Endpoints

| Method | URL | What it does |
|--------|-----|-------------|
| GET | `/api/county` | Search counties by name, optionally filter alerts by type (health/fire/weather) |
| GET | `/api/countyById` | Get a single county by its ID |
| GET | `/api/alert` | Search alerts by message text |
| POST | `/api/alert` | Create a new alert (used by directors) |
| POST | `/api/submit-registration` | Register a new user (Firebase + MySQL) |
| POST | `/api/user` | Log in (Firebase + MySQL lookup) |
| GET | `/api/department` | Search departments by name |
| GET | `/api/metrics` | Search metrics by type |
| GET | `/api/user_alerts` | Get all user-alert relationships |
| GET | `/` | Serve the home page (index.html) |

---

## 7. How the Frontend Works

The frontend is traditional multi-page HTML. There is no single-page app framework. Each page is its own `.html` file that loads its own JavaScript files via `<script>` tags.

### Session / State Management
User session data is stored in the browser's **localStorage** (not cookies, not a server session). These keys are set on login and cleared on logout:

| Key | Value |
|-----|-------|
| `refresh_token` | Firebase refresh token (proves the user is logged in) |
| `user_id` | Firebase UID of the logged-in user |
| `user_role` | "director" or "citizen" |
| `county` | The County_ID the user belongs to |

### Navigation Bar
**File:** [application/NavBar.js](application/NavBar.js)

The nav bar is built dynamically by JavaScript — not written in HTML. On every page load, `NavBar.js` checks `localStorage` for `user_role` and `refresh_token`, then builds different nav links depending on who is logged in:

- **Not logged in:** Home, Register, User Login, County Department Login
- **Logged in as citizen:** Home, User Profile, Logout
- **Logged in as director:** Home, Director Profile, Logout

---

## 8. How Each User Flow Works

### Flow 1: New User Registers

```
User fills register.html form
  → register.js collects: email, password, role, county
  → POST /api/submit-registration
    → server.js creates Firebase account (Firebase generates a UID)
    → server.js looks up County_ID from county name
    → server.js inserts user into MySQL User table (using Firebase UID as User_ID)
  → On success → redirect to UserLogin.html
```

**Files involved:** [register.html](application/register.html), [register.js](application/register.js), [server.js](application/server.js) line 179

---

### Flow 2: User Logs In

```
User fills UserLogin.html form
  → login.js collects: email, password
  → POST /api/user
    → server.js calls Firebase signInWithEmailAndPassword
    → Firebase verifies the credentials
    → server.js queries MySQL for the user's role and county
    → Returns: { role, county, Firebase user object }
  → login.js saves to localStorage: refresh_token, user_id, county, user_role
  → Redirect to home page (/)
```

**Files involved:** [UserLogin.html](application/UserLogin.html), [login.js](application/login.js), [server.js](application/server.js) line 202

---

### Flow 3: Citizen Views Their Profile

```
UserProfile.html loads
  → UserProfile.js reads county from localStorage
  → GET /api/countyById?countyID={county}
    → server.js queries MySQL: SELECT * FROM County WHERE County_ID LIKE ?
    → Returns county info
  → Page displays county information and alerts
```

**Files involved:** [UserProfile.html](application/UserProfile.html), [UserProfile.js](application/UserProfile.js), [server.js](application/server.js) line 83

---

### Flow 4: Director Posts an Alert

```
Director fills directorProfile.html form
  → triggerAlert.js collects: Alert_Message, Triggered_By, County_ID, Metric_ID
  → POST /api/alert
    → server.js inserts into MySQL Alert table with current Timestamp
  → On success → clears the form input
```

**Files involved:** [directorProfile.html](application/directorProfile.html), [triggerAlert.js](application/triggerAlert.js), [server.js](application/server.js) line 164

---

### Flow 5: Anyone Searches a County

```
Home page (index.html) has a search bar
  → User types county name and optionally picks a filter (health/weather/fire)
  → GET /api/county?searchTerm={name}&searchParam={type}
    → server.js queries MySQL for the county
    → Queries MySQL for alerts in that county (filtered by type if specified)
    → Returns: { county_information, alerts }
  → Page displays results + pins the county on the Google Map
```

**Files involved:** [index.html](application/index.html), [server.js](application/server.js) line 89

---

## 9. Known Bugs & Problems

### Security Issues
1. **Credentials hardcoded everywhere.** `database_config.json` has the MySQL password in plain text. `server.js` has the Firebase API key in plain text. If this code is pushed to GitHub as-is, these secrets are public. Fix: use a `.env` file.
2. **Google Maps API key exposed in HTML.** `index.html` has the API key in the `<script>` tag URL. Fix: restrict the key to your domain in Google Cloud Console.
3. **Seed data has plain-text passwords.** The `database.js` seed users have passwords like "password123" stored directly in the database — not hashed.

### Code Bugs
4. **`bcrypt` is installed but never used.** Passwords are not hashed with bcrypt anywhere. The Firebase UID's password hash is stored in MySQL but is never verified — Firebase handles all password verification directly.
5. **`database.js` and `TEST648.sql` are out of sync.** The `Alert` table in `database.js` adds a `County_ID` column via `ALTER TABLE` after creation, but `TEST648.sql` doesn't include this column. Running the SQL file directly would create a broken schema.
6. **`database.js` is never imported by `server.js`.** `server.js` creates its own separate MySQL connection. `database.js` creates a connection pool and seeds the database, but `server.js` never calls `require('./database')`. This means if you run `server.js` alone, the tables may not exist.
7. **`/api/user_alerts` ignores its query parameter.** The route accepts `searchTerm` but the SQL query ignores it and returns all rows: `SELECT * FROM User_Alerts`.
8. **Alert type mapping is inconsistent.** In `server.js`, Metric_ID 2 = Health and Metric_ID 3 = Weather. But in the search filter switch statement, `health` maps to `searchParamID = 3` and `weather` maps to `searchParamID = 2`. These are swapped.
9. **All frontend API URLs point to the dead server.** `login.js`, `register.js`, and `triggerAlert.js` all hardcode `http://softwareengineering.servehttp.com:3000`. This URL is offline.

### Design Issues
10. **Role codes are cryptic.** P1, P2, P3 are not self-explanatory. Better names: `director`, `citizen`.
11. **No timestamps on User records.** You can't tell when a user registered.
12. **County seed data is fake.** CountyA, CountyB, CountyC with incorrect coordinates are placeholders — never replaced with real CA county data.
13. **`User_ID` column type mismatch.** In `TEST648.sql`, `User_ID` is `VARCHAR(55) PRIMARY KEY AUTO_INCREMENT` — but `AUTO_INCREMENT` doesn't work on VARCHAR columns. In practice, the Firebase UID (a string) is inserted manually, so it works anyway, but the schema definition is technically invalid.
14. **No input validation on the backend.** API endpoints do not check if required fields are present before running SQL queries.

---

## 10. Dependencies Explained

**File:** [application/package.json](application/package.json)

| Package | What it does | Still needed? |
|---------|-------------|---------------|
| `express` | Web server framework | Yes |
| `cors` | Allows browser to call the API from a different domain | Yes |
| `mysql2` | MySQL database driver | Yes |
| `firebase` | Firebase client SDK (used for user auth) | Yes |
| `firebase-admin` | Firebase admin SDK (for server-side Firebase operations) | Partially — imported but admin features are commented out |
| `bcrypt` | Password hashing library | Installed but never used — can be removed or actually used |
| `body-parser` | Parses JSON request bodies | No longer needed — `express.json()` does this built-in |
| `node-fetch` | HTTP client for making fetch calls in Node | Not actively used |
| `ssh2` | SSH client for connecting to remote servers | Not needed in the app — leftover from server management |
| `fs` | Node.js file system module | Used only to read `database_config.json` — can be replaced with dotenv |
| `path` | Node.js path utilities | Used for serving static files |

---

## 11. What Was Working vs. What Was Broken

### What worked (when the server was alive):
- User registration and login via Firebase
- Posting alerts as a director
- Searching counties and viewing alerts
- Role-based navigation (different nav for directors vs. citizens)
- Google Maps integration on the home page

### What was broken or incomplete:
- Alert type mapping (health/weather IDs were swapped)
- `database.js` not connected to `server.js` (tables might not exist on fresh start)
- Password hashing (bcrypt installed but never called)
- `/api/user_alerts` query parameter ignored
- No real California county data (all placeholder data)
- No input validation anywhere in the backend
- All frontend URLs hardcoded to a dead server

---

*This document was created as part of the CaliSafety revival project.*

---

## 12. The Revival — What It Became

Most school projects die in a private repo. This one deserved better.

The team built California Safety Net in university — a county-based emergency alert system. Node.js, Express, MySQL, deployed on AWS EC2. Real team. Real architecture. Real late nights.

But like most school projects, it shipped barely holding together. Hardcoded credentials, fake placeholder counties, a server someone had to manually SSH into just to keep alive, and a bug silently returning wrong data for months.

It worked. But it wasn't production.

**Here's what the rebuilt version looks like:**

- **All 58 real California counties** — real names, real coordinates, real NWS FIPS zone codes
- **Live emergency alerts** from National Weather Service, USGS earthquakes, and CAL FIRE — pulled in real-time, no manual posting
- **Public dashboard** — no login required. Anyone can search any county and see live alerts immediately
- **Optional accounts** — users can sign up to save their county preference and get a personalized view
- **Hybrid architecture** — every county search triggers a live API fetch merged with the alert history DB on the fly. No cron jobs. No stale data.
- **Migrated off EC2 entirely** — Vercel + Railway on the free tier, zero maintenance overhead
- **All secrets moved to `.env`**, added to `.gitignore`, out of the codebase
- **Routes reorganized, dead packages removed, auth simplified, schema cleaned up**
- **Frontend updated** to show alert source badges — NWS, USGS, CAL FIRE

**The architecture decision worth highlighting:** instead of scheduled jobs pulling data in the background, alerts are fetched live at request time and merged with the database in a single response. Simpler system, always fresh, runs perfectly on a free tier.

Claude Code was used to help navigate the old codebase. Every architectural decision, every integration choice, every call about what to keep vs. throw away — that thinking belongs to the engineer.

---

## 13. Revival Progress Tracker

### Completed

**Phase 1 — Clean House** ✅
- `.gitignore` updated — `.env`, `firebase-key.json`, `database_config.json` now protected from being pushed to GitHub
- Deleted dead/unused files: `database.js`, `database_config.json`, `firebase-key.json`, `search.js`, `data.json`, `Notifications.js`, `test.png`, `results.html`, `introductionSite/`
- Deleted director-only files: `triggerAlert.js`, `DirectorProfile.js`, `directorProfile.html`, `DirectorLogin.html`
- `package.json` cleaned: removed `bcrypt`, `body-parser`, `node-fetch`, `ssh2`, `fs`; added `dotenv`; renamed project to `calisafety` v2.0

**Phase 2 — Database** ✅
- Switched from MySQL (`mysql2`) to PostgreSQL (`pg`)
- New `schema.sql`: 3 clean tables — `county`, `user` (optional auth), `alert` (history log)
- New `seed.sql`: all 58 real California counties with real coordinates and NWS FIPS zone codes
- `.env` updated to use `DATABASE_URL` instead of 5 separate MySQL variables
- `server.js` rewritten: PostgreSQL pool, fixed SQL syntax, removed dead routes, added input validation

**Phase 3 — Live Data** ✅
- New `liveAlerts.js`: 3 functions that fetch from NWS, USGS, and CAL FIRE in parallel
- NWS API: live weather + fire weather alerts per county via FIPS zone code (no API key needed)
- USGS API: recent earthquakes within 80km of county centroid (no API key needed)
- CAL FIRE (NIFC): active fire incidents filtered by California county (no API key needed)
- `Promise.allSettled` — if one source fails, the others still return
- All alerts normalized to unified format: `{ source, alert_type, message, created_at }`
- Wired into `/api/county` route — live + DB history merged in a single response

---

### Remaining

**Phase 4 — Frontend** (in progress)
- [ ] Update `schema.sql` to final state (role column removed from user, alert history logging)
- [ ] Update `server.js` auth routes — remove director role, simplify registration/login
- [ ] Update `index.html` — fix dead URL, update field names, add source badges, add earthquake filter, clean up
- [ ] Update `login.js` — fix dead URL, simplify role handling (single user type)
- [ ] Update `register.js` — fix dead URL
- [ ] Update `register.html` — remove broken bcrypt script, remove duplicate tags, clean up
- [ ] Update `UserProfile.js` — fix dead URLs, update field names, add source badges
- [ ] Update `NavBar.js` — remove director/citizen distinction, single user nav
- [ ] Update `UserProfile.html` — minor cleanup

**Phase 5 — Deploy**
- [ ] Set up Railway project, create PostgreSQL database
- [ ] Run `schema.sql` and `seed.sql` on Railway database
- [ ] Set up Vercel project, connect to GitHub repo
- [ ] Add all `.env` variables to Vercel and Railway dashboards
- [ ] Test live deployment
- [ ] Restrict Google Maps API key to production domain in Google Cloud Console