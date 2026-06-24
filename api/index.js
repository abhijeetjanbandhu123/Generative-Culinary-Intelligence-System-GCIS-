import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

const apiKey = process.env.GEMINI_API_KEY;
const openRouterKey = process.env.VITE_OPENROUTER_KEY;

let genAI = null;
if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
  genAI = new GoogleGenerativeAI(apiKey);
}

async function withTimeout(promise, ms = 25000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Gemini response timed out')), ms))
  ]);
}

// OpenRouter vision fallback — tries models in order until one works
async function scanWithOpenRouter(image, prompt) {
  const VISION_MODELS = [
    "nvidia/nemotron-nano-12b-v2-vl:free",
    "qwen/qwen2.5-vl-72b-instruct:free",
    "qwen/qwen2.5-vl-32b-instruct:free",
    "qwen/qwen2.5-vl-7b-instruct:free",
    "google/gemma-4-31b-it:free",
  ];

  for (const model of VISION_MODELS) {
    try {
      console.log(`Trying vision model: ${model}`);
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://generative-culinary-intelligence-sy.vercel.app",
          "X-Title": "SmartPantry"
        },
        body: JSON.stringify({
          model: model,
          messages: [{
            role: "user",
            content: [
              { type: "image_url", image_url: { url: image } },
              { type: "text", text: prompt }
            ]
          }],
          max_tokens: 2048,
          temperature: 0.3
        })
      });
      const data = await response.json();
      if (data.error) {
        console.log(`Model ${model} failed: ${data.error.message}`);
        continue;
      }
      console.log(`Model ${model} succeeded!`);
      return data.choices[0].message.content.trim();
    } catch (err) {
      console.log(`Model ${model} error: ${err.message}`);
      continue;
    }
  }
  throw new Error("All vision models failed or rate limited. Try again in a minute.");
}

// --------------------------------------------------------------------------
// SANDBOX SIMULATOR DATA
// --------------------------------------------------------------------------
const MOCK_DETECTION = [
  { name: 'Red Apples', quantity: 4, unit: 'pieces', expiryDays: 7, freshnessPrediction: 'Firm & crisp (7 days)' },
  { name: 'Whole Milk', quantity: 1, unit: 'bottle', expiryDays: 4, freshnessPrediction: 'Label reads: 26/06 (4 days)' },
  { name: 'Eggs', quantity: 6, unit: 'pieces', expiryDays: 14, freshnessPrediction: 'Fresh shell state (14 days)' },
  { name: 'Broccoli', quantity: 1, unit: 'head', expiryDays: 2, freshnessPrediction: 'Slightly yellowing (2 days)' },
  { name: 'Cheddar Cheese', quantity: 200, unit: 'grams', expiryDays: 12, freshnessPrediction: 'Sealed pack (12 days)' }
];

function fileToGenerativePart(base64DataUrl) {
  const matches = base64DataUrl.match(/^data:(.*);base64,(.*)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 image data url');
  }
  return {
    inlineData: {
      data: matches[2],
      mimeType: matches[1]
    },
  };
}

// --------------------------------------------------------------------------
// API ROUTES
// --------------------------------------------------------------------------

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    apiConfigured: !!genAI,
    openRouterConfigured: !!openRouterKey,
    timestamp: new Date()
  });
});

app.post('/api/scan', async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    const prompt = `You are an expert food and ingredient recognition AI with high accuracy vision capabilities.

Carefully analyze this image and identify EVERY visible food item, ingredient, vegetable, fruit, beverage, condiment, dairy product, packaged good, or any edible item.

For EACH item you detect:
1. Look at colors, shapes, textures, labels, and packaging carefully
2. Count exact quantities visible
3. Assess freshness from visual cues (color, texture, ripeness, any spoilage signs)
4. If a printed expiry date is visible on packaging, read it and calculate days remaining from today
5. Estimate shelf life in days based on visual condition

Return a JSON array where each object follows this EXACT schema:
- "name": String — specific capitalized name (e.g. "Red Bell Pepper", "Whole Milk Bottle", "Brown Eggs", "Cheddar Cheese Block")
- "quantity": Number — exact count visible in image (default 1 if unclear)
- "unit": String — appropriate unit ("pieces", "bottle", "grams", "can", "box", "pack", "head", "bunch", "carton", "jar")
- "expiryDays": Number — realistic days until expiry based on visual freshness
- "freshnessPrediction": String — concise visual freshness assessment (e.g. "Firm & crisp (7 days)", "Ripe yellow skin (3 days)", "Sealed unopened pack (14 days)")

Be thorough — identify every single food item visible. Do not skip anything.
Return ONLY the raw JSON array. No markdown fences, no explanations, no extra text.`;

    let text;

    if (genAI) {
      // Gemini path
      const imagePart = fileToGenerativePart(image);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await withTimeout(model.generateContent([prompt, imagePart]));
      const response = await result.response;
      text = response.text().trim();
    } else if (openRouterKey) {
      // OpenRouter fallback
      text = await withTimeout(scanWithOpenRouter(image, prompt));
    } else {
      return res.json({ items: MOCK_DETECTION, note: 'Offline sandbox mode' });
    }

    if (text.startsWith('```')) {
      text = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }

    const items = JSON.parse(text);
    res.json({ items, note: 'Success' });

  } catch (error) {
    console.error('Error analyzing image:', error);
    res.status(500).json({
      error: 'Failed to analyze image',
      details: error.message,
      items: MOCK_DETECTION,
      note: 'Sandbox fallback'
    });
  }
});

