import React from 'react';
import { ShoppingBag, CalendarClock, Skull, HeartPulse, Sparkles, ArrowRight, Camera } from 'lucide-react';

function Dashboard({ pantry, setActiveTab }) {
  const calculateDaysLeft = (expiryDateStr) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const expiry = new Date(expiryDateStr);
    expiry.setHours(0,0,0,0);
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const totalItems = pantry.reduce((sum, item) => sum + Number(item.quantity), 0);
  const totalUniqueItems = pantry.length;

  const expiringSoonItems = pantry.filter(item => {
    const d = calculateDaysLeft(item.expiryDate);
    return d >= 0 && d <= 3;
  });

  const expiredItems = pantry.filter(item => calculateDaysLeft(item.expiryDate) < 0);

  let healthScore = 100;
  if (totalUniqueItems > 0) {
    healthScore = Math.max(0, 100 - (expiredItems.length * 25) - (expiringSoonItems.length * 10));
  } else {
    healthScore = 0;
  }

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (healthScore / 100) * circumference;

  const sortedExpiringList = [...pantry]
    .map(item => ({ ...item, daysLeft: calculateDaysLeft(item.expiryDate) }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 6);

  const healthColor = healthScore >= 80 ? '#6FCF97' : healthScore >= 50 ? '#F2C94C' : '#EB5757';

  return (
    <div>
      <header className="page-header">
        <h2 className="page-title">Kitchen Overview</h2>
        <p className="page-subtitle">Your live pantry status and freshness summary.</p>
      </header>

      {/* Stats */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><ShoppingBag size={22} /></div>
          <div className="stat-info">
            <span className="stat-value">{totalItems}</span>
            <span className="stat-label">Total Ingredients · {totalUniqueItems} types</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><CalendarClock size={22} /></div>
          <div className="stat-info">
            <span className="stat-value">{expiringSoonItems.length}</span>
            <span className="stat-label">Expiring within 3 days</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Skull size={22} /></div>
          <div className="stat-info">
            <span className="stat-value">{expiredItems.length}</span>
            <span className="stat-label">Expired Items</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><HeartPulse size={22} /></div>
          <div className="stat-info">
            <span className="stat-value">{healthScore}%</span>
            <span className="stat-label">Pantry Health Score</span>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <div className="dashboard-grid">

        {/* Left — Expiry Panel */}
        <div className="dashboard-panel glass">
          <div className="panel-header">
            <h3 className="panel-title">Shelf Tracking & Expiry Alerts</h3>
            <button className="btn-secondary" onClick={() => setActiveTab('inventory')} style={{ fontSize: '0.82rem', padding: '7px 14px' }}>
              View All <ArrowRight size={14} />
            </button>
          </div>

          <div className="expiring-list">
            {pantry.length === 0 ? (
              <div className="empty-placeholder">
                <span className="empty-icon">🥗</span>
                <p>Your pantry is empty. Scan a photo to get started.</p>
              </div>
            ) : (
              sortedExpiringList.map(item => {
                let badgeClass = 'warning';
                let labelText = `${item.daysLeft}d left`;
                if (item.daysLeft < 0) { badgeClass = 'critical'; labelText = 'Expired'; }
                else if (item.daysLeft === 0) { badgeClass = 'critical'; labelText = 'Expires Today'; }
                else if (item.daysLeft === 1) { badgeClass = 'critical'; labelText = 'Tomorrow'; }

                return (
                  <div key={item.id} className="expiring-item">
                    <div className="item-details">
                      <span className="item-name">{item.name}</span>
                      <span className="item-qty">
                        {item.quantity} {item.unit}
                        {item.freshnessPrediction && (
                          <span style={{ color: 'var(--sage)', marginLeft: 6, fontSize: '0.75rem' }}>
                            · {item.freshnessPrediction}
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

          {/* CTA Banner */}
          <div style={{
            background: 'linear-gradient(135deg, var(--navy), var(--navy-mid))',
            borderRadius: 'var(--r-md)',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginTop: 'auto',
            flexWrap: 'wrap'
          }}>
            <div>
              <h4 style={{ fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: '0.95rem' }}>
                <Sparkles size={15} color="var(--amber)" /> Ready to Cook?
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
                Generate recipes from ingredients you already have.
              </p>
            </div>
            <button className="btn-primary" onClick={() => setActiveTab('chef')}>
              Suggest Meals
            </button>
          </div>
        </div>

        {/* Right — Gauge */}
        <div className="health-gauge-card">
          <h3 className="panel-title">Freshness Score</h3>

          <div className="gauge-container">
            <svg className="gauge-svg" viewBox="0 0 160 160">
              <defs>
                <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={healthColor} />
                  <stop offset="100%" stopColor={healthColor} stopOpacity="0.6" />
                </linearGradient>
              </defs>
              <circle className="gauge-bg" cx="80" cy="80" r={radius} />
              <circle className="gauge-fill" cx="80" cy="80" r={radius} strokeDashoffset={strokeDashoffset} />
            </svg>
            <span className="gauge-value">{healthScore}</span>
          </div>

          <h4 className="health-message">
            {healthScore >= 80 ? 'Excellent!' : healthScore >= 50 ? 'Looking OK' : healthScore > 0 ? 'Needs Attention' : 'Empty Pantry'}
          </h4>
          <p className="health-desc" style={{ marginBottom: '1.5rem' }}>
            {healthScore >= 80 ? 'Your pantry is fresh and well balanced.' :
             healthScore >= 50 ? 'Some items are approaching expiry. Cook them soon!' :
             healthScore > 0 ? 'Multiple items expired or expiring. Take action now.' :
             'Add items by scanning your fridge photo.'}
          </p>

          <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setActiveTab('scanner')}>
            <Camera size={16} /> Scan Photo
          </button>

          {/* Mini legend */}
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem', width: '100%' }}>
            {[
              { label: 'Fresh items', value: pantry.length - expiringSoonItems.length - expiredItems.length, color: '#6FCF97' },
              { label: 'Expiring soon', value: expiringSoonItems.length, color: '#F2C94C' },
              { label: 'Expired', value: expiredItems.length, color: '#EB5757' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', fontSize: '0.8rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: row.color, display: 'inline-block' }} />
                  {row.label}
                </span>
                <span style={{ color: row.color, fontWeight: 700 }}>{Math.max(0, row.value)}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;