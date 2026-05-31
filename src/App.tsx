import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { AlertCircle } from 'lucide-react';
import './App.css';

import { Header } from './components/Header';
import { Selector } from './components/Selector';
import { GalleryView } from './components/GalleryView';
import { ReaderView } from './components/ReaderView';
import { LandingExperience } from './components/LandingExperience';
import { fetchPagesForEdition, STATES, type City, type PageData } from './services/jagranApi';

function App() {
  const [selectedState, setSelectedState] = useState(STATES[0].id);
  const [selectedCityName, setSelectedCityName] = useState('');
  const [selectedEditionId, setSelectedEditionId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [availableCities, setAvailableCities] = useState<City[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [pages, setPages] = useState<PageData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [readerPage, setReaderPage] = useState<number | null>(null);

  // Scroll direction detection for mobile sticky header
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateScrollDir = () => {
      const scrollY = window.scrollY;
      
      // Only hide if we've scrolled down a bit (not at the very top)
      if (Math.abs(scrollY - lastScrollY) < 10) {
        ticking = false;
        return;
      }
      
      setIsHeaderHidden(scrollY > lastScrollY && scrollY > 100);
      lastScrollY = scrollY > 0 ? scrollY : 0;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDir);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSearch = async () => {
    if (!selectedEditionId) {
      setError("Please select an edition.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setPages([]);

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const currentCity = availableCities.find(c => c.name === selectedCityName);
      const currentEdition = currentCity?.editions.find(e => e.id === selectedEditionId);
      
      if (!currentEdition) {
        throw new Error("Edition details not found.");
      }

      const fetchedPages = await fetchPagesForEdition(dateStr, currentEdition.id, currentEdition.name);
      
      if (fetchedPages.length === 0) {
        setError("No pages found for this edition on the selected date.");
      } else {
        setPages(fetchedPages);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch edition pages. The edition might not be published on this date.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className={`top-nav-container ${isHeaderHidden ? 'hidden' : ''}`}>
        <Header />
        <Selector 
          selectedState={selectedState}
          onStateChange={setSelectedState}
          selectedCityName={selectedCityName}
          onCityNameChange={setSelectedCityName}
          selectedEditionId={selectedEditionId}
          onEditionIdChange={setSelectedEditionId}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onSearch={handleSearch}
          isLoading={isLoading}
          availableCities={availableCities}
          setAvailableCities={setAvailableCities}
        />
      </div>

      <main className="main-content">
        {isLoading && (
          <div className="status-container">
            <div className="spinner status-icon" style={{ color: 'var(--text-secondary)' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="2" x2="12" y2="6"></line>
                <line x1="12" y1="18" x2="12" y2="22"></line>
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                <line x1="2" y1="12" x2="6" y2="12"></line>
                <line x1="18" y1="12" x2="22" y2="12"></line>
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                <line x1="16.24" y1="4.93" x2="19.07" y2="7.76"></line>
              </svg>
            </div>
            <h2 className="status-title serif">Discovering Edition</h2>
            <p>Fetching and extracting pages from the archive.</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="status-container">
            <AlertCircle size={48} className="status-icon" style={{ color: '#ef4444' }} />
            <h2 className="status-title serif">Edition Not Available</h2>
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !error && pages.length === 0 && (
          <LandingExperience />
        )}

        {!isLoading && !error && pages.length > 0 && (
          <GalleryView pages={pages as any} onOpenReader={setReaderPage} />
        )}

        {readerPage !== null && (
          <ReaderView 
            pages={pages as any} 
            initialPageNumber={readerPage} 
            onClose={() => setReaderPage(null)} 
          />
        )}
      </main>

      <footer className="app-footer">
        <p>Made with ♥ by Aryan Raj</p>
        <a href="https://github.com/ThisWasAryan/Jagran-ePaperScraping?utm_source=chatgpt.com" target="_blank" rel="noopener noreferrer">
          GitHub Repository
        </a>
      </footer>
    </div>
  );
}

export default App;
