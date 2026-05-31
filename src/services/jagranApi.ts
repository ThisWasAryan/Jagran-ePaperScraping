export interface Edition {
  id: string;
  name: string;
  url: string;
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
}

// These are the states we know exist.
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

export async function fetchCitiesForState(stateId: string): Promise<City[]> {
  // dateStr is YYYY-MM-DD
  const url = `https://epaper.jagran.com/epaper/${stateId}-all-editions-epaper.html`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch state ${stateId}`);
  }
  const html = await response.text();


  // The actual parsing logic depends on Jagran's HTML structure.
  // Typical structure might involve links to editions.
  // The user notes: https://epaper.jagran.com/epaper/edition-{YYYY}-{MM}-{DD}-{editionId}-{editionName}.html
  // Let's find all links matching this pattern in the state page.
  
  // Jagran uses onclick="gaevent('edition-today-193-agra.html',...)" or href="edition-2026-05-01-193-agra.html"
  const regex = /['"]edition-(?:today|\d{4}-\d{2}-\d{2})-(\d+)-([^'"]+)\.html['"]/g;
  const editionMap = new Map<string, Edition[]>();
  
  let match;
  while ((match = regex.exec(html)) !== null) {
    const editionId = match[1];
    let editionName = match[2];
    
    // Sometimes edition name might contain %20 or dashes. We decode if necessary.
    editionName = decodeURIComponent(editionName).replace(/-/g, ' ');
    
    // Group by city. For Jagran, often editionName is the city name, or "{City} City"
    let rawCityName = editionName.replace(/ City$/i, '').trim();
    const cityName = rawCityName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    
    if (!editionMap.has(cityName)) {
      editionMap.set(cityName, []);
    }
    
    // Check if this edition is already in the list
    const cityEditions = editionMap.get(cityName)!;
    if (!cityEditions.find(e => e.id === editionId)) {
      // Capitalize properly (e.g. "agra dehat" -> "Agra Dehat", "KASGANJ" -> "Kasganj")
      const displayName = editionName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      
      cityEditions.push({
        id: editionId,
        name: displayName,
        url: '' // Not strictly needed
      });
    }
  }

  const cities: City[] = [];
  for (const [name, editions] of editionMap.entries()) {
    cities.push({ name, editions });
  }
  
  return cities.sort((a, b) => a.name.localeCompare(b.name));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function getReaderUrl(dateStr: string, editionId: string, editionName: string): string {
  // dateStr is YYYY-MM-DD
  const [yyyy, mm, dd] = dateStr.split('-');
  const monthStr = MONTHS[parseInt(mm, 10) - 1];
  const formattedEditionName = editionName.replace(/ /g, '-');
  
  // Example: https://epaper.jagran.com/epaper/01-May-2026-205-Bhagalpur-City-edition-Bhagalpur-City.html
  return `https://epaper.jagran.com/epaper/${dd}-${monthStr}-${yyyy}-${editionId}-${formattedEditionName}-edition-${formattedEditionName}-page-1.html`;
}

export async function fetchPagesForEdition(dateStr: string, editionId: string, editionName: string): Promise<PageData[]> {
  const page1Url = getReaderUrl(dateStr, editionId, editionName);
  
  const response = await fetch(page1Url);
  if (!response.ok) {
    throw new Error(`Failed to fetch page 1 for edition ${editionId}`);
  }
  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // The hidden ul with thumbnails has id "thumbimg" (actually li elements have id="thumbimg")
  // From user's HTML dump:
  // <li class="menu-toc-current" id="thumbimg" title="1"><a href="#item1" id="items1"><img class="lazyload"  id="img1" data-src="https://epaperapi.jagran.com/EpaperImages/May/01052026/Agra/30agr-pg1-0020516183ss.png"></a></li>
  
  const listItems = Array.from(doc.querySelectorAll('li[id="thumbimg"] img, li.menu-toc-current img'));
  const pages: PageData[] = [];
  
  listItems.forEach(img => {
    let src = img.getAttribute('data-src') || img.getAttribute('src');
    if (src) {
      // Find the page number from the title or id
      const parentLi = img.closest('li');
      let pageNum = parseInt(parentLi?.getAttribute('title') || '0', 10);
      
      if (!pageNum) {
        // extract from pgX in URL
        const match = src.match(/-pg(\d+)-/);
        if (match) pageNum = parseInt(match[1], 10);
      }
      
      if (pageNum > 0) {
        // Jagran uses ss.png/jpg for thumbnails. 
        // Replace with .png/.jpg and prepend M- to the filename to get the true high-res version.
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

  // Deduplicate and sort
  const uniquePages = new Map<number, PageData>();
  pages.forEach(p => uniquePages.set(p.pageNumber, p));
  
  return Array.from(uniquePages.values()).sort((a, b) => a.pageNumber - b.pageNumber);
}
