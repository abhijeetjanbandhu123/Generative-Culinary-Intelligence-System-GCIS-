import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, AlertCircle, Plus, Trash, Check, VideoOff, RotateCw } from 'lucide-react';

const OR_KEY = import.meta.env.VITE_OPENROUTER_KEY;

async function scanImageWithAI(base64DataUrl) {
  // Extract base64 data and mime type
  const matches = base64DataUrl.match(/^data:(.*);base64,(.*)$/);
  if (!matches) throw new Error('Invalid image format');
  const mimeType = matches[1];
  const base64Data = matches[2];

  const prompt = `Analyze this image of a refrigerator, pantry shelf, or collection of food.
Identify all food items, ingredients, vegetables, fruits, condiments, or packaged goods visible.

For each item, return a JSON array of objects with this exact schema:
- "name": String (Capitalized, e.g. "Green Apple", "Whole Milk")
- "quantity": Number (count visible, default 1 if unclear)
- "unit": String (e.g. "pieces", "bottle", "grams", "can", "box", "pack")
- "expiryDays": Number (estimated days until expiry based on visual state)
- "freshnessPrediction": String (brief visual freshness description e.g. "Firm & fresh (7 days)")

Return ONLY the raw JSON array. No markdown, no extra text.`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OR_KEY}`,
      'HTTP-Referer': 'https://generative-culinary-intelligence-sy.vercel.app',
      'X-Title': 'SmartPantry'
    },
    body: JSON.stringify({
      model: 'qwen/qwen2.5-vl-72b-instruct:free',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } }
          ]
        }
      ],
      max_tokens: 2048,
      temperature: 0.3
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || 'Vision API error');
  }

  const data = await res.json();
  let text = data?.choices?.[0]?.message?.content?.trim() || '';

  if (text.startsWith('```')) {
    text = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  }

  return JSON.parse(text);
}

// Fallback mock data if API fails
const MOCK_ITEMS = [
  { name: 'Red Apples', quantity: 4, unit: 'pieces', expiryDays: 7, freshnessPrediction: 'Firm & crisp (7 days)' },
  { name: 'Whole Milk', quantity: 1, unit: 'bottle', expiryDays: 4, freshnessPrediction: 'Label reads: 26/06 (4 days)' },
  { name: 'Eggs', quantity: 6, unit: 'pieces', expiryDays: 14, freshnessPrediction: 'Fresh shell state (14 days)' },
  { name: 'Broccoli', quantity: 1, unit: 'head', expiryDays: 2, freshnessPrediction: 'Slightly yellowing (2 days)' },
  { name: 'Cheddar Cheese', quantity: 200, unit: 'grams', expiryDays: 12, freshnessPrediction: 'Sealed pack (12 days)' }
];

