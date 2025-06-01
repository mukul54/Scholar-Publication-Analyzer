# where-do-i-publish

# 📊 Scholar Publication Analyzer

> **Transform your Google Scholar profile into actionable publication insights in seconds**

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/where-do-i-publish/lpbpamoidfkbngcnahadjcleflnpcaod)
[![Version](https://img.shields.io/badge/Version-2.0-brightgreen?style=for-the-badge)](https://github.com/yourusername/where-do-i-publish)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

## 🚀 What It Does

**Scholar Publication Analyzer** is a powerful Chrome extension that instantly analyzes any Google Scholar profile and reveals publication patterns, venue preferences, and research trends. Perfect for researchers, academics, and students who want to understand where scholars publish their work.

### ✨ Key Features

- 🔍 **Instant Analysis** - One-click venue analysis of any Scholar profile
- ⚡ **Lightning Fast** - Optimized for large profiles (handle 900+ papers in ~10 seconds)
- 🧠 **Smart Normalization** - Automatically groups venue variations (e.g., "Proc. CVPR 2021" and old CVPR → "CVPR")
- 📈 **Visual Rankings** - Clean, sortable venue rankings with publication counts
- 🌍 **Global Support** - Works with major Google Scholar domains
- 🔄 **Auto-Pagination** - Automatically loads all publications, no manual clicking

## 🎯 Perfect For

- **PhD Students** - Discover where leading researchers in your field publish
- **Academic Researchers** - Analyze publication patterns for collaboration insights
- **Department Heads** - Evaluate faculty publication portfolios
- **Grant Reviewers** - Quick assessment of researcher publication venues
- **Academic Librarians** - Research impact and venue analysis

## 📱 How It Works

### Before: Hours of Manual Work

```
❌ Manually scroll through hundreds of publications
❌ Copy-paste venue names into spreadsheets
❌ Try to identify venue variations and group them
❌ Create charts and analyze patterns manually
```

### After: Seconds of Automated Analysis

```
✅ One-click analysis of entire publication history
✅ Automatic venue normalization and grouping
✅ Instant visual rankings and statistics
```

## 🛠️ Installation

### From Chrome Web Store (Recommended)

1. Visit the [Chrome Web Store listing](#)
2. Click "Add to Chrome"
3. Navigate to any Google Scholar profile
4. Click the extension icon and hit "Analyze"

### Manual Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension folder
5. The extension icon will appear in your toolbar

## 🎮 Usage

### Quick Start

1. **Navigate** to any Google Scholar profile (e.g., `scholar.google.com/citations?user=...`)
2. **Click** the "Scholar Publication Analyzer" extension icon
3. **Hit** the "🔍 Analyze Publication Venues" button
4. **Watch** as it automatically loads all publications and analyzes venues
5. **Explore** the ranked results and insights

### Example Output

```
📊 Analysis Complete:
Total publications found: 979
Publications with venue info: 839
Skipped (no venue info): 140
Unique venues identified: 227

🏆Rank  Venue               Count:
1. 	    arXiv	            115
2.	    CVPR	            109
3.	    ICCV	            43
4.	    IEEE TPAMI	        42
5.	    Pattern Recognition	41
```

## 🧠 Smart Venue Normalization

The extension automatically recognizes and normalizes hundreds of venue variations:

| Raw Scholar Text                                                                        | Normalized To |
| --------------------------------------------------------------------------------------- | ------------- |
| `"Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition, 2023"` | `CVPR`        |
| `"IEEE Transactions on Pattern Analysis and Machine Intelligence, vol. 45"`             | `IEEE TPAMI`  |
| `"Advances in Neural Information Processing Systems 36 (2023)"`                         | `NeurIPS`     |
| `"International Conference on Computer Vision, 2022"`                                   | `ICCV`        |

### Supported Venues Include:

- **Computer Vision**: CVPR, ICCV, ECCV, WACV, BMVC, ACCV
- **Machine Learning**: NeurIPS, ICML, ICLR, AISTATS
- **AI Conferences**: AAAI, IJCAI, UAI
- **NLP**: ACL, NAACL, EMNLP, CoNLL, EACL, COLING
- **IEEE Journals**: TPAMI, TIP, TMM, TCYB, Access
- **High-Impact Journals**: Nature, Science, IJCV, JMLR
- **Medical Imaging**: MICCAI, IPMI, Medical Image Analysis
- **And 100+ more venues with intelligent pattern matching**

## ⚡ Performance

### Version 2.0 Speed Improvements

- **Faster pagination**
- **Smart loading**
- **Batch processing**
- **Memory efficient**

## 🔧 Technical Details

### Built With

- **Manifest V3** - Latest Chrome extension standard
- **Vanilla JavaScript** - No external dependencies
- **Advanced DOM Parsing** - Robust venue extraction
- **RegEx Pattern Matching** - Intelligent venue normalization
- **Async/Await** - Modern asynchronous processing

### Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   popup.html    │────│   content.js     │────│  Scholar Page   │
│   (UI Interface)│    │  (Venue Analyzer)│    │   (Data Source) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Privacy & Security

- **No data collection** - All processing happens locally
- **No external requests** - Only analyzes existing Scholar page content
- **No personal information** - Only processes public publication data
- **Minimal permissions** - Only requires activeTab and scripting access

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Ways to Contribute

- 🐛 **Report bugs** via GitHub Issues
- 💡 **Suggest features** for future versions
- 🔧 **Submit pull requests** for improvements
- 🌐 **Add venue patterns** for better normalization

### Development Setup

```bash
git clone https://github.com/yourusername/where-do-i-publish
cd where-do-i-publish
# Load extension in Chrome developer mode
# Make changes and test locally
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Scholar** for providing the publication data
- **Academic community** for feedback and feature suggestions
- **Open source contributors** who helped improve the venue normalization patterns

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/mukul54/Scholar-Publication-Analyzer/issues)
- 🌟 **Rate us**: [Chrome Web Store](https://chromewebstore.google.com/detail/where-do-i-publish/lpbpamoidfkbngcnahadjcleflnpcaod)

**Made with ❤️ for the academic community**

[⭐ Star this repo](https://github.com/mukul54/Scholar-Publication-Analyzer) | [🚀 Install Extension](https://chromewebstore.google.com/detail/where-do-i-publish/lpbpamoidfkbngcnahadjcleflnpcaod) | [📝 Report Issues](https://github.com/mukul54/Scholar-Publication-Analyzer/issues)
