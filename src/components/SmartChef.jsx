import React, { useState } from 'react';
import { ChefHat, Clock, Gauge, Utensils, AlertTriangle, Sparkles, CheckSquare, Square, Plus, Flame } from 'lucide-react';

const PAGE_SIZE = 2;

function generateMockRecipes(ingredients) {
  const selected = ingredients.map(i => i.toLowerCase());
  const recipes = [];

  if (selected.some(i => i.includes('egg'))) {
    const eggItem = ingredients.find(i => i.toLowerCase().includes('egg'));
    const otherItem = ingredients.find(i => !i.toLowerCase().includes('egg'));
    recipes.push({
      name: `Scrambled Eggs with ${otherItem || 'Herbs'}`,
      prepTime: '10 mins', difficulty: 'Easy',
      usedIngredients: [eggItem, otherItem].filter(Boolean),
      missingIngredients: ['Salt & Pepper', 'Butter'],
      steps: [
        `Crack and whisk the ${eggItem} in a bowl.`,
        `Heat a pan over medium heat with a little oil or butter.`,
        otherItem ? `Lightly sauté ${otherItem} for 1 minute.` : `Let the pan heat up.`,
        `Pour in eggs and stir gently until soft and fluffy.`
      ]
    });
    recipes.push({
      name: `Egg Fried Rice`,
      prepTime: '15 mins', difficulty: 'Easy',
      usedIngredients: [eggItem].filter(Boolean),
      missingIngredients: ['Rice', 'Soy Sauce', 'Garlic'],
      steps: [
        'Cook rice and let it cool slightly.',
        `Beat the ${eggItem} in a bowl.`,
        'Heat oil in a wok or pan over high heat.',
        'Add egg and scramble quickly, then add rice.',
        'Stir fry together with soy sauce and seasoning.'
      ]
    });
  }

  if (selected.some(i => i.includes('milk'))) {
    recipes.push({
      name: 'Warm Spiced Milk',
      prepTime: '5 mins', difficulty: 'Easy',
      usedIngredients: ingredients.filter(i => i.toLowerCase().includes('milk')),
      missingIngredients: ['Honey', 'Cinnamon'],
      steps: [
        'Pour milk into a saucepan over low heat.',
        'Add a pinch of cinnamon and a drizzle of honey.',
        'Stir gently until warmed through — do not boil.',
        'Pour into a mug and enjoy warm.'
      ]
    });
  }

  if (recipes.length < 4) {
    recipes.push({
      name: 'Simple Herb Salad',
      prepTime: '5 mins', difficulty: 'Easy',
      usedIngredients: ingredients,
      missingIngredients: ['Olive Oil', 'Lemon Juice'],
      steps: ['Chop all ingredients.', 'Toss with olive oil and lemon juice.', 'Season to taste and serve.']
    });
    recipes.push({
      name: 'Quick Veggie Stir Fry',
      prepTime: '12 mins', difficulty: 'Easy',
      usedIngredients: ingredients,
      missingIngredients: ['Soy Sauce', 'Garlic', 'Oil'],
      steps: [
        'Chop all vegetables into bite-sized pieces.',
        'Heat oil in a pan over high heat.',
        'Add vegetables and stir fry for 5-7 minutes.',
        'Season with soy sauce and garlic.',
        'Serve hot over rice or noodles.'
      ]
    });
  }

  return recipes;
}