app.post('/api/scan-text', async (req, res) => {
  try {
    const { description } = req.body;

    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'No description text provided' });
    }

    if (!genAI) {
      const words = description.split(/\s+/).filter(w => w.length > 3).slice(0, 3);
      const mockResult = words.map((word) => ({
        name: word.charAt(0).toUpperCase() + word.slice(1).replace(/[^a-zA-Z]/g, ''),
        quantity: Math.floor(Math.random() * 3) + 1,
        unit: 'pieces',
        expiryDays: 7,
        freshnessPrediction: 'Text Sandbox (7 days)'
      }));
      if (mockResult.length === 0) {
        mockResult.push({ name: 'Tomatoes', quantity: 3, unit: 'pieces', expiryDays: 5, freshnessPrediction: 'Text Sandbox (5 days)' });
      }
      return res.json({ items: mockResult, note: 'Offline sandbox mode' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Analyze the following description of ingredients written by a user in their kitchen: "${description}".
Extract all food items, ingredients, vegetables, fruits, dairy, or pantry goods.
For each item, output a JSON array of objects with the exact schema below.

Schema keys:
- "name": String (Capitalized, e.g. "Green Apple", "Whole Milk", "Tomato")
- "quantity": Number (The count or quantity parsed from text, default to 1 if not specified)
- "unit": String (e.g. "pieces", "bottle", "grams", "can", "box", "pack")
- "expiryDays": Number (Reasonable shelf life days remaining from today)
- "freshnessPrediction": String (Brief description of estimated state)

Provide ONLY the raw JSON array. Do not include markdown code block formatting or any additional text.`;

    const result = await withTimeout(model.generateContent(prompt));
    const response = await result.response;
    let text = response.text().trim();

    if (text.startsWith('```')) {
      text = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }

    const items = JSON.parse(text);
    res.json({ items, note: 'Success' });

  } catch (error) {
    console.error('Error analyzing description text:', error);
    res.status(500).json({
      error: 'Failed to analyze text description',
      details: error.message,
      items: [{ name: 'Pantry Item', quantity: 1, unit: 'pieces', expiryDays: 7, freshnessPrediction: 'Text Sandbox fallback' }],
      note: 'Sandbox fallback'
    });
  }
});

function isLiquidOrPowder(name) {
  const lowercase = name.toLowerCase();
  return lowercase.includes('milk') || lowercase.includes('honey') || lowercase.includes('water') ||
    lowercase.includes('oil') || lowercase.includes('sugar') || lowercase.includes('flour') ||
    lowercase.includes('juice') || lowercase.includes('sauce') || lowercase.includes('salt') ||
    lowercase.includes('pepper') || lowercase.includes('butter');
}

