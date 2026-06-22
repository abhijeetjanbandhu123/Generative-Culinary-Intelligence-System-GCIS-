import React, { useState } from 'react';
import { Search, Plus, Minus, Trash2, Calendar, Check, RotateCcw } from 'lucide-react';

function Inventory({ pantry, deleteItem, clearPantry, updateItem, addItems }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, fresh, warning, expired
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states for manual quick-add
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('pieces');
  const [expiryDays, setExpiryDays] = useState('7');

  // Helper: calculate days remaining from today
  const calculateDaysLeft = (expiryDateStr) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const expiry = new Date(expiryDateStr);
    expiry.setHours(0,0,0,0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Form submit handler
  const handleQuickAdd = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    addItems([{
      name: name.trim(),
      quantity: Number(quantity) || 1,
      unit: unit,
      expiryDays: Number(expiryDays) || 7
    }]);

    // Reset inputs
    setName('');
    setQuantity('1');
    setUnit('pieces');
    setExpiryDays('7');
    setShowAddForm(false);
  };

  // Inline adjustment buttons for quantity
  const handleQuantityAdjust = (item, amount) => {
    const newQty = Number(item.quantity) + amount;
    if (newQty <= 0) {
      deleteItem(item.id);
    } else {
      updateItem(item.id, { quantity: newQty });
    }
  };

  // Filtering inventory lists
  const filteredPantry = pantry.filter(item => {
    const daysLeft = calculateDaysLeft(item.expiryDate);
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    if (filterType === 'all') return true;
    if (filterType === 'expired') return daysLeft < 0;
    if (filterType === 'warning') return daysLeft >= 0 && daysLeft <= 3;
    if (filterType === 'fresh') return daysLeft > 3;
    return true;
  });

  return (
    <div>
      <header className="page-header">
        <h2 className="page-title">Pantry Inventory</h2>
        <p className="page-subtitle">Inspect, edit, adjust, and manually insert items inside your inventory.</p>
      </header>

      {/* Toolbar controls */}
      <section className="inventory-actions">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search ingredients..." 
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select 
          className="input-select"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">Show All Items</option>
          <option value="fresh">Fresh (&gt; 3 Days)</option>
          <option value="warning">Expiring Soon (0 - 3 Days)</option>
          <option value="expired">Expired</option>
        </select>

        <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={18} /> {showAddForm ? 'Close Add Form' : 'Add Item'}
        </button>

        {pantry.length > 0 && (
          <button 
            className="btn-secondary" 
            onClick={clearPantry}
            style={{ 
              color: 'var(--danger)', 
              borderColor: 'rgba(239, 68, 68, 0.2)', 
              background: 'rgba(239, 68, 68, 0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Trash2 size={16} /> Clear Pantry
          </button>
        )}
      </section>

      {/* Quick Add Form Drawer */}
      {showAddForm && (
        <form onSubmit={handleQuickAdd} className="quick-add-form glass">
          <div className="form-group">
            <label>Item Name</label>
            <input 
              type="text" 
              placeholder="e.g., Apple, Milk, Butter" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Quantity</label>
            <input 
              type="number" 
              min="1" 
              required 
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Unit</label>
            <select 
              className="input-select"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              <option value="pieces">pieces</option>
              <option value="bottle">bottle</option>
              <option value="pack">pack</option>
              <option value="grams">grams</option>
              <option value="ml">ml</option>
              <option value="kg">kg</option>
              <option value="can">can</option>
            </select>
          </div>
          <div className="form-group">
            <label>Shelf Life (Days)</label>
            <input 
              type="number" 
              min="1" 
              required
              value={expiryDays}
              onChange={(e) => setExpiryDays(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary">
            <Check size={18} /> Save Item
          </button>
        </form>
      )}

      {/* Main Inventory Display Grid/Table */}
      <section className="glass" style={{ overflow: 'hidden' }}>
        {filteredPantry.length === 0 ? (
          <div className="empty-placeholder" style={{ border: 'none' }}>
            <span className="empty-icon">📂</span>
            <p>No ingredients found matching your search options.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Quantity</th>
                  <th>Expiration Date</th>
                  <th>Freshness Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPantry.map((item) => {
                  const daysLeft = calculateDaysLeft(item.expiryDate);
                  let statusText = 'Good';
                  let statusClass = 'green';
                  
                  if (daysLeft < 0) {
                    statusText = 'Expired';
                    statusClass = 'red';
                  } else if (daysLeft <= 3) {
                    statusText = `Expires in ${daysLeft} days`;
                    statusClass = 'red'; // Wait, let's use red or red-like styling for warnings
                  }

                  return (
                    <tr key={item.id} className="table-row">
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600 }}>{item.name}</span>
                          {item.freshnessPrediction && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '2px', fontWeight: 500 }}>
                              🌱 {item.freshnessPrediction}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button 
                            className="icon-btn" 
                            onClick={() => handleQuantityAdjust(item, -1)}
                          >
                            <Minus size={14} />
                          </button>
                          <span style={{ minWidth: '30px', textAlign: 'center' }}>
                            {item.quantity} {item.unit}
                          </span>
                          <button 
                            className="icon-btn" 
                            onClick={() => handleQuantityAdjust(item, 1)}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                          <Calendar size={14} />
                          <span>{item.expiryDate}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${daysLeft < 0 ? 'red' : daysLeft <= 3 ? 'purple' : 'green'}`}>
                          {daysLeft < 0 ? 'Expired' : daysLeft === 0 ? 'Expires today' : daysLeft <= 3 ? `${daysLeft} days left` : 'Fresh'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="action-btn-group" style={{ justifyContent: 'flex-end' }}>
                          <button 
                            className="icon-btn delete" 
                            onClick={() => deleteItem(item.id)}
                            title="Delete Item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default Inventory;
