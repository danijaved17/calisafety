-- CaliSafety v2.0 — PostgreSQL Schema
-- Run this once on your Railway (or local) PostgreSQL instance.

-- County table: all 58 real California counties
-- nws_zone_code is used to query the NWS API: https://api.weather.gov/alerts/active?zone={code}
CREATE TABLE IF NOT EXISTS county (
    county_id     SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL UNIQUE,
    latitude      DECIMAL(9, 6) NOT NULL,
    longitude     DECIMAL(9, 6) NOT NULL,
    nws_zone_code VARCHAR(10) NOT NULL
);

-- User table: optional accounts for saving a county preference
-- user_id is the Firebase UID — set by Firebase on registration
-- Login is not required to use the app — this is for personalization only
CREATE TABLE IF NOT EXISTS "user" (
    user_id    VARCHAR(128) PRIMARY KEY,
    email      VARCHAR(255) UNIQUE NOT NULL,
    county_id  INTEGER REFERENCES county(county_id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Alert history table: logs alerts fetched from live APIs for historical reference
-- source: 'NWS' | 'USGS' | 'CAL FIRE'
-- alert_type: 'weather' | 'fire' | 'earthquake'
-- Note: the live APIs only return currently active alerts — this table preserves the history
CREATE TABLE IF NOT EXISTS alert (
    alert_id   SERIAL PRIMARY KEY,
    county_id  INTEGER NOT NULL REFERENCES county(county_id),
    source     VARCHAR(20) NOT NULL,
    alert_type VARCHAR(20) NOT NULL,
    message    TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
