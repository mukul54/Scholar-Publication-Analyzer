document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on a Google Scholar profile page
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const url = tabs[0].url;
      
      if (!url.includes('scholar.google.com/citations')) {
        document.getElementById('not-on-profile').style.display = 'block';
        document.getElementById('profile-content').style.display = 'none';
        return;
      }
      
      // Setup analyze button
      const analyzeBtn = document.getElementById('analyze-btn');
      analyzeBtn.addEventListener('click', analyzeVenues);
      
      // Setup show more button
      const showMoreBtn = document.getElementById('show-more-btn');
      showMoreBtn.addEventListener('click', showAllVenues);
    });
    
    // Store venue data globally for show more/less functionality
    let allVenueData = [];
    
    // Function to analyze venues on the current profile
    function analyzeVenues() {
      // Show loading state
      document.getElementById('loading').style.display = 'block';
      document.getElementById('results').style.display = 'none';
      document.getElementById('error').style.display = 'none';
      
      // First, inject the content script dynamically to ensure it's available
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        // Execute content script in the current tab
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
          files: ['content.js']
        }, function() {
          // After content script is executed, send message to it
          chrome.tabs.sendMessage(
            tabs[0].id,
            {action: "analyzeVenues"},
            function(response) {
              // Hide loading indicator
              document.getElementById('loading').style.display = 'none';
              
              if (response && response.venues) {
                displayResults(response.venues);
              } else {
                document.getElementById('error').textContent = 'Error analyzing profile. Please try refreshing the page.';
                document.getElementById('error').style.display = 'block';
              }
            }
          );
        });
      });
    }
    
    // Function to display the analysis results
    function displayResults(venueData) {
      if (venueData.length === 0) {
        document.getElementById('error').textContent = 'No publication venues found on this profile.';
        document.getElementById('error').style.display = 'block';
        return;
      }
      
      // Store all venue data for show more/less functionality
      allVenueData = venueData;
      
      // Show results container
      document.getElementById('results').style.display = 'block';
      
      // Show total publications analyzed
      const totalPubs = venueData.reduce((sum, item) => sum + item.count, 0);
      document.getElementById('publication-count').textContent = 
        `Total publications analyzed: ${totalPubs}`;
      
      // Initially display top 10 venues
      displayVenueTable(venueData.slice(0, 10));
      
      // Show "Show more" button if there are more than 10 venues
      const showMoreBtn = document.getElementById('show-more-btn');
      if (venueData.length > 10) {
        showMoreBtn.textContent = `Show all venues (${venueData.length} total)`;
        showMoreBtn.style.display = 'block';
      } else {
        showMoreBtn.style.display = 'none';
      }
    }
    
    // Function to show all venues
    function showAllVenues() {
      displayVenueTable(allVenueData);
      document.getElementById('show-more-btn').style.display = 'none';
    }
    
    // Function to create the venue table
    function displayVenueTable(venueData) {
      const tableBody = document.getElementById('venue-tbody');
      tableBody.innerHTML = '';
      
      venueData.forEach((item, index) => {
        const row = document.createElement('tr');
        
        const rankCell = document.createElement('td');
        rankCell.className = 'venue-rank';
        rankCell.textContent = index + 1;
        
        const venueCell = document.createElement('td');
        venueCell.textContent = item.venue;
        
        const countCell = document.createElement('td');
        countCell.className = 'venue-count';
        countCell.textContent = item.count;
        
        row.appendChild(rankCell);
        row.appendChild(venueCell);
        row.appendChild(countCell);
        tableBody.appendChild(row);
      });
    }
  });