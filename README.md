# CaliSafety

A public emergency alert dashboard for all 58 California counties, pulling live data from NWS, USGS, and CAL FIRE.

## What it does

- Search any California county for active weather alerts, wildfires, and earthquakes
- Detect your location automatically
- View alerts on an interactive Google Maps map
- Optional user accounts to save your home county

No login required to use the app.

## Tech stack

- **Frontend:** HTML, CSS (mobile-first), JavaScript
- **Backend:** Node.js + Express.js
- **Database:** PostgreSQL
- **Auth:** Firebase Authentication (optional)
- **Live data sources:**
  - [NWS Alerts API](https://www.weather.gov/documentation/services-web-api) — weather alerts
  - [USGS Earthquake API](https://earthquake.usgs.gov/fdsnws/event/1/) — earthquakes
  - [NIFC ArcGIS / CAL FIRE](https://data-nifc.opendata.arcgis.com/) — active fires

## Running locally

```bash
cd application
npm install
# create a .env file — see .env.example
node server.js
```

## Deployment

Hosted on Vercel (frontend + API) with a Railway PostgreSQL database.
