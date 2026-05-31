import React from 'react';
import { BookOpen, Map, Clock, Image as ImageIcon } from 'lucide-react';

export const LandingExperience: React.FC = () => {
  return (
    <div className="landing-container">
      <div className="landing-hero">
        <h1 className="landing-title serif">Jagran ePaperScraper</h1>
        <p className="landing-subtitle">
          Browse, read, and download current and historical Dainik Jagran ePaper editions in high resolution.
        </p>
      </div>

      <div className="landing-features">
        <div className="feature-card">
          <Clock className="feature-icon" size={32} />
          <h3 className="serif">Historical Access</h3>
          <p>Explore past publications and access older editions securely from the archive.</p>
        </div>
        <div className="feature-card">
          <BookOpen className="feature-icon" size={32} />
          <h3 className="serif">Immersive Reader</h3>
          <p>Professional document viewer designed for readability and detailed typographic focus.</p>
        </div>
        <div className="feature-card">
          <Map className="feature-icon" size={32} />
          <h3 className="serif">City Editions</h3>
          <p>Access precise local city editions and regional publications across the country.</p>
        </div>
        <div className="feature-card">
          <ImageIcon className="feature-icon" size={32} />
          <h3 className="serif">Original Quality</h3>
          <p>View the exact high-resolution layouts straight from the publisher's digital press.</p>
        </div>
      </div>
      
      <div className="landing-footer">
        <p>Select a region and publication date from the menu above to begin exploring.</p>
      </div>
    </div>
  );
};
