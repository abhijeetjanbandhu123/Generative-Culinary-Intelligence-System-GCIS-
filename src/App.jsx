import React, { useState, useEffect } from 'react';
import { LayoutGrid, Camera, ClipboardList, ChefHat, Settings as SettingsIcon, AlertTriangle } from 'lucide-react';
import Dashboard from './components/Dashboard.jsx';
import Scanner from './components/Scanner.jsx';
import Inventory from './components/Inventory.jsx';
import SmartChef from './components/SmartChef.jsx';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiStatus, setApiStatus] = useState({ checked: false, configured: false });
  
  // Load local items. We've set up localStorage so we don't lose data when the browser refreshes.
  // Useful for the demo so we don't have to scan food items every single time we show a new tab.
  const [pantry, setPantry] = useState(() => {
    const saved = localStorage.getItem('smart_pantry_items');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse saved pantry items', e); // Just catch and fallback to seed data
      }
    }
    // Seed data so the app has content instantly on first run
    const today = new Date();
    return [
      {
        id: '1',
        name: 'Whole Milk',
        quantity: 1,
        unit: 'bottle',
        dateAdded: today.toISOString().split('T')[0],
        expiryDate: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        freshnessPrediction: 'Fresh (4 days)'
      },
      {
        id: '2',
        name: 'Fresh Eggs',
        quantity: 12,
        unit: 'pieces',
        dateAdded: today.toISOString().split('T')[0],
        expiryDate: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        freshnessPrediction: 'Sealed box (14 days)'
      },
      {
        id: '3',
        name: 'Broccoli',
        quantity: 1,
        unit: 'head',
        dateAdded: today.toISOString().split('T')[0],
        expiryDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        freshnessPrediction: 'Slightly yellowing (2 days)'
      },
      {
        id: '4',
        name: 'Cheddar Cheese',
        quantity: 200,
        unit: 'grams',
        dateAdded: today.toISOString().split('T')[0],
        expiryDate: new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        freshnessPrediction: 'Firm & sealed (8 days)'
      }
    ];
  });

  // Check backend server connection and API status
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setApiStatus({ checked: true, configured: data.apiConfigured || data.openRouterConfigured });
      })
      .catch((err) => {
        console.warn('Backend server not running or unreachable. Using mock simulation.');
        setApiStatus({ checked: true, configured: false });
      });
  }, []);

  // Persist pantry to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('smart_pantry_items', JSON.stringify(pantry));
  }, [pantry]);

  // Helper: Add items to pantry (consolidating duplicates by name)
  const addItemsToPantry = (newItems) => {
    const today = new Date().toISOString().split('T')[0];
    
    setPantry((prev) => {
      const updated = [...prev];
      
      newItems.forEach((item) => {
        const days = parseInt(item.expiryDays) || 7;
        const expiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const matchIndex = updated.findIndex(
          (p) => p.name.toLowerCase() === item.name.toLowerCase()
        );
        
        if (matchIndex > -1) {
          // Replace with new scan data — don't accumulate quantities
          updated[matchIndex].quantity = Number(item.quantity);
          updated[matchIndex].unit = item.unit || updated[matchIndex].unit;
          updated[matchIndex].expiryDate = expiryDate;
          updated[matchIndex].freshnessPrediction = item.freshnessPrediction || updated[matchIndex].freshnessPrediction;
        } else {
          updated.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            name: item.name,
            quantity: Number(item.quantity) || 1,
            unit: item.unit || 'pieces',
            dateAdded: today,
            expiryDate: expiryDate,
            freshnessPrediction: item.freshnessPrediction || `Fresh (${days} days)`
          });
        }
      });
      
      return updated;
    });
  };

  const deleteItem = (id) => {
    setPantry((prev) => prev.filter((item) => item.id !== id));
  };

  const clearPantry = () => {
    if (window.confirm("Are you sure you want to clear all items from your pantry?")) {
      setPantry([]);
    }
  };

  const updateItem = (id, updatedFields) => {
    setPantry((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updatedFields } : item))
    );
  };

  const activePantry = pantry.filter(
    (item) => item.name && item.name.trim() !== '' && Number(item.quantity) > 0
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard pantry={activePantry} setActiveTab={setActiveTab} />;
      case 'scanner':
        return <Scanner addItemsToPantry={addItemsToPantry} setActiveTab={setActiveTab} apiConfigured={apiStatus.configured} />;
      case 'inventory':
        return (
          <Inventory 
            pantry={activePantry} 
            deleteItem={deleteItem} 
            clearPantry={clearPantry}
            updateItem={updateItem} 
            addItems={addItemsToPantry} 
          />
        );
      case 'chef':
        return <SmartChef pantry={activePantry} />;
      default:
        return <Dashboard pantry={activePantry} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar glass">
        <div className="logo-container">
          <span className="logo-icon">🍳</span>
          <h1 className="logo-text" style={{ fontSize: '0.85rem', lineHeight: '1.3' }}>Generative Culinary Intelligence System</h1>
        </div>

        <nav>
          <ul className="nav-menu">
            <li className="nav-item">
              <button
                className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <LayoutGrid size={20} />
                Dashboard
              </button>
            </li>
             <li className="nav-item">
              <button
                className={`nav-btn ${activeTab === 'scanner' ? 'active' : ''}`}
                onClick={() => setActiveTab('scanner')}
              >
                <Camera size={20} />
                Add Ingredients
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-btn ${activeTab === 'inventory' ? 'active' : ''}`}
                onClick={() => setActiveTab('inventory')}
              >
                <ClipboardList size={20} />
                Pantry Inventory
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-btn ${activeTab === 'chef' ? 'active' : ''}`}
                onClick={() => setActiveTab('chef')}
              >
                <ChefHat size={20} />
                Recipe Builder
              </button>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div>Service Connection:</div>
          {apiStatus.checked ? (
            apiStatus.configured ? (
              <span className="api-badge active">● Cloud API Active</span>
            ) : (
              <span className="api-badge mock">▲ Local Database</span>
            )
          ) : (
            <span className="api-badge mock">Connecting to server...</span>
          )}
          <div style={{ marginTop: '10px', fontSize: '0.75rem', opacity: 0.5 }}>
            Project Version 1.0.0
          </div>
        </div>
      </aside>

      {/* Main Page Area */}
      <main className="main-content">
        {renderTabContent()}
      </main>
    </div>
  );
}

export default App;