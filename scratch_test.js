(async () => {
    const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzIEaVME7fq3K-ixNj8MV8IhvzLru_BkpqQbI6cGFJt4404aBcNnBO6JQbDWCoGb5iJ/exec";
    const SHEET_ID = "1yDUS6YrkU2wbXse0iPuHdfj06zgOiEtZGCqS9BqR9uQ";
    
    const formattedRows = [
        [
            "TestCountry",
            "TestRegion",
            "Test Person",
            "Developer",
            "test@test.com",
            "12345",
            "TestOrg",
            "1 Yıl",
            "2026-05-19",
            "TestPermit",
            "Evet",
            "100",
            "USD",
            "1 Yıl",
            "1 Ay",
            "TestNote",
            "Challenges",
            "Changes",
            "Tips",
            "Urgent",
            new Date().toLocaleString('tr-TR')
        ]
    ];

    try {
        console.log("Sending direct post to Apps Script URL...");
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ rows: formattedRows, sheetId: SHEET_ID })
        });
        
        console.log("Status:", response.status);
        console.log("Status Text:", response.statusText);
        const bodyText = await response.text();
        console.log("Response Body (first 500 chars):", bodyText.substring(0, 500));
    } catch (e) {
        console.error("Fetch failed:", e);
    }
})();