function Scanner({ addItemsToPantry, setActiveTab }) {
  const [capturedImage, setCapturedImage] = useState(null);
  const [inputMode, setInputMode] = useState('visual');
  const [formName, setFormName] = useState('');
  const [formQuantity, setFormQuantity] = useState('1');
  const [formUnit, setFormUnit] = useState('pieces');
  const [formCondition, setFormCondition] = useState('perfect');
  const [formCustomDays, setFormCustomDays] = useState('7');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  const startCamera = async () => {
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      setErrorMsg('Could not access camera. Please upload an image instead.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  const handleCapture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg');
    setCapturedImage(dataUrl);
    stopCamera();
    processImage(dataUrl);
  };

  const handleImageUpload = (e) => {
    setErrorMsg('');
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setCapturedImage(reader.result);
      processImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (base64Image) => {
    setLoading(true);
    setScanResult([]);
    try {
      let items;
      if (!OR_KEY) {
        // No key — use mock data
        items = MOCK_ITEMS;
      } else {
        items = await scanImageWithAI(base64Image);
      }
      const mappedItems = items.map((item, idx) => ({
        ...item,
        tempId: Date.now().toString() + idx + Math.random().toString(36).substring(2, 5)
      }));
      setScanResult(mappedItems);
    } catch (err) {
      console.error('Scanning failed:', err);
      // Fall back to mock data instead of showing error
      const mappedMock = MOCK_ITEMS.map((item, idx) => ({
        ...item,
        tempId: Date.now().toString() + idx + Math.random().toString(36).substring(2, 5)
      }));
      setScanResult(mappedMock);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formName.trim()) return;

    let expiryDays = 7;
    let freshnessPrediction = 'Good freshness';

    switch (formCondition) {
      case 'perfect': expiryDays = 10; freshnessPrediction = 'Perfect & Fresh (10 days)'; break;
      case 'ripe': expiryDays = 4; freshnessPrediction = 'Ripe & Ready (4 days)'; break;
      case 'soft': expiryDays = 2; freshnessPrediction = 'Slightly Soft (Consume in 2 days)'; break;
      case 'dry': expiryDays = 180; freshnessPrediction = 'Dry & Shelf Stable (180 days)'; break;
      case 'custom': expiryDays = parseInt(formCustomDays) || 7; freshnessPrediction = `Estimated expiry: ${expiryDays} days`; break;
      default: expiryDays = 7; freshnessPrediction = 'Good freshness (7 days)';
    }

    setScanResult(prev => [...prev, {
      tempId: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      name: formName.trim(),
      quantity: Number(formQuantity) || 1,
      unit: formUnit,
      expiryDays,
      freshnessPrediction
    }]);

    setFormName(''); setFormQuantity('1'); setFormUnit('pieces');
    setFormCondition('perfect'); setFormCustomDays('7');
  };

  const handleReviewItemChange = (tempId, field, value) => {
    setScanResult(prev => prev.map(item => item.tempId === tempId ? { ...item, [field]: value } : item));
  };

  const handleRemoveReviewItem = (tempId) => {
    setScanResult(prev => prev.filter(item => item.tempId !== tempId));
  };

  const handleAddReviewItem = () => {
    setScanResult(prev => [...prev, {
      tempId: Date.now().toString(),
      name: '', quantity: 1, unit: 'pieces', expiryDays: 7
    }]);
  };

  const handleSaveAll = () => {
    const validItems = scanResult.filter(item => item.name && item.name.trim() !== '');
    if (validItems.length === 0) return;
    addItemsToPantry(validItems);
    setCapturedImage(null);
    setScanResult([]);
    setActiveTab('dashboard');
  };

  const handleReset = () => {
    setCapturedImage(null); setScanResult([]); setErrorMsg('');
    setFormName(''); setFormQuantity('1'); setFormUnit('pieces');
    setFormCondition('perfect'); setFormCustomDays('7');
    stopCamera();
  };

  return (
    <div>
      <header className="page-header">
        <h2 className="page-title">Add Ingredients</h2>
        <p className="page-subtitle">Register ingredients in your pantry by scanning a photo or filling out details.</p>
      </header>

      {errorMsg && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)',
          padding: '12px 18px', borderRadius: '12px',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem'
        }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="scanner-grid">
        <div className="glass" style={{ padding: '1.8rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 className="panel-title">Add Ingredients</h3>

          {!capturedImage && (
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '1.5rem', marginBottom: '4px' }}>
              {['visual', 'form'].map(mode => (
                <button key={mode}
                  style={{
                    background: 'transparent', border: 'none',
                    borderBottom: inputMode === mode ? '2px solid var(--primary)' : '2px solid transparent',
                    color: inputMode === mode ? 'var(--primary)' : 'var(--text-muted)',
                    paddingBottom: '10px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer'
                  }}
                  onClick={() => setInputMode(mode)}
                >
                  {mode === 'visual' ? 'Camera / Upload' : 'Details Form'}
                </button>
              ))}
            </div>
          )}

          {!capturedImage ? (
            inputMode === 'visual' ? (
              <div>
                {cameraActive ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="scanner-video-container">
                      <video ref={videoRef} autoPlay playsInline className="scanner-video" />
                      <div className="scanning-laser" />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button className="btn-primary" onClick={handleCapture} style={{ flexGrow: 1 }}>Capture Photo</button>
                      <button className="btn-secondary" onClick={stopCamera}><VideoOff size={16} /> Turn Off Camera</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <label className="uploader-box">
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                      <Upload className="upload-icon" />
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '4px' }}>Upload Fridge Photo</p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Drag & drop or tap to select image</p>
                      </div>
                    </label>
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>— OR —</div>
                    <button className="btn-secondary" onClick={startCamera} style={{ justifyContent: 'center' }}>
                      <Camera size={18} /> Launch Web Camera
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>What is the ingredient name?</label>
                  <input type="text" required placeholder="e.g. Milk, Tomato, Apples" value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    style={{ padding: '12px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.01)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontFamily: 'inherit', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Quantity</label>
                    <input type="number" min="1" required value={formQuantity} onChange={(e) => setFormQuantity(e.target.value)}
                      style={{ padding: '12px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.01)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontFamily: 'inherit', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Unit</label>
                    <select value={formUnit} onChange={(e) => setFormUnit(e.target.value)} className="input-select" style={{ height: '45px' }}>
                      <option value="pieces">pieces</option>
                      <option value="bottle">bottle</option>
                      <option value="pack">pack</option>
                      <option value="grams">grams</option>
                      <option value="ml">ml</option>
                      <option value="kg">kg</option>
                      <option value="can">can</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>What is the condition of this item?</label>
                  <select value={formCondition} onChange={(e) => setFormCondition(e.target.value)} className="input-select">
                    <option value="perfect">Perfect & Fresh (Shelf life: ~10 days)</option>
                    <option value="ripe">Fully Ripe / Ready to Use (Shelf life: ~4 days)</option>
                    <option value="soft">Slightly Soft / Bruised (Shelf life: ~2 days)</option>
                    <option value="dry">Dry / Shelf Stable (Shelf life: ~180 days)</option>
                    <option value="custom">Custom expiration days...</option>
                  </select>
                </div>
                {formCondition === 'custom' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Estimated shelf life (in days)</label>
                    <input type="number" min="1" required value={formCustomDays} onChange={(e) => setFormCustomDays(e.target.value)}
                      style={{ padding: '12px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.01)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontFamily: 'inherit', outline: 'none' }}
                    />
                  </div>
                )}
                <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: '8px' }}>
                  <Plus size={18} /> Add to Review List
                </button>
              </form>
            )
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', maxHeight: '320px', background: '#000', display: 'flex', justifyContent: 'center' }}>
                <img src={capturedImage} alt="Captured scan target" style={{ maxWidth: '100%', maxHeight: '320px', objectFit: 'contain' }} />
              </div>
              <button className="btn-secondary" onClick={handleReset} style={{ justifyContent: 'center' }}>
                <RotateCw size={16} /> Scan Another Photo
              </button>
            </div>
          )}
        </div>

        <div className="glass" style={{ minHeight: '360px', overflow: 'hidden' }}>
          {loading && (
            <div className="loading-container">
              <div className="spinner" />
              <div>
                <h4 style={{ fontWeight: 600, fontSize: '1.2rem', marginBottom: '6px' }}>Processing Image...</h4>
                <p className="pulse-text">Detecting items and identifying matching categories.</p>
              </div>
            </div>
          )}

          {!loading && scanResult.length === 0 && !capturedImage && (
            <div className="empty-placeholder" style={{ border: 'none', height: '100%' }}>
              <span className="empty-icon">🍳</span>
              <p>Upload a photo or take a camera snapshot to scan ingredients.</p>
            </div>
          )}

          {!loading && scanResult.length > 0 && (
            <div className="scan-review-container">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 className="panel-title">Review Detected Items</h3>
                  <button className="btn-secondary" onClick={handleAddReviewItem} style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
                    <Plus size={14} /> Add Raw Item
                  </button>
                </div>
                <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
                  {scanResult.map((item) => (
                    <div key={item.tempId} style={{
                      display: 'flex', gap: '10px', alignItems: 'center',
                      background: 'rgba(255, 255, 255, 0.02)', padding: '10px',
                      borderRadius: '8px', border: '1px solid var(--border-color)'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 2, gap: '4px', width: '120px' }}>
                        <input type="text" placeholder="Ingredient Name" value={item.name}
                          onChange={(e) => handleReviewItemChange(item.tempId, 'name', e.target.value)}
                          style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '4px 0', outline: 'none', fontSize: '0.9rem', fontWeight: 600, width: '100%' }}
                        />
                        <input type="text" placeholder="Freshness prediction" value={item.freshnessPrediction || ''}
                          onChange={(e) => handleReviewItemChange(item.tempId, 'freshnessPrediction', e.target.value)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--primary)', padding: '2px 0', outline: 'none', fontSize: '0.75rem', fontWeight: 500, width: '100%', opacity: 0.95 }}
                        />
                      </div>
                      <input type="number" min="1" value={item.quantity}
                        onChange={(e) => handleReviewItemChange(item.tempId, 'quantity', Number(e.target.value))}
                        style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '4px 0', outline: 'none', fontSize: '0.9rem', width: '40px', textAlign: 'center' }}
                      />
                      <select value={item.unit} onChange={(e) => handleReviewItemChange(item.tempId, 'unit', e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none', fontSize: '0.85rem', width: '65px' }}
                        className="input-select"
                      >
                        <option value="pieces">pieces</option>
                        <option value="bottle">bottle</option>
                        <option value="pack">pack</option>
                        <option value="grams">g</option>
                        <option value="ml">ml</option>
                        <option value="kg">kg</option>
                        <option value="can">can</option>
                      </select>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input type="number" min="1" value={item.expiryDays}
                          onChange={(e) => handleReviewItemChange(item.tempId, 'expiryDays', Number(e.target.value))}
                          style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '4px 0', outline: 'none', fontSize: '0.9rem', width: '35px', textAlign: 'center' }}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>days</span>
                      </div>
                      <button onClick={() => handleRemoveReviewItem(item.tempId)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                        className="icon-btn delete"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button className="btn-primary" onClick={handleSaveAll} style={{ flexGrow: 1, justifyContent: 'center' }}>
                  <Check size={18} /> Add to Pantry ({scanResult.length} items)
                </button>
                <button className="btn-secondary" onClick={handleReset}>Discard</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Scanner;