function RecipeCard({ recipe }) {
  return (
    <div className="recipe-card glass">
      <div className="recipe-header">
        <div>
          <h3 className="recipe-title">{recipe.name}</h3>
          <div className="recipe-meta" style={{ marginTop: '6px' }}>
            <span className="badge blue" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} /> {recipe.prepTime}
            </span>
            <span className="badge purple" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Gauge size={12} /> {recipe.difficulty}
            </span>
          </div>
        </div>
        <span className="badge green" style={{ display: 'flex', alignItems: 'center', gap: '4px', alignSelf: 'flex-start' }}>
          <Sparkles size={12} /> Chef Recommended
        </span>
      </div>

      <div className="ingredients-used">
        <div className="section-label">Used From Pantry</div>
        <div className="ingredient-tags">
          {recipe.usedIngredients && recipe.usedIngredients.map((item, i) => (
            <span key={i} className="tag" style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '8px' }}>
              {item}
            </span>
          ))}
        </div>
      </div>

      {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
        <div className="ingredients-used" style={{ marginTop: '1rem' }}>
          <div className="section-label" style={{ color: 'var(--warning)' }}>Missing Staples/Ingredients</div>
          <div className="ingredient-tags">
            {recipe.missingIngredients.map((item, i) => (
              <span key={i} className="tag" style={{ borderLeft: '3px solid var(--warning)', paddingLeft: '8px' }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: '1.25rem' }}>
        <div className="section-label">Cooking Instructions</div>
        <ol className="steps-list">
          {recipe.steps && recipe.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function SmartChef({ pantry, preSelectedIngredients = [] }) {
  const [selectedIngredients, setSelectedIngredients] = useState(preSelectedIngredients);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [errorMsg, setErrorMsg] = useState('');

  const handleToggleIngredient = (name) => {
    setSelectedIngredients((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIngredients.length === pantry.length) {
      setSelectedIngredients([]);
    } else {
      setSelectedIngredients(pantry.map((item) => item.name));
    }
  };

  const handleGenerateRecipes = async () => {
    if (selectedIngredients.length === 0) return;

    setLoading(true);
    setErrorMsg('');
    setRecipes([]);
    setVisibleCount(PAGE_SIZE);

    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: selectedIngredients })
      });

      const data = await response.json();
      if (data.recipes) {
        setRecipes(data.recipes);
        if (!response.ok) {
          setErrorMsg(data.details || data.error || 'Offline fallback active');
        }
      } else {
        throw new Error(data.details || data.error || 'Failed to generate recipes');
      }
    } catch (err) {
      console.error('Recipe generation error:', err);
      const fallback = generateMockRecipes(selectedIngredients);
      if (fallback.length > 0) {
        setRecipes(fallback);
      } else {
        setErrorMsg('Could not generate recipes. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    const nextCount = visibleCount + PAGE_SIZE;

    // If we already have enough recipes pre-loaded in memory, just show more
    if (nextCount <= recipes.length) {
      setVisibleCount(nextCount);
      return;
    }

    // Otherwise, since backend loaded 4-6 recipes, just cap it to recipes.length
    setVisibleCount(recipes.length);
  };

  const visibleRecipes = recipes.slice(0, visibleCount);
  const hasMore = visibleCount < recipes.length;

  return (
    <div>
      <header className="page-header">
        <h2 className="page-title">Recipe Builder</h2>
        <p className="page-subtitle">Check ingredients you want to use and generate matching recipes.</p>
      </header>

      {errorMsg && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)',
          padding: '12px 18px', borderRadius: '12px',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem'
        }}>
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {preSelectedIngredients.length > 0 && (
        <div style={{
          background: 'rgba(249, 115, 22, 0.08)',
          border: '1px solid rgba(249, 115, 22, 0.25)',
          borderRadius: '12px', padding: '12px 18px',
          marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <Flame size={16} color="#f97316" />
          <span style={{ fontSize: '0.88rem', color: '#f97316', fontWeight: 500 }}>
            {preSelectedIngredients.length} urgent ingredient{preSelectedIngredients.length !== 1 ? 's' : ''} pre-selected from Priority List — ready to generate!
          </span>
        </div>
      )}

      {pantry.length === 0 ? (
        <div className="empty-placeholder glass">
          <span className="empty-icon">🥦</span>
          <h3>Your pantry is empty</h3>
          <p>Go to the Visual Scanner tab to scan food items first before using the builder.</p>
        </div>
      ) : (
        <div className="chef-grid">
          {/* Left: Ingredient Checklist */}
          <div className="pantry-selection-panel glass">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Select Ingredients</h3>
              <button onClick={handleToggleSelectAll} style={{
                background: 'transparent', border: 'none',
                color: 'var(--primary)', fontSize: '0.85rem',
                fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                {selectedIngredients.length === pantry.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="checklist-container">
              {pantry.map((item) => {
                const isSelected = selectedIngredients.includes(item.name);
                return (
                  <div
                    key={item.id}
                    className={`pantry-checkbox-label ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleToggleIngredient(item.name)}
                  >
                    {isSelected ? (
                      <CheckSquare size={18} color="var(--primary)" />
                    ) : (
                      <Square size={18} color="var(--text-muted)" />
                    )}
                    <span style={{ flexGrow: 1, fontWeight: 500 }}>{item.name}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              className="btn-primary"
              disabled={selectedIngredients.length === 0 || loading}
              onClick={handleGenerateRecipes}
              style={{
                marginTop: '1.5rem', width: '100%', justifyContent: 'center',
                opacity: selectedIngredients.length === 0 ? 0.5 : 1,
                cursor: selectedIngredients.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              <ChefHat size={18} /> {loading ? 'Formulating...' : 'Generate Recipes'}
            </button>
          </div>

          {/* Right: Recipe Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {loading && (
              <div className="glass loading-container" style={{ minHeight: '320px' }}>
                <div className="spinner" />
                <div>
                  <h4 style={{ fontWeight: 600, fontSize: '1.2rem', marginBottom: '6px' }}>Searching database...</h4>
                  <p className="pulse-text">Formulating custom directions and matching ingredients.</p>
                </div>
              </div>
            )}

            {!loading && recipes.length === 0 && (
              <div className="glass empty-placeholder" style={{ minHeight: '320px', border: '1px solid var(--border-color)' }}>
                <Utensils size={32} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                <h3>No recipes generated yet</h3>
                <p>Select one or more ingredients on the left panel and click the generate button.</p>
              </div>
            )}

            {!loading && recipes.length > 0 && (
              <>
                {/* Recipe count indicator */}
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={14} color="var(--primary)" />
                  Showing {visibleRecipes.length} of {recipes.length} recipes
                </div>

                <div className="recipes-list">
                  {visibleRecipes.map((recipe, idx) => (
                    <RecipeCard key={idx} recipe={recipe} />
                  ))}
                </div>

                {/* Load More Button */}
                {hasMore && visibleCount < 20 && (
                  <button
                    className="btn-secondary"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    style={{
                      width: '100%', justifyContent: 'center',
                      padding: '14px', fontSize: '0.95rem',
                      opacity: loadingMore ? 0.7 : 1
                    }}
                  >
                    {loadingMore ? (
                      <>
                        <div className="spinner" style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                        Finding more recipes...
                      </>
                    ) : (
                      <>
                        <Plus size={18} /> Load 2 More Recipes
                      </>
                    )}
                  </button>
                )}

                {/* All loaded message */}
                {visibleCount >= 20 && (
                  <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', padding: '12px' }}>
                    You've explored all available recipes for these ingredients 🍽️
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SmartChef;