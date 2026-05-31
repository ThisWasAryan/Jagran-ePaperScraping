# Dainik Jagran ePaper Viewer

A completely browser-based, lightweight, and modern React web application to browse, read, and download full-resolution editions of the Dainik Jagran ePaper. 

This project is a sister project to [HT-ePaperScraper], sharing the same minimalist design language, responsive typography, and CSS architecture to ensure a premium reading experience.

## Features

- **No Backend Required:** Leverages native browser CORS capabilities to scrape and fetch assets directly from Jagran's servers (`epaperapi.jagran.com`). No proxies needed!
- **Dynamic Discovery Engine:** Instantly parses HTML responses to automatically construct the exact edition and city mapping logic.
- **High-Resolution Reading:** Specifically intercepts the `M-` high-resolution image format for both gallery thumbnails (downscaled via CSS) and the full-page reader overlay.
- **Premium Reader Experience:** An immersive, full-screen reader powered by `react-zoom-pan-pinch` supporting mouse-wheel zoom, double-click zooming, drag-to-pan, and keyboard navigation.
- **Direct Downloads:** Native download functionality pointing straight to the uncompressed, original image files.
- **GitHub Pages Ready:** Configured to instantly deploy as a static Vite application via GitHub Actions.

## Supported States
Currently tracks and supports all editions across the following states:
- Delhi
- Uttar Pradesh
- Haryana
- Uttarakhand
- Bihar
- Jharkhand
- Punjab
- Jammu & Kashmir
- Himachal Pradesh
- West Bengal

## Technology Stack
- **Framework:** React + TypeScript + Vite
- **Styling:** Vanilla CSS (Ported HT-ePaperScraper design system)
- **Icons:** Lucide React
- **Zoom/Pan:** `react-zoom-pan-pinch`
- **Deployment:** GitHub Pages & Actions

## Getting Started

### Prerequisites
- Node.js 18+

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/Jagran-ePaperScraping.git
   cd Jagran-ePaperScraping
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### Building for Production
To generate a production-ready build in the `dist` directory:
```bash
npm run build
```

## Deployment
This repository includes a `.github/workflows/deploy.yml` workflow. 
If you fork this repository to your own account under the exact name `Jagran-ePaperScraping` and enable GitHub Pages via GitHub Actions in your repository settings, the application will automatically deploy upon push to the `main` branch.

## Disclaimer
This project is an educational proof-of-concept for single-page application parsing and is not affiliated with, endorsed by, or connected to Dainik Jagran or Jagran Prakashan Limited. All content scraped remains the intellectual property of its respective owners.
