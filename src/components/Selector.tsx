import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, Edit2 } from 'lucide-react';
import { STATES, fetchCitiesForState, type City } from '../services/jagranApi';

interface SelectorProps {
  selectedState: string;
  onStateChange: (stateId: string) => void;
  selectedCityName: string;
  onCityNameChange: (cityName: string) => void;
  selectedEditionId: string;
  onEditionIdChange: (editionId: string) => void;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onSearch: () => void;
  isLoading: boolean;
  
  availableCities: City[];
  setAvailableCities: (cities: City[]) => void;
}

export const Selector: React.FC<SelectorProps> = ({
  selectedState,
  onStateChange,
  selectedCityName,
  onCityNameChange,
  selectedEditionId,
  onEditionIdChange,
  selectedDate,
  onDateChange,
  onSearch,
  isLoading,
  availableCities,
  setAvailableCities
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isFetchingCities, setIsFetchingCities] = useState(false);

  // Fetch cities when state or date changes
  useEffect(() => {
    let active = true;
    const loadCities = async () => {
      setIsFetchingCities(true);
      try {
        const cities = await fetchCitiesForState(selectedState);
        if (active) {
          setAvailableCities(cities);
          // Auto select first city and edition if available
          if (cities.length > 0) {
            onCityNameChange(cities[0].name);
            if (cities[0].editions.length > 0) {
              onEditionIdChange(cities[0].editions[0].id);
            }
          } else {
            onCityNameChange('');
            onEditionIdChange('');
          }
        }
      } catch (err) {
        console.error("Failed to load cities", err);
        if (active) {
          setAvailableCities([]);
        }
      } finally {
        if (active) setIsFetchingCities(false);
      }
    };
    
    loadCities();
    
    return () => { active = false; };
  }, [selectedState, selectedDate]);

  const handleSearch = () => {
    if (window.innerWidth <= 768) {
      setIsExpanded(false);
    }
    onSearch();
  };

  const currentCity = availableCities.find(c => c.name === selectedCityName);
  const availableEditions = currentCity?.editions || [];
  
  const stateObj = STATES.find(s => s.id === selectedState);
  const editionObj = availableEditions.find(e => e.id === selectedEditionId);
  const compactName = `${stateObj?.name || 'Unknown'}, ${currentCity?.name || 'Unknown'}${editionObj ? ` - ${editionObj.name}` : ''}`;

  if (!isExpanded) {
    return (
      <div className="selector-bar compact-selector">
        <div className="compact-info">
          <span className="compact-title serif">{compactName}</span>
          <span className="compact-date">{format(selectedDate, 'MMMM d, yyyy')}</span>
        </div>
        <button className="btn-icon" onClick={() => setIsExpanded(true)} title="Edit Selection">
          <Edit2 size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="selector-bar">
      <div className="input-group">
        <label htmlFor="date-select">Publication Date</label>
        <input
          type="date"
          id="date-select"
          className="input-field"
          value={format(selectedDate, 'yyyy-MM-dd')}
          max={format(new Date(), 'yyyy-MM-dd')}
          onChange={(e) => {
            if (e.target.value) {
              onDateChange(new Date(e.target.value));
            }
          }}
          disabled={isLoading || isFetchingCities}
        />
      </div>

      <div className="input-group">
        <label htmlFor="state-select">Select State</label>
        <select
          id="state-select"
          className="input-field"
          value={selectedState}
          onChange={(e) => onStateChange(e.target.value)}
          disabled={isLoading || isFetchingCities}
        >
          {STATES.map((state) => (
            <option key={state.id} value={state.id}>
              {state.name}
            </option>
          ))}
        </select>
      </div>

      <div className="input-group">
        <label htmlFor="city-select">Select City</label>
        <select
          id="city-select"
          className="input-field"
          value={selectedCityName}
          onChange={(e) => {
            onCityNameChange(e.target.value);
            const city = availableCities.find(c => c.name === e.target.value);
            if (city && city.editions.length > 0) {
              onEditionIdChange(city.editions[0].id);
            }
          }}
          disabled={isLoading || isFetchingCities || availableCities.length === 0}
        >
          {availableCities.length === 0 ? <option value="">No cities found</option> : null}
          {availableCities.map((city) => (
            <option key={city.name} value={city.name}>
              {city.name}
            </option>
          ))}
        </select>
      </div>

      <div className="input-group">
        <label htmlFor="edition-select">Select Edition</label>
        <select
          id="edition-select"
          className="input-field"
          value={selectedEditionId}
          onChange={(e) => onEditionIdChange(e.target.value)}
          disabled={isLoading || isFetchingCities || availableEditions.length === 0}
        >
          {availableEditions.length === 0 ? <option value="">No editions found</option> : null}
          {availableEditions.map((edition) => (
            <option key={edition.id} value={edition.id}>
              {edition.name}
            </option>
          ))}
        </select>
      </div>

      <button 
        className="btn-primary" 
        onClick={handleSearch} 
        disabled={isLoading || isFetchingCities || !selectedEditionId}
      >
        <Search size={20} />
        <span>{isLoading ? 'Loading...' : 'Load Edition'}</span>
      </button>
    </div>
  );
};
