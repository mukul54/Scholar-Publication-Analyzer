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
    let venueMappings = {};
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

        // Track the mapping for later review
        if (!venueMappings[venueText]) {
          venueMappings[venueText] = normalizedVenue || "UNMAPPED";
        }

        if (normalizedVenue) {
          venues[normalizedVenue] = (venues[normalizedVenue] || 0) + 1;
          processedCount++;
        } else {
          console.log(`⚠️ Venue not normalized (${index + 1}):`, venueText);
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

    console.debug("📋 Raw to Normalized Venue Mapping:");
    Object.entries(venueMappings).forEach(([raw, mapped]) => {
      console.debug(`🔹 "${raw}" => "${mapped}"`);
    });

    return {
      venues: venueArray,
      processedCount: processedCount,
      skippedCount: skippedCount,
    };
  }

  // Enhanced function to normalize venue names with comprehensive conference recognition
  function normalizeVenue(venueText) {
    // Skip empty venues
    if (!venueText) return null;

    // Store original text for debugging
    const originalText = venueText;

    // Remove trailing ellipsis and clean up
    venueText = venueText.replace(/…$/, "").trim();

    // Remove year citations and volume/issue numbers - be more careful not to remove important text
    venueText = venueText.replace(/\s*,\s*\d{4}(\s|$)/, " ");
    venueText = venueText.replace(/\s*,\s*\d+(\s*\(\d+\))?(\s|$)/, " ");
    venueText = venueText.replace(/\s*,\s*pp?\s*[\d-]+/i, "");
    venueText = venueText.replace(/\s*,\s*\d+-\d+\s*$/, "");

    // Clean up extra whitespace
    venueText = venueText.replace(/\s+/g, " ").trim();

    // Convert to lowercase for matching but preserve case for final result
    const lowerVenue = venueText.toLowerCase();

    // Check if it's a workshop (for separate categorization)
    const isWorkshop = /workshop|ws\b/i.test(venueText);

    // Major conferences and journals patterns (comprehensive)

    // ===== COMPUTER VISION CONFERENCES =====
    // CVPR - various forms
    if (
      /computer vision and pattern recognition|cvpr|cvf.*?computer vision and pattern|proceedings.*?cvpr|ieee.*?cvf.*?computer vision and pattern recognition/i.test(
        lowerVenue
      )
    ) {
      return isWorkshop ? "CVPR Workshop" : "CVPR";
    }

    // ICCV - various forms including the full IEEE title
    if (
      /international conference on computer vision|iccv|proceedings.*?iccv|ieee.*?international conference on computer vision/i.test(
        lowerVenue
      )
    ) {
      return isWorkshop ? "ICCV Workshop" : "ICCV";
    }

    // ECCV - European Conference on Computer Vision
    if (
      /european conference on computer vision|eccv|proceedings.*?eccv/i.test(
        lowerVenue
      )
    ) {
      return isWorkshop ? "ECCV Workshop" : "ECCV";
    }

    // WACV - Winter Conference on Applications of Computer Vision
    if (
      /winter conference on applications of computer vision|wacv|ieee.*?cvf.*?winter conference|cvf.*?winter conference/i.test(
        lowerVenue
      )
    ) {
      return isWorkshop ? "WACV Workshop" : "WACV";
    }

    // BMVC - British Machine Vision Conference
    if (/british machine vision conference|bmvc/i.test(lowerVenue)) {
      return isWorkshop ? "BMVC Workshop" : "BMVC";
    }

    // ACCV - Asian Conference on Computer Vision
    if (/asian conference on computer vision|accv/i.test(lowerVenue)) {
      return isWorkshop ? "ACCV Workshop" : "ACCV";
    }

    // ===== MACHINE LEARNING CONFERENCES =====
    // NeurIPS (formerly NIPS)
    if (
      /neural information processing systems|neurips|nips|advances in neural information processing|conference.*?neural information processing|proceedings.*?nips|proceedings.*?neurips/i.test(
        lowerVenue
      )
    ) {
      return isWorkshop ? "NeurIPS Workshop" : "NeurIPS";
    }

    // ICML - International Conference on Machine Learning
    if (
      /international conference on machine learning|icml|proceedings.*?icml/i.test(
        lowerVenue
      )
    ) {
      return isWorkshop ? "ICML Workshop" : "ICML";
    }

    // ICLR - International Conference on Learning Representations
    if (
      /international conference on learning representations|iclr/i.test(
        lowerVenue
      )
    ) {
      return isWorkshop ? "ICLR Workshop" : "ICLR";
    }

    // AISTATS - International Conference on Artificial Intelligence and Statistics
    if (
      /artificial intelligence and statistics|aistats|international conference on artificial intelligence and statistics/i.test(
        lowerVenue
      )
    ) {
      return isWorkshop ? "AISTATS Workshop" : "AISTATS";
    }

    // ===== AI CONFERENCES =====
    // AAAI
    if (
      /aaai|association for the advancement of artificial intelligence|national conference on artificial intelligence|proceedings.*?aaai/i.test(
        lowerVenue
      )
    ) {
      return isWorkshop ? "AAAI Workshop" : "AAAI";
    }

    // IJCAI - International Joint Conference on Artificial Intelligence
    if (
      /international joint conference on artificial intelligence|ijcai/i.test(
        lowerVenue
      )
    ) {
      return isWorkshop ? "IJCAI Workshop" : "IJCAI";
    }

    // UAI - Uncertainty in Artificial Intelligence
    if (/uncertainty in artificial intelligence|uai/i.test(lowerVenue)) {
      return isWorkshop ? "UAI Workshop" : "UAI";
    }

    // ===== NLP CONFERENCES =====
    // ACL - Association for Computational Linguistics
    if (
      /association for computational linguistics|acl|proceedings.*?acl/i.test(
        lowerVenue
      ) &&
      !/naacl|eacl/i.test(lowerVenue)
    ) {
      return isWorkshop ? "ACL Workshop" : "ACL";
    }

    // NAACL - North American Chapter of ACL
    if (/north american chapter|naacl|findings.*?naacl/i.test(lowerVenue)) {
      return isWorkshop ? "NAACL Workshop" : "NAACL";
    }

    // EMNLP - Empirical Methods in Natural Language Processing
    if (
      /empirical methods in natural language processing|emnlp/i.test(lowerVenue)
    ) {
      return isWorkshop ? "EMNLP Workshop" : "EMNLP";
    }

    // CoNLL - Conference on Natural Language Learning
    if (
      /conference on computational natural language learning|conll/i.test(
        lowerVenue
      )
    ) {
      return isWorkshop ? "CoNLL Workshop" : "CoNLL";
    }

    // EACL - European Chapter of ACL
    if (/european chapter.*?acl|eacl/i.test(lowerVenue)) {
      return isWorkshop ? "EACL Workshop" : "EACL";
    }

    // COLING - International Conference on Computational Linguistics
    if (
      /international conference on computational linguistics|coling/i.test(
        lowerVenue
      )
    ) {
      return isWorkshop ? "COLING Workshop" : "COLING";
    }

    // ===== DATA MINING AND WEB CONFERENCES =====
    // KDD - Knowledge Discovery and Data Mining
    if (
      /sigkdd|knowledge discovery and data mining|kdd|proceedings.*?kdd/i.test(
        lowerVenue
      )
    ) {
      return isWorkshop ? "KDD Workshop" : "ACM SIGKDD";
    }

    // ICDM - International Conference on Data Mining
    if (/international conference on data mining|icdm/i.test(lowerVenue)) {
      return isWorkshop ? "ICDM Workshop" : "ICDM";
    }

    // WWW - World Wide Web Conference
    if (
      /world wide web conference|www|international world wide web/i.test(
        lowerVenue
      )
    ) {
      return isWorkshop ? "WWW Workshop" : "WWW";
    }

    // ===== ROBOTICS CONFERENCES =====
    // ICRA - International Conference on Robotics and Automation
    if (
      /international conference on robotics and automation|icra|ieee.*?robotics and automation/i.test(
        lowerVenue
      )
    ) {
      return isWorkshop ? "ICRA Workshop" : "ICRA";
    }

    // IROS - IEEE/RSJ International Conference on Intelligent Robots and Systems
    if (
      /intelligent robots and systems|iros|ieee.*?rsj.*?intelligent robots/i.test(
        lowerVenue
      )
    ) {
      return isWorkshop ? "IROS Workshop" : "IROS";
    }

    // ===== SIGNAL PROCESSING CONFERENCES =====
    // ICASSP - International Conference on Acoustics, Speech and Signal Processing
    if (
      /acoustics.*?speech.*?signal processing|icassp|international conference on acoustics/i.test(
        lowerVenue
      )
    ) {
      return isWorkshop ? "ICASSP Workshop" : "ICASSP";
    }

    // ICIP - International Conference on Image Processing
    if (/international conference on image processing|icip/i.test(lowerVenue)) {
      return isWorkshop ? "ICIP Workshop" : "ICIP";
    }

    // ===== MEDICAL IMAGING CONFERENCES =====
    // MICCAI - Medical Image Computing and Computer-Assisted Intervention
    if (
      /medical image computing and computer.assisted intervention|miccai/i.test(
        lowerVenue
      )
    ) {
      return isWorkshop ? "MICCAI Workshop" : "MICCAI";
    }

    // IPMI - Information Processing in Medical Imaging
    if (/information processing in medical imaging|ipmi/i.test(lowerVenue)) {
      return isWorkshop ? "IPMI Workshop" : "IPMI";
    }

    // ===== GRAPHICS AND VISUALIZATION =====
    // SIGGRAPH
    if (
      /siggraph|computer graphics and interactive techniques/i.test(lowerVenue)
    ) {
      return isWorkshop ? "SIGGRAPH Workshop" : "SIGGRAPH";
    }

    // IEEE VIS - Visualization Conference
    if (/ieee visualization|vis\s|visualization conference/i.test(lowerVenue)) {
      return isWorkshop ? "IEEE VIS Workshop" : "IEEE VIS";
    }

    // ===== IEEE TRANSACTIONS (JOURNALS) =====
    // IEEE TPAMI - Transactions on Pattern Analysis and Machine Intelligence
    if (
      /transactions on pattern analysis and machine intelligence|tpami|ieee.*?pattern analysis/i.test(
        lowerVenue
      )
    ) {
      return "IEEE TPAMI";
    }

    // IEEE TIP - Transactions on Image Processing
    if (/transactions on image processing|tip/i.test(lowerVenue)) {
      return "IEEE TIP";
    }

    // IEEE TNN/TNNLS - Transactions on Neural Networks
    if (/transactions on neural networks|tnn|tnnls/i.test(lowerVenue)) {
      return "IEEE TNN";
    }

    // IEEE TCYB - Transactions on Cybernetics
    if (/transactions on cybernetics|tcyb/i.test(lowerVenue)) {
      return "IEEE TCYB";
    }

    // IEEE TMM - Transactions on Multimedia
    if (/transactions on multimedia|tmm/i.test(lowerVenue)) {
      return "IEEE TMM";
    }

    // IEEE Access
    if (/ieee access/i.test(lowerVenue)) {
      return "IEEE Access";
    }

    // ===== OTHER MAJOR JOURNALS =====
    // IJCV - International Journal of Computer Vision
    if (/international journal of computer vision|ijcv/i.test(lowerVenue)) {
      return "IJCV";
    }

    // JMLR - Journal of Machine Learning Research
    if (/journal of machine learning research|jmlr/i.test(lowerVenue)) {
      return "JMLR";
    }

    // Machine Learning Journal
    if (/machine learning journal|^machine learning$/i.test(lowerVenue)) {
      return "Machine Learning Journal";
    }

    // CVIU - Computer Vision and Image Understanding
    if (/computer vision and image understanding|cviu/i.test(lowerVenue)) {
      return "CVIU";
    }

    // Pattern Recognition
    if (/pattern recognition\s|pattern recognition$/i.test(lowerVenue)) {
      return "Pattern Recognition";
    }

    // Medical Image Analysis
    if (/medical image analysis/i.test(lowerVenue)) {
      return "Medical Image Analysis";
    }

    // Neurocomputing
    if (/neurocomputing/i.test(lowerVenue)) {
      return "Neurocomputing";
    }

    // ===== HIGH-IMPACT JOURNALS =====
    // Science
    if (/^science\s|^\s*science$/i.test(lowerVenue)) {
      return "Science";
    }

    // Nature and Nature family
    if (/nature communications/i.test(lowerVenue)) {
      return "Nature Communications";
    }

    if (/nature machine intelligence/i.test(lowerVenue)) {
      return "Nature Machine Intelligence";
    }

    if (/^nature$/i.test(lowerVenue)) {
      return "Nature";
    }

    // PNAS
    if (
      /proceedings of the national academy of sciences|pnas/i.test(lowerVenue)
    ) {
      return "PNAS";
    }

    // ===== PREPRINTS AND OTHER SOURCES =====
    // arXiv preprints
    if (/arxiv|ar xiv|corr/i.test(lowerVenue)) {
      return "arXiv";
    }

    // bioRxiv preprints
    if (/biorxiv/i.test(lowerVenue)) {
      return "bioRxiv";
    }

    // Patents
    if (/patent|us patent/i.test(lowerVenue)) {
      return "US Patents";
    }

    // SSRN
    if (/ssrn|social science research network/i.test(lowerVenue)) {
      return "Available at SSRN";
    }

    // ===== PUBLISHERS =====
    // Springer
    if (/springer|lecture notes in computer science|lncs/i.test(lowerVenue)) {
      return "Springer";
    }

    // MIT Press
    if (/mit press/i.test(lowerVenue)) {
      return "MIT Press";
    }

    // ===== ADDITIONAL CONFERENCES =====
    // CHI - Conference on Human Factors in Computing Systems
    if (/conference on human factors|chi\s|acm chi/i.test(lowerVenue)) {
      return isWorkshop ? "CHI Workshop" : "ACM CHI";
    }

    // SIGIR - Special Interest Group on Information Retrieval
    if (/sigir|information retrieval/i.test(lowerVenue)) {
      return isWorkshop ? "SIGIR Workshop" : "ACM SIGIR";
    }

    // INTERSPEECH
    if (/interspeech/i.test(lowerVenue)) {
      return isWorkshop ? "INTERSPEECH Workshop" : "INTERSPEECH";
    }

    // ISCA conferences
    if (/isca/i.test(lowerVenue)) {
      return "ISCA";
    }

    // ===== WORKSHOP DETECTION =====
    // Generic workshop handling - try to extract the main conference name
    if (isWorkshop) {
      // Try to extract conference name from workshop titles
      if (/cvpr/i.test(lowerVenue)) return "CVPR Workshop";
      if (/iccv/i.test(lowerVenue)) return "ICCV Workshop";
      if (/eccv/i.test(lowerVenue)) return "ECCV Workshop";
      if (/neurips|nips/i.test(lowerVenue)) return "NeurIPS Workshop";
      if (/icml/i.test(lowerVenue)) return "ICML Workshop";
      if (/aaai/i.test(lowerVenue)) return "AAAI Workshop";
      if (/ijcai/i.test(lowerVenue)) return "IJCAI Workshop";

      // Generic workshop if we can't identify the main conference
      return "Workshop";
    }

    // ===== FALLBACK PROCESSING =====
    // Remove common prefixes and suffixes for better generic matching
    let simplifiedVenue = venueText.split(/[,.(]/)[0].trim();

    // Remove common prefixes
    simplifiedVenue = simplifiedVenue.replace(
      /^(proceedings of the |proceedings of |proceedings |proc\.?\s+|the\s+)/i,
      ""
    );

    // Remove common suffixes
    simplifiedVenue = simplifiedVenue.replace(/\s+(proceedings|proc\.?)$/i, "");

    // Remove years and numbers from the end
    simplifiedVenue = simplifiedVenue.replace(/\s+\d{4}$/, "");
    simplifiedVenue = simplifiedVenue.replace(/\s+\d+$/, "");

    // Clean up and return
    simplifiedVenue = simplifiedVenue.trim();

    // Skip very short or generic terms
    if (
      simplifiedVenue.length < 3 ||
      /^(the|a|an|in|on|of|and|for|with)$/i.test(simplifiedVenue)
    ) {
      return null;
    }

    return simplifiedVenue || null;
  }
})();
