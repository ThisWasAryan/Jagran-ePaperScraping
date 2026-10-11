export interface Edition {
  id: string;
  name: string;
  url: string;
  slug?: string;
}

export interface City {
  name: string;
  editions: Edition[];
}

export interface StateData {
  stateId: string;
  cities: City[];
}

export interface PageData {
  pageNumber: number;
  thumbnailUrl: string;
  fullImageUrl: string;
  pdfUrl?: string;
}

// Exactly the 10 states where Jagran ePaper is actively published
export const STATES = [
  { id: 'up', name: 'Uttar Pradesh' },
  { id: 'bihar', name: 'Bihar' },
  { id: 'jharkhand', name: 'Jharkhand' },
  { id: 'delhi', name: 'Delhi' },
  { id: 'punjab', name: 'Punjab' },
  { id: 'haryana', name: 'Haryana' },
  { id: 'uttarakhand', name: 'Uttarakhand' },
  { id: 'hp', name: 'Himachal Pradesh' },
  { id: 'jk', name: 'Jammu & Kashmir' },
  { id: 'west-bengal', name: 'West Bengal' },
];

const STATE_ALIASES: Record<string, string[]> = {
  'up': ['u.p', 'uttar pradesh'],
  'bihar': ['bihar'],
  'jharkhand': ['jharkhand'],
  'delhi': ['delhi ncr', 'delhi'],
  'punjab': ['punjab'],
  'haryana': ['haryana'],
  'uttarakhand': ['uttrakhand', 'uttarakhand'],
  'hp': ['himachal', 'himachal pradesh'],
  'jk': ['j&k', 'jammu & kashmir', 'jammu and kashmir'],
  'west-bengal': ['w.bengal', 'west bengal'],
};

// In-memory cache for fast state switching
let cachedStateTree: Map<string, City[]> | null = null;
let pendingStateFetch: Promise<Map<string, City[]>> | null = null;

