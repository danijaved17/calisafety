require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const firebase = require('firebase/app');
const firebaseAuth = require('firebase/auth');
const { fetchNWSAlerts, fetchUSGSAlerts, fetchCALFIREAlerts } = require('./liveAlerts');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Firebase config — values come from .env
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
};

// PostgreSQL connection pool — DATABASE_URL comes from .env
// On Railway, this is set automatically in your project dashboard
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function startServer() {
    try {
        await pool.query('SELECT 1');
        console.log('Connected to PostgreSQL');

        // --- COUNTY ROUTES ---

        // GET /api/counties — all 58 counties, used to populate search and map
        app.get('/api/counties', async (_req, res) => {
            try {
                const { rows } = await pool.query('SELECT * FROM county ORDER BY name');
                res.status(200).json(rows);
            } catch (error) {
                console.error('Error fetching counties:', error);
                res.status(500).json({ error: 'Failed to fetch counties' });
            }
        });

        // GET /api/county?searchTerm=Los+Angeles&searchParam=fire
        // Core route: fetches live alerts from NWS, USGS, CAL FIRE in parallel
        // and returns them merged in a single response
        app.get('/api/county', async (req, res) => {
            const { searchTerm, searchParam } = req.query;
            if (!searchTerm) {
                return res.status(400).json({ error: 'searchTerm is required' });
            }
            try {
                const countyResult = await pool.query(
                    'SELECT * FROM county WHERE name ILIKE $1',
                    [`%${searchTerm}%`]
                );
                if (countyResult.rows.length === 0) {
                    return res.status(404).json({ error: 'County not found' });
                }
                const county = countyResult.rows[0];

                // Fetch live alerts from all 3 sources in parallel
                // Promise.allSettled: if one source is down, the others still return
                const [nwsResult, usgsResult, calfireResult] = await Promise.allSettled([
                    fetchNWSAlerts(county.nws_zone_code),
                    fetchUSGSAlerts(county.latitude, county.longitude),
                    fetchCALFIREAlerts(county.name),
                ]);

                const nwsAlerts     = nwsResult.status     === 'fulfilled' ? nwsResult.value     : [];
                const usgsAlerts    = usgsResult.status    === 'fulfilled' ? usgsResult.value    : [];
                const calfireAlerts = calfireResult.status === 'fulfilled' ? calfireResult.value : [];

                let allAlerts = [...nwsAlerts, ...usgsAlerts, ...calfireAlerts];

                // Apply filter if provided (e.g. searchParam=fire)
                if (searchParam && searchParam !== 'all') {
                    allAlerts = allAlerts.filter(a => a.alert_type === searchParam);
                }

                res.status(200).json({
                    county_information: county,
                    alerts: allAlerts,
                });
            } catch (error) {
                console.error('Error fetching county:', error);
                res.status(500).json({ error: 'Failed to fetch county' });
            }
        });

        // GET /api/countyById?countyID=1 — used by the user profile page
        app.get('/api/countyById', async (req, res) => {
            const { countyID } = req.query;
            try {
                const { rows } = await pool.query(
                    'SELECT * FROM county WHERE county_id = $1',
                    [countyID]
                );
                res.status(200).json(rows);
            } catch (error) {
                console.error('Error fetching county by ID:', error);
                res.status(500).json({ error: 'Failed to fetch county' });
            }
        });

        // --- AUTH ROUTES ---
        // Login is optional — the public homepage works without it.
        // Users sign up only to save a county preference for their profile page.

        // POST /api/register — creates a Firebase account and saves user to DB
        app.post('/api/register', async (req, res) => {
            const { email, password, county } = req.body;
            if (!email || !password || !county) {
                return res.status(400).json({ error: 'email, password, and county are required' });
            }
            try {
                const fbapp = firebase.initializeApp(firebaseConfig, `register-${Date.now()}`);
                const auth = firebaseAuth.getAuth(fbapp);
                const userRecord = await firebaseAuth.createUserWithEmailAndPassword(auth, email, password);

                const countyResult = await pool.query(
                    'SELECT county_id FROM county WHERE name ILIKE $1',
                    [county]
                );
                if (countyResult.rows.length === 0) {
                    return res.status(400).json({ error: 'County not found' });
                }

                await pool.query(
                    'INSERT INTO "user" (user_id, email, county_id) VALUES ($1, $2, $3)',
                    [userRecord.user.uid, email, countyResult.rows[0].county_id]
                );

                res.status(200).json({ message: 'Registered successfully' });
            } catch (error) {
                console.error('Error registering:', error);
                if (error.code && error.code.startsWith('auth/')) {
                    return res.status(401).json({ code: error.code, message: error.message });
                }
                res.status(500).json({ error: 'Failed to register' });
            }
        });

        // POST /api/login — signs in via Firebase, returns the user's saved county
        app.post('/api/login', async (req, res) => {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ error: 'email and password are required' });
            }
            try {
                const fbapp = firebase.initializeApp(firebaseConfig, `login-${Date.now()}`);
                const auth = firebaseAuth.getAuth(fbapp);
                const userCredential = await firebaseAuth.signInWithEmailAndPassword(auth, email, password);

                const { rows } = await pool.query(
                    'SELECT * FROM "user" WHERE user_id = $1',
                    [userCredential.user.uid]
                );
                if (rows.length === 0) {
                    return res.status(404).json({ error: 'User not found' });
                }

                res.status(200).json({
                    county: rows[0].county_id,
                    user: userCredential.user,
                });
            } catch (error) {
                console.error('Error signing in:', error);
                if (error.code && error.code.startsWith('auth/')) {
                    return res.status(401).json({ code: error.code, message: error.message });
                }
                res.status(500).json({ error: 'Failed to sign in' });
            }
        });

        // --- DEFAULT ROUTE ---
        app.get('/', (_req, res) => {
            res.sendFile(path.join(__dirname, 'index.html'));
        });

        // --- SERVER STARTUP ---
        const port = process.env.PORT || 3000;
        const server = app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });

        const handleShutdown = async () => {
            console.log('Server shutting down...');
            server.close(async () => {
                await pool.end();
                console.log('PostgreSQL pool closed.');
                process.exit(0);
            });
        };

        process.on('SIGTERM', handleShutdown);
        process.on('SIGINT', handleShutdown);

    } catch (error) {
        console.error('Failed to start server:', error);
        await pool.end();
        process.exit(1);
    }
}

startServer();
