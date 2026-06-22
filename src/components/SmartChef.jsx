import React, { useState } from 'react';
import { ChefHat, Clock, Gauge, Utensils, AlertTriangle, Sparkles, CheckSquare, Square } from 'lucide-react';

// Using OpenRouter — bypasses backend entirely, no Vercel timeout issues
const OR_KEY = import.meta.env.VITE_OPENROUTER_KEY;

async function callAI(prompt) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OR_KEY}`,
      'HTTP-Referer': 'https://generative-culinary-intelligence-sy.vercel.app',
      'X-Title': 'SmartPantry'
    },
    body: JSON.stringify({
  model: 'openrouter/free',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
      temperature: 0.7
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || 'AI API error');
  }

  const data = await res.json();
  let text = data?.choices?.[0]?.message?.content?.trim() || '';

  if (text.startsWith('```')) {
    text = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  }

  return JSON.parse(text);
}

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
  }

  if (recipes.length === 0) {
    recipes.push({
      name: 'Simple Herb Salad',
      prepTime: '5 mins', difficulty: 'Easy',
      usedIngredients: ingredients,
      missingIngredients: ['Olive Oil', 'Lemon Juice'],
      steps: ['Chop all ingredients.', 'Toss with olive oil and lemon juice.', 'Season to taste and serve.']
    });
  }

  return recipes;
}

function SmartChef({ pantry }) {
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState([]);
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

    const prompt = `You are a creative AI Chef.
Here is a list of ingredients currently in the user's kitchen: ${JSON.stringify(selectedIngredients)}.

Generate 2 to 3 delicious recipes using these ingredients.
Assume basic staples like salt, pepper, oil, water, sugar are available.

CRITICAL: 'usedIngredients' must ONLY contain items from: ${JSON.stringify(selectedIngredients)}.
Any other ingredient needed must go under 'missingIngredients'.

Return a JSON array of objects with this exact schema:
- "name": String
- "prepTime": String (e.g. "15 mins")
- "difficulty": String ("Easy", "Medium", or "Hard")
- "usedIngredients": Array of Strings (only from the user's list)
- "missingIngredients": Array of Strings (ingredients NOT in the user's list)
- "steps": Array of Strings

Return ONLY the raw JSON array. No markdown, no extra text.`;

    try {
      if (!OR_KEY) {
        setRecipes(generateMockRecipes(selectedIngredients));
        return;
      }

      const result = await callAI(prompt);
      setRecipes(result);
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

  return (
    <div>
      <header className="page-header">
        <h2 className="page-title">Recipe Builder</h2>
        <p className="page-subtitle">Check ingredients you want to use and generate matching recipes.</p>
      </header>

      {errorMsg && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          color: 'var(--danger)',
          padding: '12px 18px',
          borderRadius: '12px',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem'
        }}>
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
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
          <div className="pantry-selection-panel glass">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Select Ingredients</h3>
              <button
                onClick={handleToggleSelectAll}
                style={{
                  background: 'transparent', border: 'none',
                  color: 'var(--primary)', fontSize: '0.85rem',
                  fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
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
              <div className="recipes-list">
                {recipes.map((recipe, idx) => (
                  <div key={idx} className="recipe-card glass">
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
                        {recipe.usedIngredients.map((item, i) => (
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
                        {recipe.steps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SmartChef; 