function capitalizeWords(str: string): string {
  return str
    .toLowerCase()
    .split(/[\s-]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Parses Next.js __NEXT_DATA__ embedded JSON containing currentCities for all states
 */
function parseNextDataStates(html: string): Map<string, City[]> | null {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
  if (!match) return null;

  try {
    const json = JSON.parse(match[1]);
    const currentCities = json?.props?.pageProps?.currentCities;
    if (!Array.isArray(currentCities)) return null;

    const resultMap = new Map<string, City[]>();

    for (const [stateId, aliases] of Object.entries(STATE_ALIASES)) {
      const stateObj = currentCities.find((s: any) => {
        const sName = (s.state_name || '').toLowerCase().trim();
        return aliases.some(alias => sName === alias || sName.includes(alias));
      });

      if (!stateObj || !Array.isArray(stateObj.regions)) {
        continue;
      }

      const cityMap = new Map<string, Edition[]>();

      for (const reg of stateObj.regions) {
        if (!Array.isArray(reg.cities)) continue;
        for (const item of reg.cities) {
          const rawName = String(item.city_name || item.slug || '').trim();
          if (!rawName) continue;

          // Strip common edition/region descriptors for clean base city grouping
          let baseCity = rawName
            .replace(/\b(city|dehat|nagar|anchal|edition|remote)\b/gi, '')
            .trim();
          if (!baseCity) baseCity = rawName;

          const cityDisplayName = capitalizeWords(baseCity);
          const editionDisplayName = capitalizeWords(rawName);

          if (!cityMap.has(cityDisplayName)) {
            cityMap.set(cityDisplayName, []);
          }

          const editions = cityMap.get(cityDisplayName)!;
          const editionCode = String(item.code);
          if (!editions.find(e => e.id === editionCode)) {
            editions.push({
              id: editionCode,
              name: editionDisplayName,
              url: '',
              slug: item.slug
            });
          }
        }
      }

      const cities: City[] = [];
      for (const [name, editions] of cityMap.entries()) {
        editions.sort((a, b) => {
          if (a.name.toLowerCase() === name.toLowerCase()) return -1;
          if (b.name.toLowerCase() === name.toLowerCase()) return 1;
          return a.name.localeCompare(b.name);
        });
        cities.push({ name, editions });
      }

      cities.sort((a, b) => a.name.localeCompare(b.name));
      resultMap.set(stateId, cities);
    }

    return resultMap;
  } catch (err) {
    console.warn("Failed to parse Next.js state data:", err);
    return null;
  }
}

/**
 * Legacy HTML scraper fallback in case Next.js hydration payload is absent
 */
function parseLegacyCities(html: string): City[] {
  const regex = /['"]edition-(?:today|\d{4}-\d{2}-\d{2})-(\d+)-([^'"]+)\.html['"]/g;
  const editionMap = new Map<string, Edition[]>();
  let match;

  while ((match = regex.exec(html)) !== null) {
    const editionId = match[1];
    let editionName = decodeURIComponent(match[2]).replace(/-/g, ' ');
    const rawCityName = editionName.replace(/ City$/i, '').trim();
    const cityName = capitalizeWords(rawCityName);

    if (!editionMap.has(cityName)) {
      editionMap.set(cityName, []);
    }

    const cityEditions = editionMap.get(cityName)!;
    if (!cityEditions.find(e => e.id === editionId)) {
      cityEditions.push({
        id: editionId,
        name: capitalizeWords(editionName),
        url: ''
      });
    }
  }

  const cities: City[] = [];
  for (const [name, editions] of editionMap.entries()) {
    cities.push({ name, editions });
  }
  return cities.sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchCitiesForState(stateId: string): Promise<City[]> {
  // If we already have the state tree cached, return immediately
  if (cachedStateTree && cachedStateTree.has(stateId)) {
    return cachedStateTree.get(stateId)!;
  }

  // Deduplicate in-flight network requests
  if (!pendingStateFetch) {
    pendingStateFetch = (async () => {
      const urlsToTry = [
        `https://epaper.jagran.com/${stateId}-all-editions-epaper.html`,
        `https://epaper.jagran.com/`,
        `https://epaper.jagran.com/epaper/${stateId}-all-editions-epaper.html`
      ];

      for (const url of urlsToTry) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const html = await res.text();
            const parsed = parseNextDataStates(html);
            if (parsed && parsed.size > 0) {
              return parsed;
            }
          }
        } catch (e) {
          console.warn(`Failed fetching ${url}:`, e);
        }
      }
      return new Map<string, City[]>();
    })();
  }

  try {
    cachedStateTree = await pendingStateFetch;
  } finally {
    pendingStateFetch = null;
  }

  if (cachedStateTree && cachedStateTree.has(stateId)) {
    return cachedStateTree.get(stateId)!;
  }

  // Fallback to legacy single-state HTML fetch if Next.js hydration was missing
  try {
    const fallbackUrl = `https://epaper.jagran.com/epaper/${stateId}-all-editions-epaper.html`;
    const res = await fetch(fallbackUrl);
    if (res.ok) {
      const html = await res.text();
      return parseLegacyCities(html);
    }
  } catch (err) {
    console.error("Legacy state fetch also failed:", err);
  }

  return [];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function getReaderUrl(dateStr: string, editionId: string, editionName: string): string {
  // dateStr is YYYY-MM-DD
  const [yyyy, mm, dd] = dateStr.split('-');
  const monthStr = MONTHS[parseInt(mm, 10) - 1];
  const formattedEditionName = editionName.trim().replace(/\s+/g, '-');
  
  // Point directly to the current Next.js route
  return `https://epaper.jagran.com/${dd}-${monthStr}-${yyyy}-${editionId}-${formattedEditionName}-edition-${formattedEditionName}-page-1.html`;
}

export async function fetchPagesForEdition(dateStr: string, editionId: string, editionName: string): Promise<PageData[]> {
  const page1Url = getReaderUrl(dateStr, editionId, editionName);
  
  let response = await fetch(page1Url);
  
  // If direct URL is 404, try lowercased edition slug or legacy /epaper/ prefix
  if (!response.ok) {
    const [yyyy, mm, dd] = dateStr.split('-');
    const monthStr = MONTHS[parseInt(mm, 10) - 1];
    const lowerName = editionName.trim().toLowerCase().replace(/\s+/g, '-');
    const lowerUrl = `https://epaper.jagran.com/${dd}-${monthStr}-${yyyy}-${editionId}-${lowerName}-edition-${lowerName}-page-1.html`;
    try {
      const altRes = await fetch(lowerUrl);
      if (altRes.ok) response = altRes;
    } catch {}
  }

  if (!response.ok) {
    const legacyUrl = `https://epaper.jagran.com/epaper/${page1Url.replace('https://epaper.jagran.com/', '')}`;
    try {
      const legacyRes = await fetch(legacyUrl);
      if (legacyRes.ok) response = legacyRes;
    } catch {}
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch pages for edition "${editionName}" on ${dateStr} (Status: ${response.status})`);
  }

  const html = await response.text();

  // 1. Primary Strategy: Next.js __NEXT_DATA__
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
  if (nextDataMatch) {
    try {
      const parsed = JSON.parse(nextDataMatch[1]);
      const pageList = parsed?.props?.pageProps?.data;
      if (Array.isArray(pageList) && pageList.length > 0) {
        return pageList.map((p: any) => {
          let fullUrl = p.page_largeimage;
          if (!fullUrl && p.page_image) {
            fullUrl = p.page_image.replace(/\/([^/]+)$/, '/M-$1');
          }
          return {
            pageNumber: Number(p.pageno) || 1,
            thumbnailUrl: p.page_thumbimage || p.page_image,
            fullImageUrl: fullUrl || p.page_thumbimage,
            pdfUrl: p.page_pdf || undefined
          };
        }).sort((a: PageData, b: PageData) => a.pageNumber - b.pageNumber);
      }
    } catch (e) {
      console.warn("Failed to parse __NEXT_DATA__, falling back to DOM parsing:", e);
    }
  }

  // 2. Fallback Strategy: Legacy DOM parsing
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const listItems = Array.from(doc.querySelectorAll('li[id="thumbimg"] img, li.menu-toc-current img'));
  const pages: PageData[] = [];
  
  listItems.forEach(img => {
    let src = img.getAttribute('data-src') || img.getAttribute('src');
    if (src) {
      const parentLi = img.closest('li');
      let pageNum = parseInt(parentLi?.getAttribute('title') || '0', 10);
      
      if (!pageNum) {
        const match = src.match(/-pg(\d+)-/);
        if (match) pageNum = parseInt(match[1], 10);
      }
      
      if (pageNum > 0) {
        let fullUrl = src.replace('ss.png', '.png').replace('ss.jpg', '.jpg');
        const urlParts = fullUrl.split('/');
        const filename = urlParts.pop() || '';
        if (filename && !filename.startsWith('M-')) {
          urlParts.push('M-' + filename);
          fullUrl = urlParts.join('/');
        } else {
          urlParts.push(filename);
          fullUrl = urlParts.join('/');
        }

        pages.push({
          pageNumber: pageNum,
          thumbnailUrl: src,
          fullImageUrl: fullUrl
        });
      }
    }
  });

  const uniquePages = new Map<number, PageData>();
  pages.forEach(p => uniquePages.set(p.pageNumber, p));
  
  return Array.from(uniquePages.values()).sort((a, b) => a.pageNumber - b.pageNumber);
}
