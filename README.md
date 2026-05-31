# Dainik Jagran ePaper Viewer

A completely browser-based, lightweight, and modern React web application to browse, read, and download full-resolution editions of the Dainik Jagran ePaper. 

This project is a sister project to [HT-ePaperScraper](https://github.com/ThisWasAryan/HT-ePaperScraper), sharing the same minimalist design language, responsive typography, and CSS architecture to ensure a premium reading experience.

[A Demonstration/Tutorial Video](https://youtu.be/HwQzwb3BFy4) *last updated on 01/06/2026*

## Features

- **No Backend Required:** Leverages native browser CORS capabilities to scrape and fetch assets directly from Jagran's servers (`epaperapi.jagran.com`). No proxies needed!
- **Dynamic Discovery Engine:** Instantly parses HTML responses to automatically construct the exact edition and city mapping logic.
- **High-Resolution Reading:** Specifically intercepts the `M-` high-resolution image format for both gallery thumbnails (downscaled via CSS) and the full-page reader overlay.
- **Premium Reader Experience:** An immersive, full-screen reader powered by `react-zoom-pan-pinch` supporting mouse-wheel zoom, double-click zooming, drag-to-pan, and keyboard navigation.
- **Direct Downloads:** Native download functionality pointing straight to the uncompressed, original image files.
- **GitHub Pages Ready:** Configured to instantly deploy as a static Vite application via GitHub Actions.

## Supported States
Currently tracks and supports all editions across all states which are as follows:
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

## Technical Deep Dive: Building a Serverless React Scraper

In the ever-evolving landscape of digital news, regional e-papers often rely on complex architectures to serve physical newspaper pages to digital readers. The goal was strict: **Build a modern, production-ready React web application using Vite, maintain a premium aesthetic, and deploy it statically to GitHub Pages without a single line of backend code.**

Here is a chronological, deep dive into how we reverse-engineered the platform, the breakthroughs we had, and the exact techniques used to pull it off.

---

### 1. The Initial Hypothesis & The CORS Breakthrough

The project started with a basic mapping of Jagran's URL structure. The user had identified how the platform navigated from State → City → Edition. 

```text
State Landing:  https://epaper.jagran.com/epaper/{state}-all-editions-epaper.html
Edition Landing: https://epaper.jagran.com/epaper/edition-{YYYY}-{MM}-{DD}-{editionId}-{editionName}.html
Reader View:    https://epaper.jagran.com/epaper/{DD-MMM-YYYY}-{editionId}-{editionName}-edition-{editionName}.html
```

When building a web scraper that runs entirely in the browser (a static React Single Page Application), the biggest enemy is **CORS (Cross-Origin Resource Sharing)**. Browsers naturally block your website from reading data from another website unless that website explicitly permits it.

**The Breakthrough:** Before setting up a Node.js proxy server, I decided to test Jagran's servers directly using `curl` to inspect their HTTP response headers.

```http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
```
To my absolute surprise, both `epaper.jagran.com` (the HTML pages) and `epaperapi.jagran.com` (the image servers) returned an open `Access-Control-Allow-Origin: *` wildcard header. 

This dictated the entire architecture of the project. We didn't need a backend, a database, or a proxy. The React app could make raw `fetch()` requests straight to Jagran's servers from the user's browser.

---

### 2. Building the Discovery Engine

Instead of hardcoding hundreds of cities, we decided to hardcode only the 10 major states (Delhi, UP, Bihar, Punjab, etc.) and let the application dynamically scrape the cities on the fly.

When a user selects "Uttar Pradesh", our React app sends a `fetch` request:
```javascript
const response = await fetch('https://epaper.jagran.com/epaper/up-all-editions-epaper.html');
const html = await response.text();
```

**The First Challenge:** 
Initially, I tried parsing the HTML using a standard regex looking for `<a href="...edition...">`. It completely failed. Only one city (National) was discovered. 

Upon deeply inspecting the HTML source, I realized Jagran didn't use standard anchor links for their dropdown menus. Instead, they used JavaScript `onclick` handlers for Google Analytics tracking:

```html
<a style="cursor:pointer" onclick="gaevent('edition-today-193-agra.html','agra','edition','up epaper')">Agra</a>
```

**The Fix:** 
I rewrote the regex parser to ignore the HTML tags and aggressively hunt for the file pattern itself, regardless of whether it lived inside an `href` or an `onclick` attribute:

```javascript
// Matches both: href="edition-2026-05-01-193-agra.html" AND onclick="gaevent('edition-today-193-agra.html', ...)"
const regex = /['"]edition-(?:today|\d{4}-\d{2}-\d{2})-(\d+)-([^'"]+)\.html['"]/g;

let match;
while ((match = regex.exec(html)) !== null) {
  const editionId = match[1]; // e.g. 193
  const rawCityName = match[2]; // e.g. agra-dehat
  // Formatting and grouping logic...
}
```
With this fix, the dropdown populated dynamically with 80+ cities in milliseconds.

---

### 3. The Single-Request Optimization

Once a user selects a city, we need to know how many pages exist in that day's newspaper and get the URLs for all the page images. Sending a request for every potential page until we hit a 404 would be incredibly slow.

**The Breakthrough:**
If you load the very first page of any edition (`page-1.html`), the raw HTML contains a hidden unordered list (`<ul>`) that populates the bottom carousel of the official site. 

```html
<li class="menu-toc-current" id="thumbimg" title="1">
  <img data-src="https://epaperapi.jagran.com/EpaperImages/.../30agr-pg1-0020516183ss.png">
</li>
```
By feeding the `page-1` HTML into the browser's native `DOMParser`, we extracted the entire array of pages instantly. One network request yielded the entire edition's gallery.

```javascript
const parser = new DOMParser();
const doc = parser.parseFromString(html, 'text/html');
const listItems = Array.from(doc.querySelectorAll('li[id="thumbimg"] img, li.menu-toc-current img'));
```

---

### 4. Cracking the Image Quality Tiers

This was the most fascinating part of the project. The user noticed that the images in our custom reader looked significantly worse than the official site. 

If we look at the URL extracted from the HTML above, it ends in `ss.png` (`...30agr-pg1-0020516183ss.png`).
- `ss.png`: This is the ultra-low-resolution thumbnail (approx. **17 KB**).

My initial logic was to simply string-replace `ss.png` with `.png`.
- `.png` (No prefix): This generated an image (approx. **369 KB**), which was medium-quality but still blurry when zoomed in.

By checking the network payload of Jagran's native zoom feature, we discovered a hidden third tier. The absolute highest quality, uncompressed images are prefixed with `M-`.
- `M-...png`: This is the premium high-resolution image (approx. **598 KB**).

**The Solution:**
I updated our URL parsing engine to strip the thumbnail suffix and forcefully inject the `M-` prefix into the filename path.

```javascript
// Extract: https://epaperapi.../30agr-pg1-0020516183ss.png
let fullUrl = src.replace('ss.png', '.png').replace('ss.jpg', '.jpg');
const urlParts = fullUrl.split('/');
const filename = urlParts.pop() || '';

if (filename && !filename.startsWith('M-')) {
  urlParts.push('M-' + filename); 
  // Yields: https://epaperapi.../M-30agr-pg1-0020516183.png
}
fullUrl = urlParts.join('/');
```

We also stopped using the `ss.png` thumbnails in our UI entirely. Instead, we feed the `M-` high-res image into our React Gallery and let the browser natively scale it down via CSS. The visual difference was staggering.

---

### 5. The Reader Experience & Download Integrity

With the data engine built, we focused heavily on aesthetics, using a design system ported from a previous project (`HT-ePaperScraper`). We utilized Vanilla CSS and Lucide React icons to create a glassy, minimalist UI.

To build the immersive reading experience, we wrapped our `M-` images in `react-zoom-pan-pinch`. This gave us out-of-the-box support for:
- Mouse-wheel zooming
- Double-click magnification
- Drag-to-pan physics

**The Download Dilemma:**
Initially, to allow users to download pages, I fetched the image, converted it to a Blob, and forced a download via `URL.createObjectURL(blob)`. However, doing this natively via JS can sometimes lead to perceived quality drops or unnecessary browser memory overhead.

To guarantee absolute integrity, I stripped out the Blob conversion entirely. The download button simply acts as a direct `<a href={fullImageUrl} target="_blank">` link pointing straight to Jagran's `M-` asset. No conversions, no compression, just the raw source file.

---

### Conclusion

The result is a lightning-fast, highly aesthetic ePaper viewer that runs 100% locally in the browser. 

By leveraging native CORS headers, identifying hidden DOM elements, and deciphering Jagran's image quality routing, we bypassed the need for any backend infrastructure. The repository simply pushes to GitHub, compiles via Vite GitHub Actions, and deploys natively to GitHub Pages as a masterclass in static web scraping.

---

## Disclaimer

This project is an independent viewer and is not affiliated with, endorsed by, or associated with Hindustan Times or any of its parent organizations.

**Jagran-ePaperScraping does not host, store, redistribute, modify, or republish newspaper pages on its own servers.** The application merely provides access to publicly available resources that are already accessible through the official publisher infrastructure.

All newspaper pages are loaded directly from their original source URLs at the time of viewing. **No copyrighted content is permanently stored, mirrored, or redistributed by this project.**

If you are a copyright holder and believe any aspect of this project infringes upon your rights, please open an issue or contact the project maintainer so the matter can be reviewed promptly.

*This project is intended solely for educational, research, archival exploration, and personal reading purposes.*

---
Made with ♥ by Aryan Raj
