const countyId = localStorage.getItem('county');
const resultsDiv = document.getElementById('results');

if (!countyId) {
    resultsDiv.innerHTML = '<p>No county saved. <a href="index.html">Search for a county</a> or <a href="register.html">register</a> to save one.</p>';
} else {
    fetch(`/api/countyById?countyID=${countyId}`)
        .then(res => res.json())
        .then(data => {
            if (!data || data.length === 0) {
                resultsDiv.innerHTML = '<p>County not found.</p>';
                return;
            }
            const countyName = data[0].name;

            fetch(`/api/county?searchTerm=${encodeURIComponent(countyName)}&searchParam=all`)
                .then(res => res.json())
                .then(data => {
                    const county = data.county_information;

                    const countyDiv = document.createElement('div');
                    countyDiv.innerHTML = `
                        <h2>${county.name} County</h2>
                        <p>Latitude: ${county.latitude} &nbsp; Longitude: ${county.longitude}</p>
                    `;
                    resultsDiv.appendChild(countyDiv);

                    const alerts = data.alerts;
                    if (alerts.length === 0) {
                        const noAlerts = document.createElement('p');
                        noAlerts.textContent = 'No active alerts for this county.';
                        resultsDiv.appendChild(noAlerts);
                        return;
                    }

                    const alertContainer = document.createElement('div');
                    alerts.forEach(alert => {
                        const alertDiv = document.createElement('div');
                        alertDiv.className = 'alert-card';
                        alertDiv.innerHTML = `
                            <span class="badge badge-${alert.source.toLowerCase().replace(' ', '-')}">${alert.source}</span>
                            <span class="badge badge-type">${alert.alert_type}</span>
                            <p>${alert.message}</p>
                            <small>${new Date(alert.created_at).toLocaleString()}</small>
                        `;
                        alertContainer.appendChild(alertDiv);
                    });
                    resultsDiv.appendChild(alertContainer);
                })
                .catch(() => {
                    resultsDiv.innerHTML = '<p>Error loading alerts.</p>';
                });
        })
        .catch(() => {
            resultsDiv.innerHTML = '<p>Error loading county data.</p>';
        });
}
