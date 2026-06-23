import React from 'react';
import { ShoppingBag, CalendarClock, Skull, HeartPulse, Sparkles, ArrowRight, Camera, Trash2, AlertTriangle, Flame } from 'lucide-react';

function Dashboard({ pantry, setActiveTab }) {
  const calculateDaysLeft = (expiryDateStr) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const expiry = new Date(expiryDateStr);
    expiry.setHours(0,0,0,0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const totalItems = pantry.reduce((sum, item) => sum + Number(item.quantity), 0);
  const totalUniqueItems = pantry.length;

  const expiringSoonItems = pantry.filter(item => {
    const daysLeft = calculateDaysLeft(item.expiryDate);
    return daysLeft >= 0 && daysLeft <= 3;
  });

  const expiredItems = pantry.filter(item => {
    const daysLeft = calculateDaysLeft(item.expiryDate);
    return daysLeft < 0;
  });

  let healthScore = 0;
  if (totalUniqueItems > 0) {
    const freshItems = pantry.filter(item => {
      const d = calculateDaysLeft(item.expiryDate);
      return d > 3;
    }).length;
    healthScore = Math.round((freshItems / totalUniqueItems) * 100);
  }

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (healthScore / 100) * circumference;

  const sortedExpiringList = [...pantry]
    .map(item => ({ ...item, daysLeft: calculateDaysLeft(item.expiryDate) }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  const priorityList = [...pantry]
    .map(item => ({ ...item, daysLeft: calculateDaysLeft(item.expiryDate) }))
    .filter(item => item.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const wasteList = [...pantry]
    .map(item => ({ ...item, daysLeft: calculateDaysLeft(item.expiryDate) }))
    .filter(item => item.daysLeft < 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const getPriorityColor = (daysLeft) => {
    if (daysLeft <= 1) return '#ef4444';
    if (daysLeft <= 3) return '#f97316';
    if (daysLeft <= 7) return '#eab308';
    return '#10b981';
  };

  const getPriorityLabel = (daysLeft) => {
    if (daysLeft === 0) return 'Use Today!';
    if (daysLeft === 1) return 'Use Tomorrow';
    return `${daysLeft} days left`;
  };

  return (
    <div>
      <header className="page-header">
        <h2 className="page-title">Welcome to Generative Culinary Intelligence System</h2>
        <p className="page-subtitle">Here is a summary of your food inventory and kitchen health status.</p>
      </header>

      {/* Summary Statistics Grid */}
      <section className="stats-grid">
        <div className="stat-card glass">
          <div className="stat-icon"><ShoppingBag size={24} /></div>
          <div className="stat-info">
            <span className="stat-value">{totalItems}</span>
            <span className="stat-label">Total Ingredients ({totalUniqueItems} types)</span>
          </div>
        </div>
        <div className="stat-card glass">
          <div className="stat-icon"><CalendarClock size={24} /></div>
          <div className="stat-info">
            <span className="stat-value">{expiringSoonItems.length}</span>
            <span className="stat-label">Expiring in 3 Days</span>
          </div>
        </div>
        <div className="stat-card glass">
          <div className="stat-icon"><Skull size={24} /></div>
          <div className="stat-info">
            <span className="stat-value">{expiredItems.length}</span>
            <span className="stat-label">Expired Items</span>
          </div>
        </div>
        <div className="stat-card glass">
          <div className="stat-icon"><HeartPulse size={24} /></div>
          <div className="stat-info">
            <span className="stat-value">{healthScore}%</span>
            <span className="stat-label">Pantry Health Score</span>
          </div>
        </div>
      </section>

      {/* Main Dashboard Layout */}
      <div className="dashboard-grid">
        {/* Left Panel */}
        <div className="dashboard-panel glass">

          {/* Section 1: Expiry Warnings */}
          <div className="panel-header">
            <h3 className="panel-title">Expiry Warnings & Shelf Tracking</h3>
            <button className="btn-secondary" onClick={() => setActiveTab('inventory')}>
              View All <ArrowRight size={16} />
            </button>
          </div>

          <div className="expiring-list">
            {pantry.length === 0 ? (
              <div className="empty-placeholder">
                <span className="empty-icon">🥗</span>
                <p>Your pantry is empty. Use the Visual Scanner to add ingredients!</p>
              </div>
            ) : (
              sortedExpiringList.map(item => {
                let badgeClass = 'warning';
                let labelText = `${item.daysLeft} days left`;
                if (item.daysLeft < 0) { badgeClass = 'critical'; labelText = 'Expired'; }
                else if (item.daysLeft === 0) { badgeClass = 'critical'; labelText = 'Expires Today'; }
                else if (item.daysLeft === 1) { badgeClass = 'critical'; labelText = 'Expires Tomorrow'; }

                return (
                  <div key={item.id} className="expiring-item">
                    <div className="item-details">
                      <span className="item-name">{item.name}</span>
                      <span className="item-qty" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span>Qty: {item.quantity} {item.unit}</span>
                        {item.freshnessPrediction && (
                          <span style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600 }}>
                            • 🌱 {item.freshnessPrediction}
                          </span>
                        )}
                      </span>
                    </div>
                    <span className={`expiry-days-indicator ${badgeClass}`}>{labelText}</span>
                  </div>
                );
              })
            )}
          </div>

          {/* Section 2: Chef's Priority List */}
          {priorityList.length > 0 && (
            <div style={{ marginTop: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <Flame size={17} color="#f97316" />
                <h4 style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>Chef's Priority List — Use These First</h4>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                Sorted by freshness — cook items at the top before they expire.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {priorityList.map((item, idx) => {
                  const color = getPriorityColor(item.daysLeft);
                  const label = getPriorityLabel(item.daysLeft);
                  return (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '9px 12px', borderRadius: '8px',
                      background: 'rgba(255,255,255,0.02)',
                      border: `1px solid ${color}33`
                    }}>
                      <span style={{
                        minWidth: '24px', height: '24px', borderRadius: '50%',
                        background: color + '22', color: color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 700
                      }}>
                        {idx + 1}
                      </span>
                      <div style={{ flexGrow: 1 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{item.name}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                      <span style={{
                        padding: '3px 10px', borderRadius: '20px',
                        background: color + '22', color: color,
                        fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap'
                      }}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <button className="btn-secondary" style={{ marginTop: '0.85rem', width: '100%', justifyContent: 'center', fontSize: '0.85rem' }} onClick={() => setActiveTab('chef')}>
                <Sparkles size={14} /> Generate Recipes From These
              </button>
            </div>
          )}

          {/* Section 3: Food Waste Log */}
          {wasteList.length > 0 && (
            <div style={{ marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                <Trash2 size={17} color="#ef4444" />
                <h4 style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem', color: '#ef4444' }}>Food Waste Log — Expired</h4>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                These items are past their expiry date and should be discarded.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {wasteList.map(item => (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '9px 12px', borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.04)',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                  }}>
                    <AlertTriangle size={14} color="#ef4444" style={{ minWidth: '14px' }} />
                    <div style={{ flexGrow: 1 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem', textDecoration: 'line-through', opacity: 0.7 }}>
                        {item.name}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                    <span style={{
                      padding: '3px 10px', borderRadius: '20px',
                      background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444',
                      fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap'
                    }}>
                      {Math.abs(item.daysLeft)}d ago
                    </span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                💡 Go to <strong>Inventory</strong> tab to remove these items.
              </p>
            </div>
          )}

          {/* Ready to Cook Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.1))',
            borderRadius: '12px', padding: '1.25rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            border: '1px solid rgba(59, 130, 246, 0.15)', marginTop: '1.75rem'
          }}>
            <div>
              <h4 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Sparkles size={16} color="#8B5CF6" /> Ready to Cook?
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Let our Recipe Builder suggest custom meals using the ingredients you already have in stock.
              </p>
            </div>
            <button className="btn-primary" onClick={() => setActiveTab('chef')}>Suggest Meals</button>
          </div>
        </div>

        {/* Right Panel: Health Gauge */}
        <div className="health-gauge-card glass">
          <h3 className="panel-title">Freshness Level</h3>
          <div className="gauge-container">
            <svg className="gauge-svg">
              <defs>
                <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
              <circle className="gauge-bg" cx="80" cy="80" r={radius} />
              <circle className="gauge-fill" cx="80" cy="80" r={radius} strokeDashoffset={strokeDashoffset} />
            </svg>
            <span className="gauge-value">{healthScore}%</span>
          </div>

          <h4 className="health-message">
            {healthScore >= 80 ? 'Excellent Pantry Health!' :
             healthScore >= 50 ? 'Looking Decent!' :
             healthScore > 0 ? 'Needs Attention!' : 'Empty Pantry!'}
          </h4>
          <p className="health-desc">
            {healthScore >= 80 ? 'Your items are fresh and properly balanced. Minimal food waste predicted!' :
             healthScore >= 50 ? 'Some ingredients are reaching their expiration limits. Consider cooking them soon!' :
             healthScore > 0 ? 'Multiple items have expired or are expiring. Scan items and cook to save waste.' :
             'Scan your food packages or upload a photo of your fridge to calculate your freshness score.'}
          </p>

          <button className="btn-primary" style={{ marginTop: '1.5rem', width: '100%' }} onClick={() => setActiveTab('scanner')}>
            <Camera size={18} style={{ marginRight: '8px' }} /> Upload/Scan Photo
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;