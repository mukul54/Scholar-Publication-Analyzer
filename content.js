// content-script-with-json-mapping.js
(function () {
  const startTime = performance.now();
  console.log("🕐 Analysis started at:", new Date().toLocaleTimeString());

  // Global flag to prevent multiple analyses
  if (window.scholarAnalyzerRunning) {
    console.log(
      "⚠️ Scholar analyzer already loaded - skipping duplicate injection"
    );
    return;
  }
  window.scholarAnalyzerRunning = true;

  let isAnalyzing = false;
  let venueMapping = null;

  // Load venue mapping from JSON file
  async function loadVenueMapping() {
    try {
      const response = await fetch(chrome.runtime.getURL("venue-mapping.json"));
      venueMapping = await response.json();
      console.log("✅ Venue mapping loaded successfully");
    } catch (error) {
      console.error("❌ Failed to load venue mapping:", error);
      // Fallback to basic mapping if JSON fails
      venueMapping = getBasicVenueMapping();
    }
  }

  // Basic fallback mapping if JSON file fails to load
  function getBasicVenueMapping() {
    return {
      categories: {
        computer_vision: {
          venues: {
            CVPR: {
              patterns: ["cvpr", "computer vision and pattern recognition"],
            },
            ICCV: {
              patterns: ["iccv", "international conference on computer vision"],
            },
            ECCV: {
              patterns: ["eccv", "european conference on computer vision"],
            },
          },
        },
      },
      preprocessing: {
        remove_patterns: ["\\s*,\\s*\\d{4}(\\s|$)", "\\s*\\d{4}\\s*$"],
        skip_short_venues: 3,
      },
    };
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
  ) {
    if (request.action === "analyzeVenues") {
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
          sendResponse(analysisData);
        })
        .catch((error) => {
          isAnalyzing = false;
          console.error("❌ Analysis failed:", error);
          sendResponse({ error: error.message, success: false });
        });
      return true;
    }
  });

  // Main analysis function
  async function analyzeAllVenues() {
    try {
      console.log("🚀 === STARTING COMPLETE ANALYSIS ===");

      // Load venue mapping if not already loaded
      if (!venueMapping) {
        await loadVenueMapping();
      }

      // Validate we're on the right page
      if (!isValidScholarProfilePage()) {
        throw new Error(
          "This page doesn't appear to be a Google Scholar profile with publications."
        );
      }

      // Count initial publications
      const initialCount = document.querySelectorAll("tr.gsc_a_tr").length;
      console.log(`📊 Initial publications visible: ${initialCount}`);

      if (initialCount === 0) {
        throw new Error("No publications found on this page.");
      }

      // Load all publications via pagination
      console.log("🔄 Starting pagination to load ALL publications...");
      const finalCount = await loadAllPublications();
      console.log(
        `📊 Final count after pagination: ${finalCount} publications`
      );

      // Extract venue data using JSON mapping
      console.log(`🔍 Now analyzing ALL ${finalCount} loaded publications...`);
      const venueAnalysisResult = extractVenueDataWithMapping();

      if (venueAnalysisResult.venues.length === 0) {
        throw new Error("No venues could be extracted from the publications.");
      }

      const endTime = performance.now();
      const totalTime = ((endTime - startTime) / 1000).toFixed(2);
      console.log(`⏱️ Total analysis time: ${totalTime} seconds`);

      return {
        venues: venueAnalysisResult.venues,
        totalFound: finalCount,
        totalProcessed: venueAnalysisResult.processedCount,
        totalSkipped: venueAnalysisResult.skippedCount,
        success: true,
      };
    } catch (error) {
      console.error("❌ Error in analyzeAllVenues:", error);
      throw error;
    }
  }

  // Validate Scholar profile page
  function isValidScholarProfilePage() {
    const url = window.location.href;
    return (
      url.includes("scholar.google.") &&
      url.includes("/citations?") &&
      !url.includes("view_op=view_citation") &&
      url.includes("user=")
    );
  }

  // Load all publications with pagination
  async function loadAllPublications() {
    let attempts = 0;
    const maxAttempts = 200;
    let publicationsBefore = document.querySelectorAll("tr.gsc_a_tr").length;

    console.log(
      `🔄 Starting pagination with ${publicationsBefore} publications`
    );

    while (attempts < maxAttempts) {
      const showMoreButton = findShowMoreButton();

      if (!showMoreButton) {
        console.log(`✅ No show more button found after ${attempts} attempts`);
        break;
      }

      console.log(`📍 Attempt ${attempts + 1}: Clicking show more button`);

      try {
        showMoreButton.click();
        const newCount = await waitForNewPublications(publicationsBefore, 8000);

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

        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (error) {
        console.log("❌ Error during pagination:", error);
        break;
      }
    }

    const finalCount = document.querySelectorAll("tr.gsc_a_tr").length;
    console.log(
      `🏁 Pagination complete. Final count: ${finalCount} publications`
    );

    await new Promise((resolve) => setTimeout(resolve, 500));
    return finalCount;
  }

  // Find show more button
  function findShowMoreButton() {
    const selectors = ["#gsc_bpf_more", "button#gsc_bpf_more", ".gsc_pgn_pnx"];

    for (const selector of selectors) {
      const button = document.querySelector(selector);
      if (button && isValidShowMoreButton(button)) {
        return button;
      }
    }

    // Fallback: text-based search
    const allButtons = document.querySelectorAll(
      'button, span[role="button"], div[role="button"]'
    );
    for (const element of allButtons) {
      const text = element.textContent.toLowerCase().trim();
      if (
        (text.includes("show more") || text === "more") &&
        isValidShowMoreButton(element)
      ) {
        return element;
      }
    }

    return null;
  }

  // Validate show more button
  function isValidShowMoreButton(element) {
    const isVisible = element.offsetParent !== null;
    const isEnabled = !element.disabled;
    const text = element.textContent.toLowerCase().trim();
    const hasValidText =
      text.includes("show more") ||
      text.includes("more") ||
      element.id === "gsc_bpf_more";
    const isNotPaperLink =
      !element.closest("td.gsc_a_t") && !element.classList.contains("gsc_a_at");

    return isVisible && isEnabled && hasValidText && isNotPaperLink;
  }

  // Wait for new publications to load
  function waitForNewPublications(previousCount, timeout = 8000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let consecutiveFailures = 0;

      const checkForNewPublications = () => {
        const currentCount = document.querySelectorAll("tr.gsc_a_tr").length;

        if (currentCount > previousCount) {
          resolve(currentCount);
          return;
        }

        if (Date.now() - startTime > timeout) {
          resolve(currentCount);
          return;
        }

        consecutiveFailures++;
        const delay =
          consecutiveFailures < 5 ? 50 : consecutiveFailures < 15 ? 200 : 500;
        setTimeout(checkForNewPublications, delay);
      };

      checkForNewPublications();
    });
  }

  // Extract venue data using JSON mapping
  function extractVenueDataWithMapping() {
    const publications = document.querySelectorAll("tr.gsc_a_tr");
    console.log(
      `🔍 Processing ${publications.length} publications with JSON mapping`
    );

    const venues = {};
    let processedCount = 0;
    let skippedCount = 0;

    publications.forEach((pub, index) => {
      const grayElements = pub.querySelectorAll(".gs_gray");
      let venueElement;

      if (grayElements.length >= 2) {
        venueElement = grayElements[1];
      } else if (grayElements.length === 1) {
        venueElement = grayElements[0];
      } else {
        venueElement =
          pub.querySelector(".gsc_a_j") || pub.querySelector(".gs_gray");
      }

      if (venueElement) {
        const venueText = venueElement.textContent.trim();
        const normalizedVenue = normalizeVenueWithMapping(venueText);
        console.debug(`${venueText} ----> ${normalizedVenue}`);
        if (normalizedVenue) {
          venues[normalizedVenue] = (venues[normalizedVenue] || 0) + 1;
          processedCount++;
        } else {
          skippedCount++;
        }
      } else {
        skippedCount++;
      }
    });

    console.log(
      `✅ Extraction complete: ${processedCount} processed, ${skippedCount} skipped, ${
        Object.keys(venues).length
      } unique venues`
    );

    // Convert to array and sort by count
    const venueArray = Object.entries(venues)
      .map(([venue, count]) => ({ venue, count }))
      .sort((a, b) => b.count - a.count);

    return {
      venues: venueArray,
      processedCount: processedCount,
      skippedCount: skippedCount,
    };
  }

  // Normalize venue using JSON mapping
  function normalizeVenueWithMapping(venueText) {
    if (!venueText || !venueMapping) return null;

    // Store original for debugging
    const originalText = venueText;

    // Preprocessing based on JSON config
    let processedText = venueText;

    // Apply preprocessing patterns from JSON
    if (
      venueMapping.preprocessing &&
      venueMapping.preprocessing.remove_patterns
    ) {
      venueMapping.preprocessing.remove_patterns.forEach((pattern) => {
        processedText = processedText.replace(new RegExp(pattern, "gi"), " ");
      });
    }

    // Clean up whitespace
    processedText = processedText.replace(/\s+/g, " ").trim();

    // Check minimum length
    const minLength = venueMapping.preprocessing?.skip_short_venues || 3;
    if (processedText.length < minLength) {
      return null;
    }

    // Skip generic terms
    const genericTerms = venueMapping.preprocessing?.skip_generic_terms || [];
    if (
      genericTerms.some((term) =>
        new RegExp(`^${term}$`, "i").test(processedText)
      )
    ) {
      return null;
    }

    const lowerVenue = processedText.toLowerCase();

    // Check for workshop
    const isWorkshop =
      venueMapping.workshop_detection?.patterns?.some((pattern) =>
        new RegExp(pattern, "i").test(venueText)
      ) || false;

    // Search through all categories and venues
    for (const [categoryKey, category] of Object.entries(
      venueMapping.categories
    )) {
      if (!category.venues) continue;

      for (const [venueKey, venueConfig] of Object.entries(category.venues)) {
        if (!venueConfig.patterns) continue;

        // Check negative patterns first (if any)
        if (venueConfig.negative_patterns) {
          const hasNegativeMatch = venueConfig.negative_patterns.some(
            (negPattern) => new RegExp(negPattern, "i").test(lowerVenue)
          );
          if (hasNegativeMatch) continue;
        }

        // Check positive patterns
        const hasMatch = venueConfig.patterns.some((pattern) =>
          new RegExp(pattern, "i").test(lowerVenue)
        );

        if (hasMatch) {
          // Return with workshop suffix if applicable
          if (isWorkshop && venueConfig.type === "conference") {
            return (
              venueKey +
              (venueMapping.workshop_detection?.suffix || " Workshop")
            );
          }
          return venueKey;
        }
      }
    }

    // Fallback: return cleaned venue name if no match found
    let fallbackVenue = processedText.split(/[,.(]/)[0].trim();

    // Remove common prefixes
    fallbackVenue = fallbackVenue.replace(
      /^(proceedings of the |proceedings of |proceedings |proc\.?\s+|the\s+)/i,
      ""
    );
    fallbackVenue = fallbackVenue.replace(/^\d{4}\s+/, "");
    fallbackVenue = fallbackVenue.replace(/^\d+(?:st|nd|rd|th)\s+/i, "");
    fallbackVenue = fallbackVenue.trim();

    // Clean up suffixes
    fallbackVenue = fallbackVenue.replace(/\s+(proceedings|proc\.?)$/i, "");
    fallbackVenue = fallbackVenue.replace(/\s+\d{4}$/, "");
    fallbackVenue = fallbackVenue.replace(/\s+\d+$/, "");
    fallbackVenue = fallbackVenue.trim();

    // Final check
    if (fallbackVenue.length < minLength) {
      return null;
    }

    return fallbackVenue;
  }

  // Initialize venue mapping on load
  loadVenueMapping().catch((error) => {
    console.error("Failed to initialize venue mapping:", error);
  });

  // Cleanup on page unload
  window.addEventListener("beforeunload", function () {
    console.log("🧹 Page unloading - cleaning up scholar analyzer");
    isAnalyzing = false;
    window.scholarAnalyzerRunning = false;
  });
})();
