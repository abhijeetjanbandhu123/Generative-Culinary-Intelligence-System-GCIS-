import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, AlertCircle, Plus, Trash, Check, VideoOff, RotateCw } from 'lucide-react';

function Scanner({ addItemsToPantry, setActiveTab, apiConfigured }) {
  const [capturedImage, setCapturedImage] = useState(null); // base64 string
  const [inputMode, setInputMode] = useState('form'); // default to 'form'
  const [formName, setFormName] = useState('');
  const [formQuantity, setFormQuantity] = useState('1');
  const [formUnit, setFormUnit] = useState('pieces');
  const [formCondition, setFormCondition] = useState('perfect');
  const [formCustomDays, setFormCustomDays] = useState('7');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState([]); // review items list
  const [cameraActive, setCameraActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [hiddenModel, setHiddenModel] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Stop camera when leaving component
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Silently load TF model for offline fallback accuracy
  useEffect(() => {
    const loadSilentModel = async () => {
      try {
        if (window.cocoSsd) {
          const loadedModel = await window.cocoSsd.load();
          setHiddenModel(loadedModel);
        }
      } catch (e) {
        console.warn('Silent model load failed', e);
      }
    };
    loadSilentModel();
  }, []);

  const getHiddenDetections = async (imageSrc) => {
    if (!hiddenModel) return null;
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageSrc;
      img.onload = async () => {
        try {
          const predictions = await hiddenModel.detect(img);
          if (predictions && predictions.length > 0) {
            resolve(predictions.map(p => p.class).join(', '));
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
    });
  };

  // Web camera activation
  const startCamera = async () => {
    setErrorMsg('');
    try {
      const constraints = {
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      setErrorMsg('Could not access camera. Please upload an image instead.');
      setCameraActive(false);
    }
  };

  // Turn off camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Capture frame from active camera stream
  const handleCapture = async () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    // Mirror standard laptop cams
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL('image/jpeg');
    setCapturedImage(dataUrl);
    stopCamera();
    setLoading(true);
    const hiddenPredictions = await getHiddenDetections(dataUrl);
    sendToBackend(dataUrl, hiddenPredictions);
  };

  // Image Upload handler
  const handleImageUpload = (e) => {
    setErrorMsg('');
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      setCapturedImage(reader.result);
      setLoading(true);
      const hiddenPredictions = await getHiddenDetections(reader.result);
      sendToBackend(reader.result, hiddenPredictions);
    };
    reader.readAsDataURL(file);
  };

  // Send image file to server api
  const sendToBackend = async (base64Image, hiddenFileName = null) => {
    setLoading(true);
    setScanResult([]);
    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image, fileName: hiddenFileName })
      });

      const data = await response.json();
      if (response.ok && data.items) {
        // Map elements to unique keys for local review form
        const mappedItems = data.items.map((item, idx) => ({
          ...item,
          tempId: Date.now().toString() + idx + Math.random().toString(36).substring(2, 5)
        }));
        setScanResult(mappedItems);
      } else {
        throw new Error(data.details || data.error || 'Server parsing error');
      }
    } catch (err) {
      console.error('Scanning failed:', err);
      setErrorMsg(err.message || 'Scanning analysis failed. Please verify API configuration or try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle manual questionnaire form submission
  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formName.trim()) return;

    let expiryDays = 7;
    let freshnessPrediction = 'Good freshness';

    switch (formCondition) {
      case 'perfect':
        expiryDays = 10;
        freshnessPrediction = 'Perfect & Fresh (10 days)';
        break;
      case 'ripe':
        expiryDays = 4;
        freshnessPrediction = 'Ripe & Ready (4 days)';
        break;
      case 'soft':
        expiryDays = 2;
        freshnessPrediction = 'Slightly Soft (Consume in 2 days)';
        break;
      case 'dry':
        expiryDays = 180;
        freshnessPrediction = 'Dry & Shelf Stable (180 days)';
        break;
      case 'custom':
        expiryDays = parseInt(formCustomDays) || 7;
        freshnessPrediction = `Estimated expiry: ${expiryDays} days`;
        break;
      default:
        expiryDays = 7;
        freshnessPrediction = 'Good freshness (7 days)';
    }

    const newItem = {
      tempId: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      name: formName.trim(),
      quantity: Number(formQuantity) || 1,
      unit: formUnit,
      expiryDays: expiryDays,
      freshnessPrediction: freshnessPrediction
    };

    setScanResult(prev => [...prev, newItem]);

    // Reset questionnaire fields
    setFormName('');
    setFormQuantity('1');
    setFormUnit('pieces');
    setFormCondition('perfect');
    setFormCustomDays('7');
  };

  // Review List: Modify item property
  const handleReviewItemChange = (tempId, field, value) => {
    setScanResult(prev =>
      prev.map(item => item.tempId === tempId ? { ...item, [field]: value } : item)
    );
  };

  // Review List: Remove single item
  const handleRemoveReviewItem = (tempId) => {
    setScanResult(prev => prev.filter(item => item.tempId !== tempId));
  };

  // Review List: Add manual item
  const handleAddReviewItem = () => {
    setScanResult(prev => [
      ...prev,
      {
        tempId: Date.now().toString(),
        name: '',
        quantity: 1,
        unit: 'pieces',
        expiryDays: 7
      }
    ]);
  };

  // Final Action: Add verified items to main pantry state
  const handleSaveAll = () => {
    // Validate names are not blank
    const validItems = scanResult.filter(item => item.name && item.name.trim() !== '');
    if (validItems.length === 0) return;

    addItemsToPantry(validItems);
    // Clear page state
    setCapturedImage(null);
    setScanResult([]);
    // Send user back to dashboard
    setActiveTab('dashboard');
  };



  // Start fresh
  const handleReset = () => {
    setCapturedImage(null);
    setScanResult([]);
    setErrorMsg('');
    setFormName('');
    setFormQuantity('1');
    setFormUnit('pieces');
    setFormCondition('perfect');
    setFormCustomDays('7');
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
          background: 'rgba(239, 68, 68, 0.1)',
          color: 'var(--danger)',
          padding: '12px 18px',
          borderRadius: '12px',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '1.5rem'
        }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="scanner-grid">
        {/* Left Side: Upload / Camera / Form Controller */}
        <div className="glass" style={{ padding: '1.8rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 className="panel-title">Add Ingredients</h3>
          
          {!apiConfigured && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.08)',
              color: '#d97706',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              fontSize: '0.8rem',
              lineHeight: '1.4'
            }}>
              ⚠️ <strong>Demo Sandbox Mode Active:</strong> A simulated list (Apples, Eggs, Broccoli, Cheese) will be returned when scanning. Configure your <code>GEMINI_API_KEY</code> in your environment variables to enable live AI vision scanning.
            </div>
          )}
          
          {/* Mode Selector Tabs */}
          {!capturedImage && (
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '1.5rem', marginBottom: '4px' }}>
              {[
                { id: 'form', label: 'Details Form' },
                { id: 'visual', label: 'Camera / Upload' }
              ].map(tab => (
                <button 
                  key={tab.id}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: inputMode === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                    color: inputMode === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                    paddingBottom: '10px',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setInputMode(tab.id);
                    setErrorMsg('');
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
          
          {!capturedImage ? (
            inputMode === 'form' ? (
              <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>What is the ingredient name?</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Milk, Tomato, Apples"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      background: 'rgba(15, 23, 42, 0.01)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      fontFamily: 'inherit',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Quantity</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formQuantity}
                      onChange={(e) => setFormQuantity(e.target.value)}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        background: 'rgba(15, 23, 42, 0.01)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        fontFamily: 'inherit',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Unit</label>
                    <select
                      value={formUnit}
                      onChange={(e) => setFormUnit(e.target.value)}
                      className="input-select"
                      style={{ height: '45px' }}
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
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>What is the condition of this item?</label>
                  <select
                    value={formCondition}
                    onChange={(e) => setFormCondition(e.target.value)}
                    className="input-select"
                  >
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
                    <input
                      type="number"
                      min="1"
                      required
                      value={formCustomDays}
                      onChange={(e) => setFormCustomDays(e.target.value)}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        background: 'rgba(15, 23, 42, 0.01)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        fontFamily: 'inherit',
                        outline: 'none'
                      }}
                    />
                  </div>
                )}

                <button 
                  type="submit"
                  className="btn-primary" 
                  style={{ justifyContent: 'center', marginTop: '8px' }}
                >
                  <Plus size={18} /> Add to Review List
                </button>
              </form>
            ) : (
              <div>
                {cameraActive ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="scanner-video-container">
                      <video ref={videoRef} autoPlay playsInline className="scanner-video" />
                      <div className="scanning-laser" />
                    </div>
                    
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button className="btn-primary" onClick={handleCapture} style={{ flexGrow: 1 }}>
                        Capture Photo
                      </button>
                      <button className="btn-secondary" onClick={stopCamera}>
                        <VideoOff size={16} /> Turn Off Camera
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Uploader Box */}
                    <label className="uploader-box">
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={handleImageUpload} 
                      />
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

        {/* Right Side: Scan Processing / Verification Review Grid */}
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
                          display: 'flex',
                          gap: '10px',
                          alignItems: 'center',
                          background: 'rgba(255, 255, 255, 0.02)',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)'
                        }}>
                          {/* Name and Freshness Prediction stacked */}
                          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 2, gap: '4px', width: '120px' }}>
                            <input 
                              type="text" 
                              placeholder="Ingredient Name" 
                              value={item.name} 
                              onChange={(e) => handleReviewItemChange(item.tempId, 'name', e.target.value)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                borderBottom: '1px solid var(--border-color)',
                                color: 'var(--text-main)',
                                padding: '4px 0',
                                outline: 'none',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                width: '100%'
                              }}
                            />
                            <input 
                              type="text" 
                              placeholder="Freshness prediction" 
                              value={item.freshnessPrediction || ''} 
                              onChange={(e) => handleReviewItemChange(item.tempId, 'freshnessPrediction', e.target.value)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--primary)',
                                padding: '2px 0',
                                outline: 'none',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                width: '100%',
                                opacity: 0.95
                              }}
                            />
                          </div>
                          
                          {/* Qty input */}
                          <input 
                            type="number" 
                            min="1"
                            value={item.quantity} 
                            onChange={(e) => handleReviewItemChange(item.tempId, 'quantity', Number(e.target.value))}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              borderBottom: '1px solid var(--border-color)',
                              color: 'var(--text-main)',
                              padding: '4px 0',
                              outline: 'none',
                              fontSize: '0.9rem',
                              width: '40px',
                              textAlign: 'center'
                            }}
                          />

                          {/* Unit input */}
                          <select 
                            value={item.unit}
                            onChange={(e) => handleReviewItemChange(item.tempId, 'unit', e.target.value)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-main)',
                              outline: 'none',
                              fontSize: '0.85rem',
                              width: '65px'
                            }}
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

                          {/* Expiry days */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input 
                              type="number" 
                              min="1"
                              value={item.expiryDays} 
                              onChange={(e) => handleReviewItemChange(item.tempId, 'expiryDays', Number(e.target.value))}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                borderBottom: '1px solid var(--border-color)',
                                color: 'var(--text-main)',
                                padding: '4px 0',
                                outline: 'none',
                                fontSize: '0.9rem',
                                width: '35px',
                                textAlign: 'center'
                              }}
                            />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>days</span>
                          </div>

                          {/* Delete item */}
                          <button 
                            onClick={() => handleRemoveReviewItem(item.tempId)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
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
                    <button className="btn-secondary" onClick={handleReset}>
                      Discard
                    </button>
                  </div>
                </div>
              )}
        </div>
      </div>
    </div>
  );
}

export default Scanner;