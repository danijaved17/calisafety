// liveAlerts.js — fetches real-time emergency data from 3 public APIs
//
// All 3 functions return alerts in the same normalized shape:
// { source, alert_type, message, created_at }
//
// They are called in parallel from server.js and merged with manual DB alerts.
// If any source fails (network down, API issue), it returns [] so the others still work.

// --- NWS (National Weather Service) ---
// Fetches active weather alerts for a county using its NWS zone code (e.g. CAC001)
// Also returns fire weather alerts (Red Flag Warnings, Fire Weather Watches)
// Docs: https://www.weather.gov/documentation/services-web-api
async function fetchNWSAlerts(nwsZoneCode) {
    try {
        const res = await fetch(`https://api.weather.gov/alerts/active?zone=${nwsZoneCode}`, {
            headers: {
                // NWS requires a User-Agent header — identify your app + contact
                'User-Agent': 'CaliSafety/2.0 (https://github.com/calisafety)',
                'Accept': 'application/geo+json',
            }
        });
        if (!res.ok) return [];
        const data = await res.json();
        return (data.features || []).map(f => {
            const p = f.properties;
            const isFireRelated = p.event && (
                p.event.toLowerCase().includes('fire') ||
                p.event.toLowerCase().includes('red flag')
            );
            return {
                source: 'NWS',
                alert_type: isFireRelated ? 'fire' : 'weather',
                message: p.headline || `${p.event}: ${p.description || ''}`.trim(),
                created_at: p.effective || p.sent || new Date().toISOString(),
            };
        });
    } catch (error) {
        console.error('NWS fetch failed:', error.message);
        return [];
    }
}

// --- USGS (Earthquake Hazards Program) ---
// Fetches recent earthquakes within 80km of the county's centroid
// Only returns quakes magnitude 2.5+ to filter out minor tremors
// Docs: https://earthquake.usgs.gov/fdsnws/event/1/
async function fetchUSGSAlerts(latitude, longitude) {
    try {
        const url = new URL('https://earthquake.usgs.gov/fdsnws/event/1/query');
        url.searchParams.set('format', 'geojson');
        url.searchParams.set('latitude', latitude);
        url.searchParams.set('longitude', longitude);
        url.searchParams.set('maxradiuskm', '80');
        url.searchParams.set('minmagnitude', '2.5');
        url.searchParams.set('orderby', 'time');
        url.searchParams.set('limit', '10');

        const res = await fetch(url.toString());
        if (!res.ok) return [];
        const data = await res.json();
        return (data.features || []).map(f => ({
            source: 'USGS',
            alert_type: 'earthquake',
            message: f.properties.title,
            created_at: new Date(f.properties.time).toISOString(),
        }));
    } catch (error) {
        console.error('USGS fetch failed:', error.message);
        return [];
    }
}

// --- CAL FIRE (National Interagency Fire Center) ---
// Fetches active fire incidents in California filtered by county name
// Uses the NIFC public ArcGIS REST API — no key required
// Docs: https://data-nifc.opendata.arcgis.com/
async function fetchCALFIREAlerts(countyName) {
    try {
        const where = `POOState='CA' AND POOCounty LIKE '%${countyName}%'`;
        const url = new URL('https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/Active_Fires/FeatureServer/0/query');
        url.searchParams.set('where', where);
        url.searchParams.set('outFields', 'IncidentName,GISAcres,PercentContained,FireDiscoveryDateTime,POOCounty');
        url.searchParams.set('f', 'json');

        const res = await fetch(url.toString());
        if (!res.ok) return [];
        const data = await res.json();
        if (!data.features) return [];

        return data.features.map(f => {
            const p = f.attributes;
            const acres = p.GISAcres ? ` — ${Math.round(p.GISAcres).toLocaleString()} acres` : '';
            const contained = p.PercentContained != null ? `, ${p.PercentContained}% contained` : '';
            return {
                source: 'CAL FIRE',
                alert_type: 'fire',
                message: `${p.IncidentName} fire${acres}${contained}`,
                created_at: p.FireDiscoveryDateTime
                    ? new Date(p.FireDiscoveryDateTime).toISOString()
                    : new Date().toISOString(),
            };
        });
    } catch (error) {
        console.error('CAL FIRE fetch failed:', error.message);
        return [];
    }
}

module.exports = { fetchNWSAlerts, fetchUSGSAlerts, fetchCALFIREAlerts };
