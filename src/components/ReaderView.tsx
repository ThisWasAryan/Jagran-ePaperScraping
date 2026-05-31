import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, Download, Maximize, RotateCcw } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { PageData } from '../services/jagranApi';

interface ReaderViewProps {
  pages: PageData[];
  initialPageNumber: number;
  onClose: () => void;
}

export const ReaderView: React.FC<ReaderViewProps> = ({ pages, initialPageNumber, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(() => {
    const index = pages.findIndex((p) => p.pageNumber === initialPageNumber);
    return index >= 0 ? index : 0;
  });
  
  const [imageLoaded, setImageLoaded] = useState(false);
  const isDragging = useRef(false);

  const currentPage = pages[currentIndex];

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setImageLoaded(false);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < pages.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setImageLoaded(false);
    }
  }, [currentIndex, pages.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, onClose]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  if (!currentPage) return null;

  return (
    <div className="reader-container">
      <div className="reader-header">
        <div className="reader-title-area">
          <button className="reader-close" onClick={onClose}>
            <X size={24} />
            <span>Close</span>
          </button>
          <div className="reader-page-info">
            <span className="reader-page-number serif">Page {currentPage.pageNumber} of {pages[pages.length - 1].pageNumber}</span>
            <span className="reader-page-title">E-Paper Page</span>
          </div>
        </div>

        <div className="reader-controls">
          <button className="btn-icon" onClick={toggleFullscreen} title="Toggle Fullscreen">
            <Maximize size={20} />
          </button>
          <a
            className="btn-icon"
            href={currentPage.fullImageUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open Original Image"
          >
            <Download size={20} />
          </a>
        </div>
      </div>

      <div className="reader-content">
        {!imageLoaded && (
          <div className="spinner" style={{ position: 'absolute', color: 'var(--text-secondary)' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        )}
        
        <TransformWrapper
          initialScale={1}
          minScale={0.5}
          maxScale={5}
          centerOnInit={true}
          wheel={{ step: 0.1 }}
          doubleClick={{ step: 3, mode: 'zoomIn' }}
          panning={{ velocityDisabled: false }}
        >
          {({ zoomIn, zoomOut, resetTransform, setTransform, state }) => {
            const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
              if (isDragging.current) return;
              e.stopPropagation();
              const { scale, positionX, positionY } = state;
              
              // Target step for single click
              const step = 1.5;
              const newScale = Math.min(scale * step, 5);
              if (newScale === scale) return;
          
              const wrapper = e.currentTarget.parentElement;
              if (!wrapper) return;
              const rect = wrapper.getBoundingClientRect();
              
              const cursorX = e.clientX - rect.left;
              const cursorY = e.clientY - rect.top;
          
              const newPosX = cursorX - (cursorX - positionX) * (newScale / scale);
              const newPosY = cursorY - (cursorY - positionY) * (newScale / scale);
          
              setTransform(newPosX, newPosY, newScale, 300, "easeOutQuad");
            };

            return (
            <>
              {/* Overlay zoom controls */}
              <div style={{ position: 'absolute', bottom: '2rem', display: 'flex', gap: '0.5rem', background: 'var(--surface-color)', padding: '0.5rem', borderRadius: 'var(--border-radius-lg)', boxShadow: 'var(--shadow-lg)', zIndex: 10 }}>
                <button className="btn-icon" onClick={() => zoomOut()} title="Zoom Out"><ZoomOut size={20} /></button>
                <button className="btn-icon" onClick={() => resetTransform()} title="Reset Zoom"><RotateCcw size={20} /></button>
                <button className="btn-icon" onClick={() => zoomIn()} title="Zoom In"><ZoomIn size={20} /></button>
              </div>

              <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                <img
                  src={currentPage.fullImageUrl}
                  alt={`Page ${currentPage.pageNumber}`}
                  onLoad={() => setImageLoaded(true)}
                  onClick={handleImageClick}
                  onPointerDown={() => { isDragging.current = false; }}
                  onPointerMove={() => { isDragging.current = true; }}
                  style={{ 
                    opacity: imageLoaded ? 1 : 0, 
                    transition: 'opacity 0.3s ease',
                    maxWidth: '100vw', 
                    maxHeight: '100vh', 
                    objectFit: 'contain',
                    cursor: state.scale > 1 ? 'grab' : 'zoom-in'
                  }}
                  draggable="false"
                />
              </TransformComponent>
            </>
          )}}
        </TransformWrapper>

        <button 
          className="reader-nav reader-prev" 
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
          disabled={currentIndex === 0}
          aria-label="Previous Page"
          style={{ zIndex: 11 }}
        >
          <ChevronLeft size={32} />
        </button>

        <button 
          className="reader-nav reader-next" 
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
          disabled={currentIndex === pages.length - 1}
          aria-label="Next Page"
          style={{ zIndex: 11 }}
        >
          <ChevronRight size={32} />
        </button>
      </div>

      {/* Background Preloader for upcoming pages */}
      <div style={{ display: 'none' }} aria-hidden="true">
        {pages.slice(currentIndex + 1, currentIndex + 4).map((p) => (
          <img key={`preload-${p.pageNumber}`} src={p.fullImageUrl} alt="" />
        ))}
      </div>
    </div>
  );
};
