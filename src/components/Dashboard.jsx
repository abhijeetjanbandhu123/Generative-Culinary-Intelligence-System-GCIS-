import React from 'react';
import { ShoppingBag, CalendarClock, Skull, HeartPulse, Sparkles, ArrowRight, Camera } from 'lucide-react';

function Dashboard({ pantry, setActiveTab }) {
  // Helper: calculate days remaining from today
  const calculateDaysLeft = (expiryDateStr) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const expiry = new Date(expiryDateStr);
    expiry.setHours(0,0,0,0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Inventory analysis computations
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

  // Calculate Pantry Health Score
  // Expired items deduct 25 points each, expiring-soon items deduct 10 points. Maximum 100, minimum 0.
  let healthScore = 0;
if (totalUniqueItems > 0) {
  const freshItems = pantry.filter(item => {
    const d = calculateDaysLeft(item.expiryDate);
    return d > 3;
  }).length;
  healthScore = Math.round((freshItems / totalUniqueItems) * 100);
}

  // Radial Gauge Calculations
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (healthScore / 100) * circumference;

  // Sorting expiring soonest first
  const sortedExpiringList = [...pantry]
    .map(item => ({ ...item, daysLeft: calculateDaysLeft(item.expiryDate) }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5); // top 5 soonest to expire

  return (
    <div>
      <header className="page-header">
        <h2 className="page-title">Welcome to Generative Culinary Intelligence System</h2>
        <p className="page-subtitle">Here is a summary of your food inventory and kitchen health status.</p>
      </header>

      {/* Summary Statistics Grid */}
      <section className="stats-grid">
        <div className="stat-card glass">
          <div className="stat-icon">
            <ShoppingBag size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalItems}</span>
            <span className="stat-label">Total Ingredients ({totalUniqueItems} types)</span>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon">
            <CalendarClock size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{expiringSoonItems.length}</span>
            <span className="stat-label">Expiring in 3 Days</span>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon">
            <Skull size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{expiredItems.length}</span>
            <span className="stat-label">Expired Items</span>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon">
            <HeartPulse size={24} />
          </div>
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
                
                if (item.daysLeft < 0) {
                  badgeClass = 'critical';
                  labelText = 'Expired';
                } else if (item.daysLeft === 0) {
                  badgeClass = 'critical';
                  labelText = 'Expires Today';
                } else if (item.daysLeft === 1) {
                  badgeClass = 'critical';
                  labelText = 'Expires Tomorrow';
                }

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
                    <span className={`expiry-days-indicator ${badgeClass}`}>
                      {labelText}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Actions Footer Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.1))',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid rgba(59, 130, 246, 0.15)',
            marginTop: 'auto'
          }}>
            <div>
              <h4 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Sparkles size={16} color="#8B5CF6" /> Ready to Cook?
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Let our Recipe Builder suggest custom meals using the ingredients you already have in stock.
              </p>
            </div>
            <button className="btn-primary" onClick={() => setActiveTab('chef')}>
              Suggest Meals
            </button>
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
              <circle 
                className="gauge-fill" 
                cx="80" 
                cy="80" 
                r={radius} 
                strokeDashoffset={strokeDashoffset} 
              />
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

          <button 
            className="btn-primary" 
            style={{ marginTop: '1.5rem', width: '100%' }}
            onClick={() => setActiveTab('scanner')}
          >
            <Camera size={18} style={{ marginRight: '8px' }} /> Upload/Scan Photo
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
