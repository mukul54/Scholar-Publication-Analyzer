(function() {
  // Listen for messages from popup
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      if (request.action === "analyzeVenues") {
        const venueData = extractVenueData();
        sendResponse({venues: venueData});
      }
      return true; // Required for async response
    }
  );

  // Extract venue data from publication list with advanced normalization
  function extractVenueData() {
    // Get all publication entries currently visible
    const publications = document.querySelectorAll('tr.gsc_a_tr');
    
    // Initialize venue counters
    let venues = {};
    
    // Process each publication
    publications.forEach(pub => {
      // The venue is typically in the third column
      const venueElement = pub.querySelector('.gs_gray:nth-child(3)');
      
      if (venueElement) {
        // Extract venue name - typically before the first comma
        let venueText = venueElement.textContent.trim();
        let normalizedVenue = normalizeVenue(venueText);
        
        // Count occurrences
        if (normalizedVenue) {
          venues[normalizedVenue] = (venues[normalizedVenue] || 0) + 1;
        }
      }
    });
    
    // Convert to array and sort by count
    const venueArray = Object.entries(venues).map(([venue, count]) => ({venue, count}));
    venueArray.sort((a, b) => b.count - a.count);
    
    return venueArray;
  }
  
  // Advanced function to normalize venue names
  function normalizeVenue(venueText) {
    // Skip empty venues
    if (!venueText) return null;
    
    // Remove trailing ellipsis which often appears in long venue names
    venueText = venueText.replace(/…$/, '');
    
    // Remove year citations and volume/issue numbers at end
    venueText = venueText.replace(/\s+\d{4}(\s|$)/, ' ');
    venueText = venueText.replace(/\s+\d+(\s\(\d+\))?(\s|$)/, ' ');
    
    // Major conferences and journals patterns
    
    // CVPR variations - including proceedings
    if (/computer vision and pattern recognition|cvpr|IEEE.*?conference on computer vision|cvf.*?computer vision and pattern/i.test(venueText)) {
      return "CVPR";
    }
    
    // ICCV variations
    if (/international conference on computer vision|iccv|international joint conference on computer vision/i.test(venueText)) {
      return "ICCV";
    }
    
    // ECCV variations
    if (/european conference on computer vision|eccv/i.test(venueText)) {
      return "ECCV";
    }
    
    // NeurIPS/NIPS variations
    if (/neural information processing systems|neurips|nips|advances in neural/i.test(venueText)) {
      return "NeurIPS";
    }
    
    // ICML variations
    if (/international conference on machine learning|icml/i.test(venueText)) {
      return "ICML";
    }
    
    // ICLR variations
    if (/international conference on learning representations|iclr/i.test(venueText)) {
      return "ICLR";
    }
    
    // AAAI variations
    if (/aaai|association for the advancement of artificial intelligence|national conference on artificial intelligence/i.test(venueText)) {
      return "AAAI";
    }
    
    // IEEE TPAMI (Transactions on Pattern Analysis and Machine Intelligence)
    if (/transactions on pattern analysis and machine intelligence|tpami|ieee.*?pattern analysis/i.test(venueText)) {
      return "IEEE TPAMI";
    }
    
    // IEEE TIP (Transactions on Image Processing)
    if (/transactions on image processing|tip/i.test(venueText)) {
      return "IEEE TIP";
    }
    
    // IJCV (International Journal of Computer Vision)
    if (/international journal of computer vision|ijcv/i.test(venueText)) {
      return "IJCV";
    }
    
    // WACV (Winter Conference on Applications of Computer Vision)
    if (/winter conference on applications of computer vision|wacv/i.test(venueText)) {
      return "WACV";
    }
    
    // BMVC (British Machine Vision Conference)
    if (/british machine vision conference|bmvc/i.test(venueText)) {
      return "BMVC";
    }
    
    // ACL (Association for Computational Linguistics)
    if (/association for computational linguistics|acl/i.test(venueText)) {
      return "ACL";
    }
    
    // NAACL (North American Chapter of the ACL)
    if (/north american chapter|naacl|findings.*?naacl/i.test(venueText)) {
      return "NAACL";
    }
    
    // ACM SIGKDD (Knowledge Discovery and Data Mining)
    if (/sigkdd|knowledge discovery and data mining/i.test(venueText)) {
      return "ACM SIGKDD";
    }
    
    // ICRA (International Conference on Robotics and Automation)
    if (/international conference on robotics and automation|icra|robotics and automation/i.test(venueText)) {
      return "ICRA";
    }
    
    // ICASSP (International Conference on Acoustics, Speech and Signal Processing)
    if (/acoustics, speech and signal processing|icassp|international conference on acoustics/i.test(venueText)) {
      return "ICASSP";
    }
    
    // UAI (Uncertainty in Artificial Intelligence)
    if (/uncertainty in artificial intelligence|uai/i.test(venueText)) {
      return "UAI";
    }
    
    // Medical image computing conferences
    if (/medical image computing and computer-assisted intervention|miccai/i.test(venueText)) {
      return "MICCAI";
    }
    
    // Artificial Intelligence and Statistics
    if (/artificial intelligence and statistics|aistats|international workshop on artificial intelligence and statistics/i.test(venueText)) {
      return "AISTATS";
    }
    
    // IEEE Access
    if (/ieee access/i.test(venueText)) {
      return "IEEE Access";
    }
    
    // Pattern Recognition (journal or conference)
    if (/pattern recognition letters|pattern recognition \d|international conference on pattern recognition/i.test(venueText)) {
      return "Pattern Recognition";
    }
    
    // Computer Vision and Image Understanding
    if (/computer vision and image understanding/i.test(venueText)) {
      return "CVIU";
    }
    
    // Publishers and generic proceedings sources
    
    // arXiv preprints
    if (/arxiv|corr/i.test(venueText)) {
      return "arXiv";
    }
    
    // BioRxiv preprints
    if (/biorxiv/i.test(venueText)) {
      return "bioRxiv";
    }
    
    // Patents
    if (/patent|us patent/i.test(venueText)) {
      return "US Patents";
    }
    
    // Curran Associates (NeurIPS publisher)
    if (/curran associates/i.test(venueText)) {
      return "Curran Associates";
    }
    
    // Springer
    if (/springer/i.test(venueText)) {
      return "Springer";
    }
    
    // MIT Press
    if (/mit press/i.test(venueText)) {
      return "MIT Press";
    }
    
    // JMLR (Journal of Machine Learning Research)
    if (/journal of machine learning research|jmlr/i.test(venueText)) {
      return "JMLR";
    }
    
    // Science and Nature journals
    if (/^science \d/i.test(venueText)) {
      return "Science";
    }
    
    if (/nature communications/i.test(venueText)) {
      return "Nature Communications";
    }
    
    // PNAS (Proceedings of the National Academy of Sciences)
    if (/proceedings of the national academy of sciences/i.test(venueText)) {
      return "PNAS";
    }
    
    // APS (American Physical Society)
    if (/aps|american physical society|physical review/i.test(venueText)) {
      return "APS";
    }
    
    // Image analysis conferences
    if (/image analysis|scandinavian conference/i.test(venueText)) {
      return "Scandinavian Conference on Image Analysis";
    }
    
    // Computer Analysis of Images and Patterns
    if (/computer analysis of images and patterns/i.test(venueText)) {
      return "CAIP";
    }
    
    // IEEE International Conference on Image Processing
    if (/international conference on image processing/i.test(venueText)) {
      return "ICIP";
    }
    
    // Asian Conference on Computer Vision
    if (/asian conference on computer vision/i.test(venueText)) {
      return "ACCV";
    }
    
    // Journal of Field Robotics
    if (/journal of field robotics/i.test(venueText)) {
      return "Journal of Field Robotics";
    }
    
    // Medical and biological journals
    if (/medical image analysis/i.test(venueText)) {
      return "Medical Image Analysis";
    }
    
    if (/neurocomputing/i.test(venueText)) {
      return "Neurocomputing";
    }
    
    // Generic cases - strip numbers, special chars, etc.
    
    // Remove all numbers and special characters for a very basic normalization
    let simplifiedVenue = venueText.split(/[,.(]/)[0].trim();
    
    return simplifiedVenue;
  }
})();