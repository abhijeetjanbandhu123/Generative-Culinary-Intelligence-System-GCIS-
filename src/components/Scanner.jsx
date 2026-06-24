import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, AlertCircle, Plus, Trash, Check, VideoOff, RotateCw, FlipHorizontal } from 'lucide-react';

function Scanner({ addItemsToPantry, setActiveTab, apiConfigured }) {
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
  const [facingMode, setFacingMode] = useState('environment'); // front or back camera
  const [isMirrored, setIsMirrored] = useState(false); // manual mirror toggle

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  const startCamera = async (facing = facingMode) => {
    setErrorMsg('');
    // Stop any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        // Auto-mirror front camera
        setIsMirrored(facing === 'user');
      }
    } catch (err) {
      console.error('Camera error:', err);
      // Fallback: try without facingMode constraint
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraActive(true);
          setIsMirrored(false);
        }
      } catch (err2) {
        setErrorMsg('Could not access camera. Please check permissions or upload an image instead.');
        setCameraActive(false);
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  const switchCamera = async () => {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacing);
    await startCamera(newFacing);
  };

  const handleCapture = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');

    // Use actual video dimensions for best quality
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');

    // Only mirror the canvas if the feed is mirrored (front camera)
    if (isMirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Use PNG for better quality scanning accuracy
    const dataUrl = canvas.toDataURL('image/png');
    setCapturedImage(dataUrl);
    stopCamera();
    sendToBackend(dataUrl);
  };

  const handleImageUpload = (e) => {
    setErrorMsg('');
    const file = e.target.files[0];
    if (!file) return;

    // Resize large images before sending to avoid payload issues
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1280;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const resized = canvas.toDataURL('image/jpeg', 0.92);
        setCapturedImage(resized);
        sendToBackend(resized);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  // Send to backend /api/scan which uses OpenRouter key server-side
  const sendToBackend = async (base64Image) => {
    setLoading(true);
    setScanResult([]);
    setErrorMsg('');
    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image })
      });

      const data = await response.json();

      if (response.ok && data.items && data.items.length > 0) {
        const mappedItems = data.items.map((item, idx) => ({
          ...item,
          tempId: Date.now().toString() + idx + Math.random().toString(36).substring(2, 5)
        }));
        setScanResult(mappedItems);
      } else {
        throw new Error(data.error || 'No items detected');
      }
    } catch (err) {
      console.error('Scanning failed:', err);
      setErrorMsg(`Scanning failed: ${err.message}. Try uploading a clearer photo with good lighting.`);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formName.trim()) return;

    let expiryDays = 7, freshnessPrediction = 'Good freshness';
    switch (formCondition) {
      case 'perfect': expiryDays = 10; freshnessPrediction = 'Perfect & Fresh (10 days)'; break;
      case 'ripe':    expiryDays = 4;  freshnessPrediction = 'Ripe & Ready (4 days)'; break;
      case 'soft':    expiryDays = 2;  freshnessPrediction = 'Slightly Soft (Consume in 2 days)'; break;
      case 'dry':     expiryDays = 180; freshnessPrediction = 'Dry & Shelf Stable (180 days)'; break;
      case 'custom':  expiryDays = parseInt(formCustomDays) || 7; freshnessPrediction = `Estimated expiry: ${expiryDays} days`; break;
      default:        expiryDays = 7;  freshnessPrediction = 'Good freshness (7 days)';
    }

    setScanResult(prev => [...prev, {
      tempId: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      name: formName.trim(), quantity: Number(formQuantity) || 1,
      unit: formUnit, expiryDays, freshnessPrediction
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
    setScanResult(prev => [...prev, { tempId: Date.now().toString(), name: '', quantity: 1, unit: 'pieces', expiryDays: 7 }]);
  };

  const handleSaveAll = () => {
    const validItems = scanResult.filter(item => item.name && item.name.trim() !== '');
    if (validItems.length === 0) return;
    addItemsToPantry(validItems);
    setCapturedImage(null); setScanResult([]);
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
          background: 'rgba(239,68,68,0.1)', color: 'var(--danger)',
          padding: '12px 18px', borderRadius: '12px',
          border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem'
        }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="scanner-grid">
        {/* Left: Camera / Upload / Form */}
        <div className="glass" style={{ padding: '1.8rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 className="panel-title">Add Ingredients</h3>

          {/* Tips banner */}
          <div style={{
            background: 'rgba(16,124,91,0.06)', border: '1px solid rgba(16,124,91,0.12)',
            borderRadius: '8px', padding: '10px 14px', fontSize: '0.8rem', color: 'var(--primary)', lineHeight: 1.5
          }}>
            💡 <strong>Tip:</strong> For best accuracy, use good lighting and keep items visible. Hold steady before capturing.
          </div>

          {!capturedImage && (
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '1.5rem', marginBottom: '4px' }}>
              {['visual', 'form'].map(mode => (
                <button key={mode} style={{
                  background: 'transparent', border: 'none',
                  borderBottom: inputMode === mode ? '2px solid var(--primary)' : '2px solid transparent',
                  color: inputMode === mode ? 'var(--primary)' : 'var(--text-muted)',
                  paddingBottom: '10px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer'
                }} onClick={() => setInputMode(mode)}>
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
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="scanner-video"
                        style={{ transform: isMirrored ? 'scaleX(-1)' : 'none' }}
                      />
                      <div className="scanning-laser" />

                      {/* Camera controls overlay */}
                      <div style={{
                        position: 'absolute', top: 10, right: 10,
                        display: 'flex', gap: '8px'
                      }}>
                        <button onClick={() => setIsMirrored(m => !m)} title="Toggle mirror" style={{
                          background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff',
                          borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.75rem',
                          display: 'flex', alignItems: 'center', gap: 4
                        }}>
                          <FlipHorizontal size={14} /> Mirror
                        </button>
                        <button onClick={switchCamera} title="Switch camera" style={{
                          background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff',
                          borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.75rem',
                          display: 'flex', alignItems: 'center', gap: 4
                        }}>
                          🔄 Switch
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button className="btn-primary" onClick={handleCapture} style={{ flexGrow: 1 }}>
                        📸 Capture & Scan
                      </button>
                      <button className="btn-secondary" onClick={stopCamera}>
                        <VideoOff size={16} /> Stop
                      </button>
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
                    <button className="btn-secondary" onClick={() => startCamera()} style={{ justifyContent: 'center' }}>
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
                    style={{ padding: '12px', borderRadius: '8px', background: 'rgba(15,23,42,0.01)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontFamily: 'inherit', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Quantity</label>
                    <input type="number" min="1" required value={formQuantity} onChange={(e) => setFormQuantity(e.target.value)}
                      style={{ padding: '12px', borderRadius: '8px', background: 'rgba(15,23,42,0.01)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontFamily: 'inherit', outline: 'none' }}
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
                    <option value="perfect">Perfect & Fresh (~10 days)</option>
                    <option value="ripe">Fully Ripe / Ready to Use (~4 days)</option>
                    <option value="soft">Slightly Soft / Bruised (~2 days)</option>
                    <option value="dry">Dry / Shelf Stable (~180 days)</option>
                    <option value="custom">Custom expiration days...</option>
                  </select>
                </div>
                {formCondition === 'custom' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Estimated shelf life (in days)</label>
                    <input type="number" min="1" required value={formCustomDays} onChange={(e) => setFormCustomDays(e.target.value)}
                      style={{ padding: '12px', borderRadius: '8px', background: 'rgba(15,23,42,0.01)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontFamily: 'inherit', outline: 'none' }}
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
                <img src={capturedImage} alt="Captured" style={{ maxWidth: '100%', maxHeight: '320px', objectFit: 'contain' }} />
              </div>
              <button className="btn-secondary" onClick={handleReset} style={{ justifyContent: 'center' }}>
                <RotateCw size={16} /> Scan Another Photo
              </button>
            </div>
          )}
        </div>

        {/* Right: Results */}
        <div className="glass" style={{ minHeight: '360px', overflow: 'hidden' }}>
          {loading && (
            <div className="loading-container">
              <div className="spinner" />
              <div>
                <h4 style={{ fontWeight: 600, fontSize: '1.2rem', marginBottom: '6px' }}>Analyzing Image...</h4>
                <p className="pulse-text">AI is identifying ingredients and freshness levels.</p>
              </div>
            </div>
          )}

          {!loading && scanResult.length === 0 && !capturedImage && (
            <div className="empty-placeholder" style={{ border: 'none', height: '100%' }}>
              <span className="empty-icon">🍳</span>
              <p>Upload a photo or use the camera to scan your ingredients.</p>
            </div>
          )}

          {!loading && scanResult.length > 0 && (
            <div className="scan-review-container">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 className="panel-title">Review Detected Items</h3>
                  <button className="btn-secondary" onClick={handleAddReviewItem} style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
                    <Plus size={14} /> Add Item
                  </button>
                </div>
                <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
                  {scanResult.map((item) => (
                    <div key={item.tempId} style={{
                      display: 'flex', gap: '10px', alignItems: 'center',
                      background: 'rgba(255,255,255,0.02)', padding: '10px',
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