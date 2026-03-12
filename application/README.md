# application/

All source code for the CaliSafety app lives here.

## Key files

| File | Purpose |
|------|---------|
| `server.js` | Express API server |
| `liveAlerts.js` | Fetches live data from NWS, USGS, CAL FIRE |
| `schema.sql` | PostgreSQL table definitions |
| `seed.sql` | All 58 CA counties with coordinates + NWS zone codes |
| `index.html` | Main search page |
| `UserLogin.html` | Login page |
| `register.html` | Registration page |
| `UserProfile.html` | Saved county alerts page |
| `styles.css` | Single mobile-first stylesheet |
| `NavBar.js` | Shared navigation bar |

## Environment variables

Copy `.env.example` to `.env` and fill in your values before running.
