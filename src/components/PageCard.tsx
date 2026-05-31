import React, { useState } from 'react';
import { Download, Maximize2 } from 'lucide-react';
import type { PageData } from '../services/jagranApi';

interface PageCardProps {
  page: PageData;
  onOpenReader: (pageNumber: number) => void;
}

export const PageCard: React.FC<PageCardProps> = ({ page, onOpenReader }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading) return;
    
    try {
      setIsDownloading(true);
      const response = await fetch(page.fullImageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Jagran_Archive_Page_${page.pageNumber}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      console.error('Download failed', error);
      // Fallback
      window.open(page.fullImageUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="page-card">
      <div className="card-image-container" onClick={() => onOpenReader(page.pageNumber)}>
        {!imageLoaded && <div className="skeleton" style={{ width: '100%', height: '100%', position: 'absolute' }} />}
        <img
          src={page.fullImageUrl}
          alt={`Page ${page.pageNumber}`}
          className="card-image"
          onLoad={() => setImageLoaded(true)}
          style={{ opacity: imageLoaded ? 1 : 0 }}
        />
      </div>
      <div className="card-footer">
        <div className="card-info">
          <span className="card-page-num serif">Page {page.pageNumber}</span>
          <span className="card-title">E-Paper Page</span>
        </div>
        <div className="card-actions">
          <button 
            className="btn-icon" 
            onClick={() => onOpenReader(page.pageNumber)}
            title="Open in Reader"
          >
            <Maximize2 size={20} />
          </button>
          <button 
            className="btn-icon" 
            onClick={handleDownload}
            title="Download Full Resolution"
            disabled={isDownloading}
            style={{ opacity: isDownloading ? 0.5 : 1 }}
          >
            <Download size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
