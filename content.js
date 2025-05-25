(function () {
  // Global flag to prevent multiple analyses - using window object to make it truly global
  if (window.scholarAnalyzerRunning) {
    console.log(
      "⚠️ Scholar analyzer already loaded - skipping duplicate injection"
    );
    return;
  }
  window.scholarAnalyzerRunning = true;

  // Prevent multiple simultaneous executions
  let isAnalyzing = false;

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
  ) {
    if (request.action === "analyzeVenues") {
      // Prevent multiple simultaneous analyses
      if (isAnalyzing) {
        console.log(
          "⚠️ Analysis already in progress - ignoring duplicate request"
        );
        sendResponse({ error: "Analysis already in progress - please wait" });
        return true;
      }

      isAnalyzing = true;
      console.log("🚀 Starting venue analysis...");

      analyzeAllVenues()
        .then((analysisData) => {
          isAnalyzing = false;
          console.log("✅ Analysis completed successfully");
          console.log("📤 About to send response:", analysisData);
          sendResponse(analysisData); // Send the enhanced structure
        })
        .catch((error) => {
          isAnalyzing = false;
          console.error("❌ Analysis failed:", error);
          sendResponse({ error: error.message, success: false });
        });
      return true; // Required for async response
    }
  });

  // Main function to analyze all venues with pagination support
  async function analyzeAllVenues() {
    try {
      console.log("🚀 === STARTING COMPLETE ANALYSIS ===");

      // Step 1: Count initial publications
      const initialCount = document.querySelectorAll("tr.gsc_a_tr").length;
      console.log(`📊 Initial publications visible: ${initialCount}`);

      // Quick validation
      if (initialCount === 0) {
        throw new Error(
          "No publications found on this page. Make sure you are on a Google Scholar profile page with publications."
        );
      }

      // Step 2: Load ALL publications first (complete pagination)
      console.log("🔄 Starting pagination to load ALL publications...");
      const finalCount = await loadAllPublications();

      // Step 3: Verify we loaded publications
      console.log(
        `📊 Pagination result: ${finalCount} total publications now visible`
      );

      if (finalCount === initialCount) {
        console.log(
          "ℹ️ No additional publications loaded - either all were already visible or pagination failed"
        );
      } else {
        console.log(
          `✅ Successfully loaded ${
            finalCount - initialCount
          } additional publications via pagination`
        );
      }

      // Step 4: Double-check the count before analysis
      const actualCount = document.querySelectorAll("tr.gsc_a_tr").length;
      console.log(
        `🎯 About to analyze ${actualCount} publications (cross-check: ${finalCount})`
      );

      if (actualCount !== finalCount) {
        console.warn(
          `⚠️ Count mismatch detected: expected ${finalCount}, found ${actualCount}`
        );
      }

      // Step 5: NOW analyze all the loaded publications
      console.log(`🔍 Now analyzing ALL ${actualCount} loaded publications...`);
      const venueAnalysisResult = extractVenueData();

      // Validation
      if (venueAnalysisResult.venues.length === 0) {
        throw new Error(
          "No venues could be extracted from the publications. Please check the page format."
        );
      }

      // Calculate total publications from venue data as final validation
      const totalPubsFromVenues = venueAnalysisResult.venues.reduce(
        (sum, item) => sum + item.count,
        0
      );

      console.log("🎉 ANALYSIS COMPLETE! 🎉");
      console.log(
        `📈 Found ${venueAnalysisResult.venues.length} unique venues from ${actualCount} publications`
      );
      console.log(
        `🔢 Cross-check: venue data accounts for ${totalPubsFromVenues} publications`
      );

      // Return enhanced structure with all the details
      return {
        venues: venueAnalysisResult.venues,
        totalFound: actualCount,
        totalProcessed: venueAnalysisResult.processedCount,
        totalSkipped: venueAnalysisResult.skippedCount,
        success: true,
      };
    } catch (error) {
      console.error("❌ Error in analyzeAllVenues:", error);
      throw error;
    }
  }

  // Debug function to see what buttons exist on the page
  function debugPageButtons() {
    console.log("=== DEBUGGING PAGE BUTTONS ===");

    // Check all buttons on the page
    const allButtons = document.querySelectorAll(
      'button, a[role="button"], span[role="button"]'
    );
    console.log(`Found ${allButtons.length} clickable elements on page`);

    allButtons.forEach((btn, index) => {
      const text = btn.textContent.trim();
      const id = btn.id;
      const classes = btn.className;
      const onclick = btn.getAttribute("onclick");

      if (
        text.toLowerCase().includes("more") ||
        text.toLowerCase().includes("show") ||
        id.includes("more") ||
        onclick?.includes("more")
      ) {
        console.log(`Potential "Show More" button ${index}:`, {
          text: text,
          id: id,
          classes: classes,
          onclick: onclick,
          visible: btn.offsetParent !== null,
          disabled: btn.disabled,
        });
      }
    });

    // Check specific elements that might be the show more button
    const gscButton = document.querySelector("#gsc_bpf_more");
    if (gscButton) {
      console.log("Found #gsc_bpf_more button:", {
        text: gscButton.textContent,
        visible: gscButton.offsetParent !== null,
        disabled: gscButton.disabled,
      });
    } else {
      console.log("No #gsc_bpf_more button found");
    }

    console.log("=== END DEBUG ===");
  }

  // Function to load all publications by handling pagination
  async function loadAllPublications() {
    let attempts = 0;
    const maxAttempts = 50;
    let publicationsBefore = document.querySelectorAll("tr.gsc_a_tr").length;

    console.log(
      `🔄 Starting pagination with ${publicationsBefore} publications`
    );

    while (attempts < maxAttempts) {
      // Look for "Show more" button
      let showMoreButton = await findShowMoreButton();

      if (!showMoreButton) {
        console.log(
          `✅ No show more button found after ${attempts} attempts - pagination complete`
        );
        break;
      }

      console.log(`📍 Attempt ${attempts + 1}: Clicking show more button`);

      try {
        // Click the button
        showMoreButton.click();

        // Wait a moment for the click to register and DOM to start updating
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Wait for new publications to load
        const newCount = await waitForNewPublications(
          publicationsBefore,
          15000
        );

        if (newCount === publicationsBefore) {
          console.log("⏹️ No new publications loaded - stopping pagination");
          break;
        }

        console.log(
          `📈 Loaded ${
            newCount - publicationsBefore
          } new publications (total: ${newCount})`
        );
        publicationsBefore = newCount;
        attempts++;

        // Add longer delay between attempts to avoid overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (error) {
        console.log("❌ Error during pagination:", error);
        break;
      }
    }

    const finalCount = document.querySelectorAll("tr.gsc_a_tr").length;
    console.log(
      `🏁 Pagination complete. Final count: ${finalCount} publications after ${attempts} attempts`
    );

    // Add a final wait to ensure DOM is completely stable
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return finalCount;
  }

  // Enhanced function to find the show more button
  async function findShowMoreButton() {
    // Wait a moment for any dynamic content to settle
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Try multiple selector strategies
    const selectors = [
      "#gsc_bpf_more",
      "button#gsc_bpf_more",
      ".gsc_pgn_pnx",
      'button[onclick*="gsc_pgn"]',
      'button[onclick*="more"]',
      ".gsc_pgn button",
    ];

    for (const selector of selectors) {
      const button = document.querySelector(selector);
      if (button) {
        const isVisible = button.offsetParent !== null;
        const isEnabled = !button.disabled;
        const hasContent = button.textContent.trim().length > 0;

        console.log(`🔍 Checking button with selector ${selector}:`, {
          visible: isVisible,
          enabled: isEnabled,
          hasContent: hasContent,
          text: button.textContent.trim(),
        });

        if (isVisible && isEnabled && hasContent) {
          console.log(
            `✅ Found valid show more button with selector: ${selector}`
          );
          return button;
        }
      }
    }

    // Text-based search as fallback
    const allButtons = Array.from(
      document.querySelectorAll('button, a, span[role="button"]')
    );
    const showMoreButton = allButtons.find((btn) => {
      const text = btn.textContent.toLowerCase().trim();
      const isVisible = btn.offsetParent !== null;
      const isEnabled = !btn.disabled;
      const hasShowMore =
        text.includes("show more") || text.includes("more") || text === "show";

      if (hasShowMore) {
        console.log(`🔍 Text-based button check:`, {
          text: text,
          visible: isVisible,
          enabled: isEnabled,
          hasShowMore: hasShowMore,
        });
      }

      return hasShowMore && isVisible && isEnabled;
    });

    if (showMoreButton) {
      console.log(
        `✅ Found show more button via text search: "${showMoreButton.textContent.trim()}"`
      );
    } else {
      console.log(`❌ No valid show more button found`);
    }

    return showMoreButton || null;
  }

  // Wait for new publications to be loaded after clicking "Show more"
  function waitForNewPublications(previousCount, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let checkCount = 0;

      const checkForNewPublications = () => {
        checkCount++;
        const currentCount = document.querySelectorAll("tr.gsc_a_tr").length;

        console.log(
          `Check ${checkCount}: Previous: ${previousCount}, Current: ${currentCount}`
        );

        if (currentCount > previousCount) {
          // New publications loaded
          console.log(
            `Success! Loaded ${currentCount - previousCount} new publications`
          );
          resolve(currentCount);
        } else if (Date.now() - startTime > timeout) {
          // Timeout - assume no more publications to load
          console.log(
            `Timeout after ${timeout}ms - no new publications loaded`
          );
          resolve(currentCount);
        } else {
          // Continue waiting, check more frequently at first
          const delay = checkCount < 10 ? 100 : 500;
          setTimeout(checkForNewPublications, delay);
        }
      };

      // Start checking after a short delay to allow for loading
      setTimeout(checkForNewPublications, 300);
    });
  }

  // Extract venue data from publication list with advanced normalization
  function extractVenueData() {
    // Get all publication entries currently visible
    const publications = document.querySelectorAll("tr.gsc_a_tr");
    console.log(
      `🔍 EXTRACTING VENUES: Found ${publications.length} total publications to analyze`
    );

    // Initialize venue counters
    let venues = {};
    let processedCount = 0;
    let skippedCount = 0;

    // Process each publication
    publications.forEach((pub, index) => {
      // The venue is typically in the third column (.gs_gray elements)
      const grayElements = pub.querySelectorAll(".gs_gray");
      let venueElement = null;

      // Try different approaches to find the venue
      if (grayElements.length >= 2) {
        venueElement = grayElements[1]; // Usually the second .gs_gray element
      } else if (grayElements.length === 1) {
        venueElement = grayElements[0];
      }

      // Alternative approach - look for venue in specific positions
      if (!venueElement) {
        venueElement =
          pub.querySelector("td:nth-child(3) .gs_gray") ||
          pub.querySelector(".gsc_a_j") ||
          pub.querySelector(".gs_gray");
      }

      if (venueElement) {
        // Extract venue name
        let venueText = venueElement.textContent.trim();
        let normalizedVenue = normalizeVenue(venueText);

        if (normalizedVenue) {
          venues[normalizedVenue] = (venues[normalizedVenue] || 0) + 1;
          processedCount++;
        } else {
          skippedCount++;
        }
      } else {
        console.log(`⚠️ No venue found for publication ${index + 1}`);
        skippedCount++;
      }
    });

    console.log(`✅ VENUE EXTRACTION COMPLETE:`);
    console.log(`   📊 Total publications found: ${publications.length}`);
    console.log(`   ✅ Successfully processed: ${processedCount}`);
    console.log(`   ⚠️ Skipped (no venue): ${skippedCount}`);
    console.log(`   🎯 Unique venues found: ${Object.keys(venues).length}`);

    // Convert to array and sort by count
    const venueArray = Object.entries(venues).map(([venue, count]) => ({
      venue,
      count,
    }));
    venueArray.sort((a, b) => b.count - a.count);

    return {
      venues: venueArray,
      processedCount: processedCount,
      skippedCount: skippedCount,
    };
  }

  // Enhanced function to normalize venue names
  function normalizeVenue(venueText) {
    // Skip empty venues
    if (!venueText) return null;

    // Remove trailing ellipsis and clean up
    venueText = venueText.replace(/…$/, "").trim();

    // Remove year citations and volume/issue numbers
    venueText = venueText.replace(/\s*,?\s*\d{4}(\s|$)/, " ");
    venueText = venueText.replace(/\s*,?\s*\d+(\s*\(\d+\))?(\s|$)/, " ");
    venueText = venueText.replace(/\s*,?\s*pp?\s*[\d-]+/i, "");

    // Clean up extra whitespace
    venueText = venueText.replace(/\s+/g, " ").trim();

    // Major conferences and journals patterns (enhanced)

    // Computer Vision Conferences
    if (
      /computer vision and pattern recognition|cvpr|ieee.*?conference on computer vision|cvf.*?computer vision and pattern|proceedings.*?cvpr/i.test(
        venueText
      )
    ) {
      return "CVPR";
    }

    if (
      /international conference on computer vision|iccv|proceedings.*?iccv/i.test(
        venueText
      )
    ) {
      return "ICCV";
    }

    if (
      /european conference on computer vision|eccv|proceedings.*?eccv/i.test(
        venueText
      )
    ) {
      return "ECCV";
    }

    if (
      /winter conference on applications of computer vision|wacv/i.test(
        venueText
      )
    ) {
      return "WACV";
    }

    if (/british machine vision conference|bmvc/i.test(venueText)) {
      return "BMVC";
    }

    if (/asian conference on computer vision|accv/i.test(venueText)) {
      return "ACCV";
    }

    // Machine Learning Conferences
    if (
      /neural information processing systems|neurips|nips|advances in neural|proceedings.*?nips|proceedings.*?neurips/i.test(
        venueText
      )
    ) {
      return "NeurIPS";
    }

    if (
      /international conference on machine learning|icml|proceedings.*?icml/i.test(
        venueText
      )
    ) {
      return "ICML";
    }

    if (
      /international conference on learning representations|iclr/i.test(
        venueText
      )
    ) {
      return "ICLR";
    }

    if (
      /artificial intelligence and statistics|aistats|international conference on artificial intelligence and statistics/i.test(
        venueText
      )
    ) {
      return "AISTATS";
    }

    // AI Conferences
    if (
      /aaai|association for the advancement of artificial intelligence|national conference on artificial intelligence|proceedings.*?aaai/i.test(
        venueText
      )
    ) {
      return "AAAI";
    }

    if (
      /international joint conference on artificial intelligence|ijcai/i.test(
        venueText
      )
    ) {
      return "IJCAI";
    }

    if (/uncertainty in artificial intelligence|uai/i.test(venueText)) {
      return "UAI";
    }

    // NLP Conferences
    if (
      /association for computational linguistics|acl|proceedings.*?acl/i.test(
        venueText
      )
    ) {
      return "ACL";
    }

    if (/north american chapter|naacl|findings.*?naacl/i.test(venueText)) {
      return "NAACL";
    }

    if (
      /empirical methods in natural language processing|emnlp/i.test(venueText)
    ) {
      return "EMNLP";
    }

    if (
      /conference on computational natural language learning|conll/i.test(
        venueText
      )
    ) {
      return "CoNLL";
    }

    // Data Mining and Databases
    if (
      /sigkdd|knowledge discovery and data mining|kdd|proceedings.*?kdd/i.test(
        venueText
      )
    ) {
      return "ACM SIGKDD";
    }

    if (/international conference on data mining|icdm/i.test(venueText)) {
      return "ICDM";
    }

    if (
      /world wide web conference|www|international world wide web/i.test(
        venueText
      )
    ) {
      return "WWW";
    }

    // Robotics
    if (
      /international conference on robotics and automation|icra|robotics and automation/i.test(
        venueText
      )
    ) {
      return "ICRA";
    }

    if (/intelligent robots and systems|iros/i.test(venueText)) {
      return "IROS";
    }

    // Signal Processing
    if (
      /acoustics, speech and signal processing|icassp|international conference on acoustics/i.test(
        venueText
      )
    ) {
      return "ICASSP";
    }

    if (/international conference on image processing|icip/i.test(venueText)) {
      return "ICIP";
    }

    // Medical Imaging
    if (
      /medical image computing and computer-assisted intervention|miccai/i.test(
        venueText
      )
    ) {
      return "MICCAI";
    }

    if (/information processing in medical imaging|ipmi/i.test(venueText)) {
      return "IPMI";
    }

    // Graphics and Visualization
    if (
      /siggraph|computer graphics and interactive techniques/i.test(venueText)
    ) {
      return "SIGGRAPH";
    }

    if (/ieee visualization|vis\s|visualization conference/i.test(venueText)) {
      return "IEEE VIS";
    }

    // Journals - IEEE Transactions
    if (
      /transactions on pattern analysis and machine intelligence|tpami|ieee.*?pattern analysis/i.test(
        venueText
      )
    ) {
      return "IEEE TPAMI";
    }

    if (/transactions on image processing|tip/i.test(venueText)) {
      return "IEEE TIP";
    }

    if (/transactions on neural networks|tnn/i.test(venueText)) {
      return "IEEE TNN";
    }

    if (/transactions on cybernetics|tcyb/i.test(venueText)) {
      return "IEEE TCYB";
    }

    if (/transactions on multimedia|tmm/i.test(venueText)) {
      return "IEEE TMM";
    }

    // Other Major Journals
    if (/international journal of computer vision|ijcv/i.test(venueText)) {
      return "IJCV";
    }

    if (/journal of machine learning research|jmlr/i.test(venueText)) {
      return "JMLR";
    }

    if (/machine learning|^ml\s/i.test(venueText)) {
      return "Machine Learning Journal";
    }

    if (/computer vision and image understanding|cviu/i.test(venueText)) {
      return "CVIU";
    }

    if (/pattern recognition letters|pattern recognition \d/i.test(venueText)) {
      return "Pattern Recognition";
    }

    if (/medical image analysis/i.test(venueText)) {
      return "Medical Image Analysis";
    }

    if (/neurocomputing/i.test(venueText)) {
      return "Neurocomputing";
    }

    if (/ieee access/i.test(venueText)) {
      return "IEEE Access";
    }

    // Preprints and Other Sources
    if (/arxiv|corr/i.test(venueText)) {
      return "arXiv";
    }

    if (/biorxiv/i.test(venueText)) {
      return "bioRxiv";
    }

    if (/patent|us patent/i.test(venueText)) {
      return "US Patents";
    }

    // Publishers
    if (/springer|lecture notes in computer science|lncs/i.test(venueText)) {
      return "Springer";
    }

    if (/mit press/i.test(venueText)) {
      return "MIT Press";
    }

    // High-impact journals
    if (/^science\s|\sscience\s/i.test(venueText)) {
      return "Science";
    }

    if (/nature communications/i.test(venueText)) {
      return "Nature Communications";
    }

    if (/nature machine intelligence/i.test(venueText)) {
      return "Nature Machine Intelligence";
    }

    if (
      /proceedings of the national academy of sciences|pnas/i.test(venueText)
    ) {
      return "PNAS";
    }

    // Workshop and other venues
    if (/workshop/i.test(venueText)) {
      // Try to extract the main conference name
      if (/cvpr.*?workshop|workshop.*?cvpr/i.test(venueText)) {
        return "CVPR Workshop";
      } else if (/iccv.*?workshop|workshop.*?iccv/i.test(venueText)) {
        return "ICCV Workshop";
      } else if (
        /neurips.*?workshop|workshop.*?neurips|nips.*?workshop/i.test(venueText)
      ) {
        return "NeurIPS Workshop";
      } else {
        return "Workshop";
      }
    }

    // Generic fallback with better cleaning
    let simplifiedVenue = venueText.split(/[,.(]/)[0].trim();

    // Remove common prefixes and suffixes
    simplifiedVenue = simplifiedVenue.replace(
      /^(proceedings of |proceedings |proc\.?\s+)/i,
      ""
    );
    simplifiedVenue = simplifiedVenue.replace(/\s+(proceedings|proc\.?)$/i, "");

    // Remove years and numbers from the end
    simplifiedVenue = simplifiedVenue.replace(/\s+\d{4}$/, "");
    simplifiedVenue = simplifiedVenue.replace(/\s+\d+$/, "");

    // Clean up and return
    simplifiedVenue = simplifiedVenue.trim();

    return simplifiedVenue || null;
  }
})();
