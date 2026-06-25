import React, { useState } from 'react';
import { AlertCircle, Plus, Utensils, Clock, Gauge, Sparkles } from 'lucide-react';

function RecipeSearch({ apiConfigured }) {
  const [recipeQuery, setRecipeQuery] = useState('');
  const [recipes, setRecipes] = useState([]);
  const [searchingRecipes, setSearchingRecipes] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRecipeSearchSubmit = async (e) => {
    e.preventDefault();
    if (!recipeQuery.trim()) return;

    setSearchingRecipes(true);
    setErrorMsg('');
    setRecipes([]);

    try {
      const response = await fetch('/api/search-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: recipeQuery.trim() })
      });

      const data = await response.json();
      if (data.recipes) {
        setRecipes(data.recipes);
        if (!response.ok) {
          setErrorMsg(data.details || data.error || 'Offline fallback active');
        }
      } else {
        throw new Error(data.details || data.error || 'Failed to search recipes');
      }
    } catch (err) {
      console.error('Error searching recipes:', err);
      setErrorMsg(err.message || 'Could not find recipes. Check your connection or API configurations.');
    } finally {
      setSearchingRecipes(false);
    }
  };

  const handleReset = () => {
    setRecipeQuery('');
    setRecipes([]);
    setSearchingRecipes(false);
    setErrorMsg('');
  };

  return (
    <div>
      <header className="page-header">
        <h2 className="page-title">Recipe section</h2>
        <p className="page-subtitle">Search or describe custom dishes to generate recipes with step-by-step instructions.</p>
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
        {/* Left Side: Search Form Panel */}
        <div className="glass" style={{ padding: '1.8rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 className="panel-title">Find Recipes</h3>

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
              ⚠️ <strong>Demo Sandbox Mode Active:</strong> A simulated recipe list will be returned. Configure your environment API keys to enable live AI recipe generation.
            </div>
          )}

          <form onSubmit={handleRecipeSearchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Search by Recipe Name or Description</label>
              <textarea
                required
                rows={5}
                placeholder="e.g. Chocolate Chip Cookies, or a quick breakfast using eggs and cheese"
                value={recipeQuery}
                onChange={(e) => setRecipeQuery(e.target.value)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(15, 23, 42, 0.01)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontFamily: 'inherit',
                  outline: 'none',
                  resize: 'none'
                }}
              />
            </div>
            <button 
              type="submit"
              className="btn-primary" 
              style={{ justifyContent: 'center', marginTop: '8px' }}
              disabled={searchingRecipes}
            >
              <Plus size={18} /> {searchingRecipes ? 'Searching...' : 'Search Recipe'}
            </button>
          </form>
        </div>

        {/* Right Side: Recipe Results Panel */}
        <div className="glass" style={{ minHeight: '360px', overflow: 'hidden' }}>
          {searchingRecipes && (
            <div className="loading-container">
              <div className="spinner" />
              <div>
                <h4 style={{ fontWeight: 600, fontSize: '1.2rem', marginBottom: '6px' }}>Searching Recipes...</h4>
                <p className="pulse-text">Formulating custom directions and ingredient lists.</p>
              </div>
            </div>
          )}

          {!searchingRecipes && recipes.length === 0 && (
            <div className="empty-placeholder" style={{ border: 'none', height: '100%' }}>
              <Utensils size={32} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
              <h3>No recipes found</h3>
              <p>Enter a recipe name or description on the left panel to search.</p>
            </div>
          )}

          {!searchingRecipes && recipes.length > 0 && (
            <div className="scan-review-container" style={{ padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 className="panel-title" style={{ margin: 0 }}>Matching Recipes</h3>
              </div>

              <div style={{ flexGrow: 1, overflowY: 'auto', maxHeight: '420px', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingRight: '4px' }}>
                {recipes.map((recipe, idx) => (
                  <div key={idx} className="recipe-card glass" style={{ padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'rgba(255,255,255,0.01)' }}>
                    <div className="recipe-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <h4 className="recipe-title" style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>{recipe.name}</h4>
                        <div className="recipe-meta" style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                          <span className="badge blue" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                            <Clock size={12} /> {recipe.prepTime}
                          </span>
                          <span className="badge purple" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
                            <Gauge size={12} /> {recipe.difficulty}
                          </span>
                        </div>
                      </div>
                      <span className="badge green" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', background: 'rgba(16,124,91,0.1)', color: '#107c5b' }}>
                        <Sparkles size={12} /> Chef Recommended
                      </span>
                    </div>

                    {/* Ingredients List */}
                    <div style={{ marginTop: '1rem' }}>
                      <div className="section-label" style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '6px' }}>Ingredients</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {recipe.usedIngredients && recipe.usedIngredients.map((item, i) => (
                          <span key={i} className="tag" style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '8px', fontSize: '0.8rem', color: 'var(--text-main)', background: 'rgba(255,255,255,0.02)', padding: '2px 8px', borderRadius: '4px' }}>
                            {item}
                          </span>
                        ))}
                        {recipe.missingIngredients && recipe.missingIngredients.length > 0 && recipe.missingIngredients.map((item, i) => (
                          <span key={i} className="tag" style={{ borderLeft: '3px solid var(--warning)', paddingLeft: '8px', fontSize: '0.8rem', color: 'var(--text-main)', background: 'rgba(255,255,255,0.02)', padding: '2px 8px', borderRadius: '4px' }}>
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginTop: '1.25rem' }}>
                      <div className="section-label" style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '6px' }}>Cooking Instructions</div>
                      <ol style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {recipe.steps && recipe.steps.map((step, i) => (
                          <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.4 }}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
                <button className="btn-secondary" onClick={handleReset} style={{ flexGrow: 1, justifyContent: 'center' }}>
                  Clear Search
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RecipeSearch;
