document.addEventListener("DOMContentLoaded", function () {
  // Define allowed Google Scholar domains
  const allowedDomains = [
    "scholar.google.com",
    "scholar.google.ae",
    "scholar.google.com.af",
    "scholar.google.com.ag",
    "scholar.google.com.ar",
    "scholar.google.com.au",
    "scholar.google.at",
    "scholar.google.az",
    "scholar.google.be",
    "scholar.google.com.bd",
    "scholar.google.by",
    "scholar.google.com.bo",
    "scholar.google.com.br",
    "scholar.google.ca",
    "scholar.google.cl",
    "scholar.google.cn",
    "scholar.google.com.co",
    "scholar.google.co.cr",
    "scholar.google.cz",
    "scholar.google.dk",
    "scholar.google.com.do",
    "scholar.google.com.ec",
    "scholar.google.com.eg",
    "scholar.google.es",
    "scholar.google.fi",
    "scholar.google.fr",
    "scholar.google.de",
    "scholar.google.gr",
    "scholar.google.com.hk",
    "scholar.google.hu",
    "scholar.google.co.id",
    "scholar.google.ie",
    "scholar.google.co.il",
    "scholar.google.co.in",
    "scholar.google.it",
    "scholar.google.co.jp",
    "scholar.google.jo",
    "scholar.google.kz",
    "scholar.google.co.kr",
    "scholar.google.com.kw",
    "scholar.google.lv",
    "scholar.google.lt",
    "scholar.google.com.my",
    "scholar.google.com.mx",
    "scholar.google.nl",
    "scholar.google.co.nz",
    "scholar.google.com.ng",
    "scholar.google.no",
    "scholar.google.com.pk",
    "scholar.google.com.pe",
    "scholar.google.com.ph",
    "scholar.google.pl",
    "scholar.google.pt",
    "scholar.google.com.qa",
    "scholar.google.ro",
    "scholar.google.ru",
    "scholar.google.com.sa",
    "scholar.google.com.sg",
    "scholar.google.sk",
    "scholar.google.si",
    "scholar.google.co.za",
    "scholar.google.se",
    "scholar.google.ch",
    "scholar.google.com.tw",
    "scholar.google.co.th",
    "scholar.google.com.tr",
    "scholar.google.com.ua",
    "scholar.google.co.uk",
    "scholar.google.com.uy",
    "scholar.google.co.ve",
    "scholar.google.com.vn",
  ];

  // Check if we're on a Google Scholar profile page
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const url = tabs[0].url;
    const urlObj = new URL(url);

    console.log("Current page:", urlObj.hostname, urlObj.pathname);

    // Check if we're on a valid Scholar domain
    if (!allowedDomains.includes(urlObj.hostname)) {
      document.getElementById("not-on-profile").style.display = "block";
      document.getElementById("profile-content").style.display = "none";
      document.getElementById("not-on-profile").innerHTML = `
        <p><strong>This extension only works on Google Scholar pages.</strong></p>
        <p>Please navigate to a Google Scholar profile page to use this extension.</p>
        <p>Example: <code>scholar.google.com/citations?user=...</code></p>
        <p><small>Current page: ${urlObj.hostname}</small></p>
      `;
      return;
    }

    // Check if we're on a citations/profile page (not just search results)
    if (!urlObj.pathname.startsWith("/citations")) {
      document.getElementById("not-on-profile").style.display = "block";
      document.getElementById("profile-content").style.display = "none";
      document.getElementById("not-on-profile").innerHTML = `
        <p><strong>Please navigate to a Scholar profile page.</strong></p>
        <p>This extension analyzes individual researcher profiles, not search results.</p>
        <p>Look for URLs like: <code>scholar.google.com/citations?user=...</code></p>
      `;
      return;
    }

    // We're on a valid Scholar profile page - show the main content
    document.getElementById("not-on-profile").style.display = "none";
    document.getElementById("profile-content").style.display = "block";

    // Setup analyze button
    const analyzeBtn = document.getElementById("analyze-btn");
    analyzeBtn.addEventListener("click", analyzeVenues);

    // Setup show more button
    const showMoreBtn = document.getElementById("show-more-btn");
    showMoreBtn.addEventListener("click", showAllVenues);
  });

  // Store venue data globally for show more/less functionality
  let allVenueData = [];

  // Function to analyze venues on the current profile
  function analyzeVenues() {
    // Show initial loading state
    const loadingDiv = document.getElementById("loading");
    loadingDiv.innerHTML = `
      <p>🔄 Initializing analysis...</p>
      <p><small>Preparing to analyze publication venues</small></p>
    `;
    loadingDiv.style.display = "block";
    document.getElementById("results").style.display = "none";
    document.getElementById("error").style.display = "none";

    // Disable analyze button during processing
    const analyzeBtn = document.getElementById("analyze-btn");
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "Analyzing...";

    // First, inject the content script dynamically to ensure it's available
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      // Execute content script in the current tab
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          files: ["content.js"],
        },
        function () {
          if (chrome.runtime.lastError) {
            console.error(
              "Error injecting content script:",
              chrome.runtime.lastError
            );
            showError(
              "Error loading extension. Please refresh the page and try again."
            );
            return;
          }

          // Immediately show step 1 (loading publications)
          loadingDiv.innerHTML = `
            <p>🔄 Step 1: Loading all publications...</p>
            <p><small>Automatically clicking "Show More" to load all publications</small></p>
          `;

          // After a brief moment, update to step 2
          setTimeout(() => {
            // Update to step 2
            loadingDiv.innerHTML = `
              <p>🔄 Step 2: Analyzing publication venues...</p>
              <p><small>Processing publications and normalizing venue names</small></p>
            `;

            // After content script is executed, send message to it
            chrome.tabs.sendMessage(
              tabs[0].id,
              { action: "analyzeVenues" },
              function (response) {
                // Re-enable analyze button
                analyzeBtn.disabled = false;
                analyzeBtn.textContent = "🔍 Analyze Publication Venues";

                // Hide loading indicator
                loadingDiv.style.display = "none";

                if (chrome.runtime.lastError) {
                  console.error("Runtime error:", chrome.runtime.lastError);
                  showError(
                    "Error communicating with the page. Please refresh and try again."
                  );
                  return;
                }

                // Handle the response with enhanced structure
                if (response && response.success && response.venues) {
                  displayResults(response);
                } else if (response && response.error) {
                  showError(`Analysis error: ${response.error}`);
                } else {
                  showError(
                    'Error analyzing profile. Please ensure the page is fully loaded and try again. You can also try manually clicking "SHOW MORE" on the Scholar page first.'
                  );
                }
              }
            );
          }, 800);
        }
      );
    });
  }

  // Function to show error messages
  function showError(message) {
    const errorDiv = document.getElementById("error");
    errorDiv.textContent = message;
    errorDiv.style.display = "block";

    // Re-enable analyze button if it was disabled
    const analyzeBtn = document.getElementById("analyze-btn");
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = "🔍 Analyze Publication Venues";
  }

  // Function to display the analysis results
  function displayResults(analysisData) {
    console.log(`📊 Processing analysis data:`, analysisData);

    // Extract data from the enhanced structure
    const venueData = analysisData.venues || [];
    const totalFound = analysisData.totalFound || 0;
    const totalProcessed = analysisData.totalProcessed || 0;
    const totalSkipped = analysisData.totalSkipped || 0;

    console.log(
      `📈 Display data - Found: ${totalFound}, Processed: ${totalProcessed}, Skipped: ${totalSkipped}, Unique: ${venueData.length}`
    );

    if (!venueData || venueData.length === 0) {
      showError("No publication venues found on this profile.");
      return;
    }

    const uniqueVenues = venueData.length;

    // Store all venue data for show more/less functionality
    allVenueData = venueData;

    // Show results container
    document.getElementById("results").style.display = "block";

    // Show detailed publication analysis with proper breakdown
    let countHtml = `<strong>📊 Analysis Complete:</strong><br>`;

    if (totalFound > 0) {
      countHtml += `Total publications found: <strong>${totalFound}</strong><br>`;

      if (totalProcessed > 0) {
        countHtml += `Publications with venue info: <strong>${totalProcessed}</strong><br>`;
      }

      if (totalSkipped > 0) {
        countHtml += `Skipped (no venue info): <strong>${totalSkipped}</strong><br>`;
      }
    } else {
      // Fallback for legacy format
      const totalFromVenues = venueData.reduce(
        (sum, item) => sum + item.count,
        0
      );
      countHtml += `Publications analyzed: <strong>${totalFromVenues}</strong><br>`;
    }

    countHtml += `Unique venues identified: <strong>${uniqueVenues}</strong>`;

    document.getElementById("publication-count").innerHTML = countHtml;

    // Initially display top 10 venues
    displayVenueTable(venueData.slice(0, 10));

    // Show "Show more" button if there are more than 10 venues
    const showMoreBtn = document.getElementById("show-more-btn");
    if (venueData.length > 10) {
      showMoreBtn.textContent = `📈 Show all ${venueData.length} venues`;
      showMoreBtn.style.display = "block";
    } else {
      showMoreBtn.style.display = "none";
    }

    // Add a clean note about the analysis
    const note = document.createElement("div");
    note.className = "analysis-note";
    note.style.marginTop = "15px";
    note.style.fontSize = "12px";
    note.style.color = "#666";
    note.innerHTML = `
      <p><strong>Note:</strong> Venue names are automatically normalized and grouped by standard abbreviations (e.g., "Proc. CVPR 2021" → "CVPR").</p>
    `;

    const resultsDiv = document.getElementById("results");
    // Remove any existing note first
    const existingNote = resultsDiv.querySelector(".analysis-note");
    if (existingNote) {
      existingNote.remove();
    }
    resultsDiv.appendChild(note);
  }

  // Function to show all venues
  function showAllVenues() {
    displayVenueTable(allVenueData);

    const showMoreBtn = document.getElementById("show-more-btn");
    showMoreBtn.textContent = "📊 Show top 10 venues";
    showMoreBtn.onclick = function () {
      displayVenueTable(allVenueData.slice(0, 10));
      showMoreBtn.textContent = `📈 Show all ${allVenueData.length} venues`;
      showMoreBtn.onclick = showAllVenues;
    };
  }

  // Function to create the venue table
  function displayVenueTable(venueData) {
    const tableBody = document.getElementById("venue-tbody");
    tableBody.innerHTML = "";

    venueData.forEach((item, index) => {
      const row = document.createElement("tr");

      const rankCell = document.createElement("td");
      rankCell.className = "venue-rank";
      rankCell.textContent = index + 1;

      const venueCell = document.createElement("td");
      venueCell.textContent = item.venue;
      venueCell.style.fontSize = "14px";

      const countCell = document.createElement("td");
      countCell.className = "venue-count";
      countCell.textContent = item.count;
      countCell.style.fontWeight = "bold";

      row.appendChild(rankCell);
      row.appendChild(venueCell);
      row.appendChild(countCell);
      tableBody.appendChild(row);
    });
  }
});
