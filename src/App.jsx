import React, { useState, useEffect } from 'react';
import { LayoutGrid, Camera, ClipboardList, ChefHat, Flame, Trash2 } from 'lucide-react';
import Dashboard from './components/Dashboard.jsx';
import Scanner from './components/Scanner.jsx';
import Inventory from './components/Inventory.jsx';
import SmartChef from './components/SmartChef.jsx';

// ─── Priority List Page ───────────────────────────────────────────────────────
function PriorityList({ pantry, setActiveTab }) {
  const calculateDaysLeft = (expiryDateStr) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const expiry = new Date(expiryDateStr); expiry.setHours(0,0,0,0);
    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  };

  const priorityList = [...pantry]
    .map(item => ({ ...item, daysLeft: calculateDaysLeft(item.expiryDate) }))
    .filter(item => item.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const getColor = (d) => d <= 1 ? '#ef4444' : d <= 3 ? '#f97316' : d <= 7 ? '#eab308' : '#10b981';
  const getLabel = (d) => d === 0 ? 'Use Today!' : d === 1 ? 'Use Tomorrow' : `${d} days left`;

  return (
    <div>
      <header className="page-header">
        <h2 className="page-title">Chef's Priority List</h2>
        <p className="page-subtitle">Ingredients ranked by freshness — use the ones at the top first to avoid waste.</p>
      </header>

      {priorityList.length === 0 ? (
        <div className="empty-placeholder glass">
          <span className="empty-icon">🥦</span>
          <h3>No ingredients in pantry</h3>
          <p>Add ingredients via the Scanner tab to see priority recommendations.</p>
        </div>
      ) : (
        <div className="glass" style={{ padding: '1.8rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {priorityList.map((item, idx) => {
              const color = getColor(item.daysLeft);
              const label = getLabel(item.daysLeft);
              return (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '12px 16px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${color}33`
                }}>
                  <span style={{
                    minWidth: '30px', height: '30px', borderRadius: '50%',
                    background: color + '22', color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.82rem', fontWeight: 700
                  }}>
                    {idx + 1}
                  </span>
                  <div style={{ flexGrow: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.name}</span>
                    {item.freshnessPrediction && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                        • {item.freshnessPrediction}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {item.quantity} {item.unit}
                  </span>
                  <span style={{
                    padding: '4px 12px', borderRadius: '20px',
                    background: color + '22', color,
                    fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap'
                  }}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
          <button className="btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => setActiveTab('chef')}>
            <ChefHat size={16} /> Generate Recipes From These
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Waste Log Page ───────────────────────────────────────────────────────────
function WasteLog({ pantry, setActiveTab }) {
  const calculateDaysLeft = (expiryDateStr) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const expiry = new Date(expiryDateStr); expiry.setHours(0,0,0,0);
    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  };

  const wasteList = [...pantry]
    .map(item => ({ ...item, daysLeft: calculateDaysLeft(item.expiryDate) }))
    .filter(item => item.daysLeft < 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <div>
      <header className="page-header">
        <h2 className="page-title">Food Waste Log</h2>
        <p className="page-subtitle">Items past their expiry date that should be discarded from your pantry.</p>
      </header>

      {wasteList.length === 0 ? (
        <div className="empty-placeholder glass">
          <span className="empty-icon">✅</span>
          <h3>No expired items!</h3>
          <p>Your pantry is clean — everything is within its shelf life.</p>
        </div>
      ) : (
        <div className="glass" style={{ padding: '1.8rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {wasteList.map(item => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '12px 16px', borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.04)',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                <span style={{ fontSize: '1.1rem' }}>🗑️</span>
                <div style={{ flexGrow: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', textDecoration: 'line-through', opacity: 0.7 }}>
                    {item.name}
                  </span>
                  {item.freshnessPrediction && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                      • {item.freshnessPrediction}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {item.quantity} {item.unit}
                </span>
                <span style={{
                  padding: '4px 12px', borderRadius: '20px',
                  background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444',
                  fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap'
                }}>
                  Expired {Math.abs(item.daysLeft)}d ago
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '1.25rem' }}>
            💡 Go to <strong>Pantry Inventory</strong> tab to remove these items and update your health score.
          </p>
          <button className="btn-secondary" style={{ marginTop: '0.75rem' }} onClick={() => setActiveTab('inventory')}>
            <ClipboardList size={16} /> Go to Inventory
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiStatus, setApiStatus] = useState({ checked: false, configured: false });

  const [pantry, setPantry] = useState(() => {
    const saved = localStorage.getItem('smart_pantry_items');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Failed to parse saved pantry items', e);
      }
    }
    const today = new Date();
    return [
      { id: '1', name: 'Whole Milk', quantity: 1, unit: 'bottle', dateAdded: today.toISOString().split('T')[0], expiryDate: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], freshnessPrediction: 'Fresh (4 days)' },
      { id: '2', name: 'Fresh Eggs', quantity: 12, unit: 'pieces', dateAdded: today.toISOString().split('T')[0], expiryDate: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], freshnessPrediction: 'Sealed box (14 days)' },
      { id: '3', name: 'Broccoli', quantity: 1, unit: 'head', dateAdded: today.toISOString().split('T')[0], expiryDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], freshnessPrediction: 'Slightly yellowing (2 days)' },
      { id: '4', name: 'Cheddar Cheese', quantity: 200, unit: 'grams', dateAdded: today.toISOString().split('T')[0], expiryDate: new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], freshnessPrediction: 'Firm & sealed (8 days)' }
    ];
  });

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setApiStatus({ checked: true, configured: data.apiConfigured || data.openRouterConfigured }))
      .catch(() => setApiStatus({ checked: true, configured: false }));
  }, []);

  useEffect(() => {
    localStorage.setItem('smart_pantry_items', JSON.stringify(pantry));
  }, [pantry]);

  const addItemsToPantry = (newItems) => {
    const today = new Date().toISOString().split('T')[0];
    setPantry(prev => {
      const updated = [...prev];
      newItems.forEach(item => {
        const days = parseInt(item.expiryDays) || 7;
        const expiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const matchIndex = updated.findIndex(p => p.name.toLowerCase() === item.name.toLowerCase());
        if (matchIndex > -1) {
          updated[matchIndex].quantity = Number(item.quantity);
          updated[matchIndex].unit = item.unit || updated[matchIndex].unit;
          updated[matchIndex].expiryDate = expiryDate;
          updated[matchIndex].freshnessPrediction = item.freshnessPrediction || updated[matchIndex].freshnessPrediction;
        } else {
          updated.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            name: item.name, quantity: Number(item.quantity) || 1,
            unit: item.unit || 'pieces', dateAdded: today,
            expiryDate, freshnessPrediction: item.freshnessPrediction || `Fresh (${days} days)`
          });
        }
      });
      return updated;
    });
  };

  const deleteItem = (id) => setPantry(prev => prev.filter(item => item.id !== id));

  const clearPantry = () => {
    if (window.confirm("Are you sure you want to clear all items from your pantry?")) setPantry([]);
  };

  const updateItem = (id, updatedFields) => {
    setPantry(prev => prev.map(item => item.id === id ? { ...item, ...updatedFields } : item));
  };

  const activePantry = pantry.filter(item => item.name && item.name.trim() !== '' && Number(item.quantity) > 0);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard pantry={activePantry} setActiveTab={setActiveTab} />;
      case 'scanner': return <Scanner addItemsToPantry={addItemsToPantry} setActiveTab={setActiveTab} apiConfigured={apiStatus.configured} />;
      case 'inventory': return <Inventory pantry={activePantry} deleteItem={deleteItem} clearPantry={clearPantry} updateItem={updateItem} addItems={addItemsToPantry} />;
      case 'chef': return <SmartChef pantry={activePantry} />;
      case 'priority': return <PriorityList pantry={activePantry} setActiveTab={setActiveTab} />;
      case 'waste': return <WasteLog pantry={activePantry} setActiveTab={setActiveTab} />;
      default: return <Dashboard pantry={activePantry} setActiveTab={setActiveTab} />;
    }
  };

  // Count expired items for badge
  const expiredCount = activePantry.filter(item => {
    const today = new Date(); today.setHours(0,0,0,0);
    const expiry = new Date(item.expiryDate); expiry.setHours(0,0,0,0);
    return expiry < today;
  }).length;

  return (
    <div className="app-container">
      <aside className="sidebar glass">
        <div className="logo-container">
          <span className="logo-icon">🍳</span>
          <div>
            <h1 className="logo-text">GCIS</h1>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '2px', lineHeight: 1.3 }}>Generative Culinary<br/>Intelligence System</p>
          </div>
        </div>

        <nav>
          <ul className="nav-menu">
            <li className="nav-item">
              <button className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
                <LayoutGrid size={20} /> Dashboard
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-btn ${activeTab === 'scanner' ? 'active' : ''}`} onClick={() => setActiveTab('scanner')}>
                <Camera size={20} /> Add Ingredients
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-btn ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>
                <ClipboardList size={20} /> Pantry Inventory
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-btn ${activeTab === 'priority' ? 'active' : ''}`} onClick={() => setActiveTab('priority')}>
                <Flame size={20} /> Priority List
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-btn ${activeTab === 'waste' ? 'active' : ''}`} onClick={() => setActiveTab('waste')} style={{ position: 'relative' }}>
                <Trash2 size={20} /> Waste Log
                {expiredCount > 0 && (
                  <span style={{
                    position: 'absolute', right: '12px',
                    background: '#ef4444', color: '#fff',
                    borderRadius: '10px', fontSize: '0.7rem',
                    fontWeight: 700, padding: '1px 7px', minWidth: '18px',
                    textAlign: 'center'
                  }}>
                    {expiredCount}
                  </span>
                )}
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-btn ${activeTab === 'chef' ? 'active' : ''}`} onClick={() => setActiveTab('chef')}>
                <ChefHat size={20} /> Recipe Builder
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
          <div style={{ marginTop: '10px', fontSize: '0.75rem', opacity: 0.5 }}>Project Version 1.0.0</div>
        </div>
      </aside>

      <main className="main-content">
        {renderTabContent()}
      </main>
    </div>
  );
}

export default App;