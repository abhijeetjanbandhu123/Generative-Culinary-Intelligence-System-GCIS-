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

  // Priority list: non-expired items sorted by soonest expiry (use-first)
  const priorityList = [...pantry]
    .map(item => ({ ...item, daysLeft: calculateDaysLeft(item.expiryDate) }))
    .filter(item => item.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // Waste list: expired items only
  const wasteList = [...pantry]
    .map(item => ({ ...item, daysLeft: calculateDaysLeft(item.expiryDate) }))
    .filter(item => item.daysLeft < 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const getPriorityColor = (daysLeft) => {
    if (daysLeft === 0) return '#ef4444';
    if (daysLeft <= 1) return '#ef4444';
    if (daysLeft <= 3) return '#f97316';
    if (daysLeft <= 7) return '#eab308';
    return '#10b981';
  };

  const getPriorityLabel = (daysLeft) => {
    if (daysLeft === 0) return 'Use Today!';
    if (daysLeft === 1) return 'Use Tomorrow';
    if (daysLeft <= 3) return `${daysLeft} days left`;
    if (daysLeft <= 7) return `${daysLeft} days left`;
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
        {/* Left Panel: Expiration Alerts & Quick Actions */}
        <div className="dashboard-panel glass">
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

          <div style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.1))',
            borderRadius: '12px', padding: '1.25rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            border: '1px solid rgba(59, 130, 246, 0.15)', marginTop: 'auto'
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

      {/* ------------------------------------------------------------------ */}
      {/* NEW SECTION 1: Chef's Priority Use List                             */}
      {/* ------------------------------------------------------------------ */}
      {priorityList.length > 0 && (
        <div className="glass" style={{ marginTop: '2rem', padding: '1.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
            <Flame size={20} color="#f97316" />
            <h3 className="panel-title" style={{ margin: 0 }}>Chef's Priority List — Use These First</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Ingredients sorted by freshness — cook the ones at the top before they go to waste.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {priorityList.map((item, idx) => {
              const color = getPriorityColor(item.daysLeft);
              const label = getPriorityLabel(item.daysLeft);
              return (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '12px 16px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${color}33`
                }}>
                  {/* Rank number */}
                  <span style={{
                    minWidth: '28px', height: '28px', borderRadius: '50%',
                    background: color + '22', color: color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', fontWeight: 700
                  }}>
                    {idx + 1}
                  </span>

                  {/* Item details */}
                  <div style={{ flexGrow: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.name}</span>
                    {item.freshnessPrediction && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                        • {item.freshnessPrediction}
                      </span>
                    )}
                  </div>

                  {/* Qty */}
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {item.quantity} {item.unit}
                  </span>

                  {/* Urgency badge */}
                  <span style={{
                    padding: '4px 12px', borderRadius: '20px',
                    background: color + '22', color: color,
                    fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap'
                  }}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          <button className="btn-primary" style={{ marginTop: '1.25rem' }} onClick={() => setActiveTab('chef')}>
            <Sparkles size={16} /> Generate Recipes From These
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* NEW SECTION 2: Waste / Expired Food Log                             */}
      {/* ------------------------------------------------------------------ */}
      {wasteList.length > 0 && (
        <div className="glass" style={{ marginTop: '1.5rem', padding: '1.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
            <Trash2 size={20} color="#ef4444" />
            <h3 className="panel-title" style={{ margin: 0, color: '#ef4444' }}>Food Waste Log — Expired Items</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            These items have passed their expiry date and should be discarded. Remove them from your pantry to keep your health score accurate.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {wasteList.map(item => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '12px 16px', borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.04)',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                <AlertTriangle size={16} color="#ef4444" style={{ minWidth: '16px' }} />

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
                  Expired {Math.abs(item.daysLeft)} day{Math.abs(item.daysLeft) !== 1 ? 's' : ''} ago
                </span>
              </div>
            ))}
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
            💡 Go to <strong>Inventory</strong> tab to remove these items and update your pantry health score.
          </p>
        </div>
      )}
    </div>
  );
}

export default Dashboard;