function generateMockRecipes(ingredients) {
  const selected = ingredients.map(i => i.toLowerCase());
  const recipes = [];

  if (selected.some(i => i.includes('egg'))) {
    const eggItem = ingredients.find(i => i.toLowerCase().includes('egg'));
    const used = [eggItem];
    const extra = [];
    const tomatoItem = ingredients.find(i => i.toLowerCase().includes('tomato'));
    if (tomatoItem) used.push(tomatoItem); else extra.push('Tomato');
    const cheeseItem = ingredients.find(i => i.toLowerCase().includes('cheese'));
    if (cheeseItem) used.push(cheeseItem); else extra.push('Cheese');
    const otherItem = ingredients.find(i => !i.toLowerCase().includes('egg') && !i.toLowerCase().includes('tomato') && !i.toLowerCase().includes('cheese'));
    if (otherItem) used.push(otherItem);
    recipes.push({
      name: `Savory Scrambled Eggs with ${otherItem || 'Herbs'}`,
      prepTime: "10 mins", difficulty: "Easy",
      usedIngredients: used, missingIngredients: extra.slice(0, 1),
      steps: [
        `Crack and whisk the ${eggItem} in a small bowl.`,
        `Heat a clean pan over medium heat with a teaspoon of oil.`,
        otherItem ? `Lightly sauté the ${otherItem} in the pan for 1 minute.` : `Prepare the pan.`,
        `Pour in the egg mixture and cook, stirring occasionally, until soft and fluffy.`
      ]
    });
  }

  if (selected.some(i => i.includes('tomato'))) {
    const tomatoItem = ingredients.find(i => i.toLowerCase().includes('tomato'));
    const used = [tomatoItem];
    const extra = [];
    const garlicItem = ingredients.find(i => i.toLowerCase().includes('garlic') || i.toLowerCase().includes('onion'));
    if (garlicItem) used.push(garlicItem); else extra.push('Garlic / Onion');
    recipes.push({
      name: "Rustic Tomato Soup",
      prepTime: "20 mins", difficulty: "Easy",
      usedIngredients: used, missingIngredients: extra,
      steps: [
        `Chop the ${tomatoItem} into small segments.`,
        "Sauté chopped garlic or onions in a saucepan with oil until fragrant.",
        `Add the chopped ${tomatoItem} and cook over medium heat until they break down.`,
        "Blend or mash the mixture, add a splash of water, simmer for 5 minutes, season to taste."
      ]
    });
  }

  if (recipes.length === 0) {
    recipes.push({
      name: "Fresh Herb Dressing Salad",
      prepTime: "5 mins", difficulty: "Easy",
      usedIngredients: ingredients,
      missingIngredients: ["Lemon Juice", "Olive Oil"],
      steps: ["Finely chop any fresh ingredients available.", "Drizzle with lemon juice and olive oil, toss, and serve."]
    });
  }

  return recipes;
}

app.post('/api/recipes', async (req, res) => {
  try {
    const { ingredients } = req.body;

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'No ingredients provided' });
    }

    if (!genAI) {
      return res.json({ recipes: generateMockRecipes(ingredients), note: 'Offline sandbox mode' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a creative AI Chef. 
Here is a list of ingredients currently in the user's kitchen: ${JSON.stringify(ingredients)}.

Generate 2 to 3 delicious recipes that the user can cook using these ingredients. 
You are allowed to assume common, basic pantry staples are available (such as salt, pepper, cooking oil, water, sugar).

CRITICAL CONSTRAINTS:
The 'usedIngredients' array MUST contain ONLY items present in: ${JSON.stringify(ingredients)}. 
Any other ingredient NOT in that list MUST go under 'missingIngredients'.

Provide the response as a JSON array of objects with this exact schema:
- "name": String
- "prepTime": String (e.g. "15 mins")
- "difficulty": String ("Easy", "Medium", or "Hard")
- "usedIngredients": Array of Strings
- "missingIngredients": Array of Strings
- "steps": Array of Strings

Provide ONLY the raw JSON array. No markdown, no extra text.`;

    const result = await withTimeout(model.generateContent(prompt));
    const response = await result.response;
    let text = response.text().trim();

    if (text.startsWith('```')) {
      text = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }

    let recipes = JSON.parse(text);

    if (Array.isArray(recipes)) {
      recipes = recipes.map(recipe => {
        const verifiedUsed = [];
        const verifiedMissing = recipe.missingIngredients ? [...recipe.missingIngredients] : [];
        const rawUsed = recipe.usedIngredients || [];

        rawUsed.forEach(item => {
          const itemLower = item.toLowerCase().trim();
          const match = ingredients.find(input => {
            const inputLowerVal = input.toLowerCase().trim();
            return itemLower.includes(inputLowerVal) || inputLowerVal.includes(itemLower);
          });
          if (match) {
            verifiedUsed.push(item);
          } else {
            const commonStaples = ['water', 'salt', 'pepper', 'cooking oil', 'oil', 'sugar'];
            const isStaple = commonStaples.some(staple => itemLower.includes(staple));
            if (!isStaple && !verifiedMissing.some(m => m.toLowerCase().trim() === itemLower)) {
              verifiedMissing.push(item.charAt(0).toUpperCase() + item.slice(1));
            }
          }
        });

        return { ...recipe, usedIngredients: verifiedUsed, missingIngredients: verifiedMissing };
      });
    }

    res.json({ recipes, note: 'Success' });

  } catch (error) {
    console.error('Error generating recipes:', error);
    res.status(500).json({
      error: 'Failed to generate recipes',
      details: error.message,
      recipes: generateMockRecipes(req.body.ingredients || []),
      note: 'Sandbox fallback'
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;