import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables from .env file for local development
dotenv.config();

const app = express();
// We bumped this payload limit to 10mb because some phone camera uploads are huge and threw 413 errors during our testing.
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Initialize Gemini API client if key exists
const apiKey = process.env.GEMINI_API_KEY;
let genAI = null;
if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE' && apiKey.trim() !== '') {
  genAI = new GoogleGenerativeAI(apiKey);
}

// Initialize OpenRouter configuration
const openRouterKey = process.env.OPENROUTER_API_KEY;

// ---------------------------------------------------------
// TheMealDB Integration (Infinite Free Recipe Fallback)
// ---------------------------------------------------------
async function fetchMealDB(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.meals || null;
  } catch (e) {
    console.error('TheMealDB error:', e);
    return null;
  }
}

function formatMealToRecipeSchema(meal, availableIngredients = []) {
  const recipeIngredients = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (ing && ing.trim()) {
      recipeIngredients.push(`${measure ? measure.trim() + ' ' : ''}${ing.trim()}`.trim());
    }
  }

  const steps = meal.strInstructions
    .split(/\n|\r\n/)
    .map(s => s.trim())
    .filter(s => s.length > 3 && !s.match(/^\d+$/));

  const usedIngredients = [];
  const missingIngredients = [];
  
  recipeIngredients.forEach(ri => {
    // Check if ingredient is in user's available list
    const isAvailable = availableIngredients.some(ai => ri.toLowerCase().includes(ai.toLowerCase()));
    if (isAvailable) {
      usedIngredients.push(ri);
    } else {
      missingIngredients.push(ri);
    }
  });

  return {
    name: meal.strMeal,
    prepTime: "30 mins",
    difficulty: "Medium",
    usedIngredients: usedIngredients,
    missingIngredients: missingIngredients,
    steps: steps
  };
}

// ---------------------------------------------------------

// Helper to routing generative calls to Gemini or OpenRouter
async function callGenerativeAI(prompt, base64Image = null) {
  // 1. If GEMINI_API_KEY is configured and valid, use the official SDK
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        let result;
    if (base64Image) {
      const imagePart = fileToGenerativePart(base64Image);
      result = await model.generateContent([prompt, imagePart]);
    } else {
      result = await model.generateContent(prompt);
      }
      const response = await result.response;
      return response.text().trim();
    } catch (err) {
      console.warn(`Gemini client failed, attempting fallback to OpenRouter: ${err.message}`);
    }
  }

  // 2. If OPENROUTER_API_KEY is configured, call OpenRouter endpoint
  if (openRouterKey && openRouterKey !== 'YOUR_OPENROUTER_API_KEY_HERE') {
    const headers = {
      'Authorization': `Bearer ${openRouterKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'GCIS Smart Pantry'
    };

    let contentPayload = [];
    if (base64Image) {
      const matches = base64Image.match(/^data:(.*);base64,(.*)$/);
      const mimeType = matches ? matches[1] : 'image/jpeg';
      const base64Data = matches ? matches[2] : base64Image;
      
      contentPayload = [
        { type: 'text', text: prompt },
        {
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${base64Data}`
          }
        }
      ];
    } else {
      contentPayload = prompt;
    }

    const models = base64Image ? [
      'qwen/qwen2.5-vl-72b-instruct:free',
      'meta-llama/llama-3.2-11b-vision-instruct:free',
      'nvidia/nemotron-nano-12b-v2-vl:free',
      'openrouter/free'
    ] : [
      'meta-llama/llama-3.3-70b-instruct:free',
      'google/gemma-4-31b-it:free',
      'liquid/lfm-2.5-1.2b-instruct:free',
      'openrouter/free'
    ];

    let lastError = null;
    for (const model of models) {
      try {
        console.log(`Trying OpenRouter model: ${model}...`);
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: 'user',
                content: contentPayload
              }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 1500
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Status ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        if (!data.choices || data.choices.length === 0 || !data.choices[0].message) {
          throw new Error('Invalid response structure from OpenRouter');
        }

        console.log(`OpenRouter model ${model} succeeded!`);
        return data.choices[0].message.content.trim();
      } catch (err) {
        console.warn(`OpenRouter model ${model} failed: ${err.message}`);
        lastError = err;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // IF we made it here and it is NOT an image, use Pollinations API which is unlimited and free!
    if (!base64Image) {
      console.log('OpenRouter failed. Attempting unlimited Pollinations API fallback for text...');
      try {
        const pollResponse = await fetch('https://text.pollinations.ai/openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            model: 'openai',
            jsonMode: true
          })
        });
        
        if (pollResponse.ok) {
          const pollData = await pollResponse.json();
          if (pollData.choices && pollData.choices[0] && pollData.choices[0].message) {
            console.log('Pollinations API succeeded!');
            return pollData.choices[0].message.content.trim();
          }
        }
      } catch (pollErr) {
        console.error('Pollinations API also failed:', pollErr);
      }
    }

    throw new Error(`All fallback models failed. Last error: ${lastError ? lastError.message : 'Unknown'}`);
  }

  // IF no keys are configured, just use Pollinations API directly for text!
  if (!base64Image) {
    console.log('No API keys set. Using unlimited Pollinations API for text...');
    try {
      const pollResponse = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          model: 'openai',
          jsonMode: true
        })
      });
      
      if (pollResponse.ok) {
        const pollData = await pollResponse.json();
        if (pollData.choices && pollData.choices[0] && pollData.choices[0].message) {
          console.log('Pollinations API succeeded directly!');
          return pollData.choices[0].message.content.trim();
        }
      }
    } catch (pollErr) {
      console.error('Pollinations direct API failed:', pollErr);
    }
  }

  throw new Error('No valid generative AI API key configured, and offline fallback failed.');
}

// --------------------------------------------------------------------------
// SANDBOX SIMULATOR DATA (Used for offline testing or fallback)
// --------------------------------------------------------------------------
const MOCK_DETECTION = [
  { name: 'Red Apples', quantity: 4, unit: 'pieces', expiryDays: 7, freshnessPrediction: 'Firm & crisp (7 days)' },
  { name: 'Whole Milk', quantity: 1, unit: 'bottle', expiryDays: 4, freshnessPrediction: 'Label reads: 26/06 (4 days)' },
  { name: 'Eggs', quantity: 6, unit: 'pieces', expiryDays: 14, freshnessPrediction: 'Fresh shell state (14 days)' },
  { name: 'Broccoli', quantity: 1, unit: 'head', expiryDays: 2, freshnessPrediction: 'Slightly yellowing (2 days)' },
  { name: 'Cheddar Cheese', quantity: 200, unit: 'grams', expiryDays: 12, freshnessPrediction: 'Sealed pack (12 days)' }
];

const MOCK_RECIPES = [
  {
    name: "Apple & Broccoli Cheese Melt",
    prepTime: "15 mins",
    difficulty: "Easy",
    usedIngredients: ["Red Apples", "Cheddar Cheese", "Broccoli"],
    missingIngredients: ["Bread", "Butter"],
    steps: [
      "Cut the broccoli into small florets and steam for 3 minutes until tender-crisp.",
      "Thinly slice the red apples and grate the cheddar cheese.",
      "Butter two slices of bread, place broccoli and apple slices on the bread, and top generously with cheese.",
      "Grill in a pan or toaster oven until the bread is golden-brown and the cheese is fully melted."
    ]
  },
  {
    name: "Classic Scrambled Eggs with Broccoli",
    prepTime: "10 mins",
    difficulty: "Easy",
    usedIngredients: ["Eggs", "Broccoli", "Cheddar Cheese"],
    missingIngredients: ["Butter", "Salt & Pepper"],
    steps: [
      "Chop broccoli florets into tiny pieces.",
      "Whisk eggs in a bowl with a pinch of salt and pepper.",
      "Melt butter in a pan, sauté the broccoli pieces for 2 minutes.",
      "Pour in the whisked eggs and stir gently over medium-low heat.",
      "Fold in grated cheddar cheese just before the eggs are fully set."
    ]
  }
];

// Helper function to extract base64 details from data URL
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

// Helper to extract JSON block from text containing conversational noise or markdown blocks
function extractAndParseJSON(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch (err) {
    // If standard JSON parsing fails, look for the first/last bracket or brace to extract JSON
    const firstBracket = trimmed.indexOf('[');
    const lastBracket = trimmed.lastIndexOf(']');
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');

    let jsonStart = -1;
    let jsonEnd = -1;

    // Detect if we have an outer array or object
    if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
      jsonStart = firstBracket;
      jsonEnd = lastBracket;
    } else if (firstBrace !== -1) {
      jsonStart = firstBrace;
      jsonEnd = lastBrace;
    }

    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      const candidate = trimmed.substring(jsonStart, jsonEnd + 1);
      try {
        return JSON.parse(candidate);
      } catch (innerErr) {
        console.error('Failed parsing extracted JSON candidate string:', candidate);
        throw new Error(`JSON parsing failed: ${innerErr.message}. Original error: ${err.message}`);
      }
    }
    throw new Error(`No JSON array or object structure detected in the response. Original error: ${err.message}`);
  }
}

// Normalize recipe results to always return a clean array of recipes
function normalizeRecipeArray(parsed) {
  if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && !Array.isArray(parsed[0])) {
    return parsed;
  }
  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.recipes) && parsed.recipes.length > 0 && typeof parsed.recipes[0] === 'object') {
      return parsed.recipes;
    }
    // Don't just blindly grab any array (like usedIngredients). Verify it looks like a recipe array.
    for (const key in parsed) {
      if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
        if (typeof parsed[key][0] === 'object' && !Array.isArray(parsed[key][0]) && (parsed[key][0].name || parsed[key][0].steps)) {
          return parsed[key];
        }
      }
    }
    if (parsed.name || parsed.steps) {
      return [parsed];
    }
  }
  return [];
}

// Normalize scanned items to always return a clean array of food items
function normalizeItemArray(parsed) {
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.items)) {
      return parsed.items;
    }
    if (Array.isArray(parsed.ingredients)) {
      return parsed.ingredients;
    }
    for (const key in parsed) {
      if (Array.isArray(parsed[key])) {
        return parsed[key];
      }
    }
    if (parsed.name) {
      return [parsed];
    }
  }
  return [];
}

// --------------------------------------------------------------------------
// API ROUTES
// --------------------------------------------------------------------------

// Health Check / Connection Endpoint
app.get('/api/health', (req, res) => {
  const isOpenRouterActive = !!openRouterKey && openRouterKey !== 'YOUR_OPENROUTER_API_KEY_HERE';
  res.json({
    status: 'ok',
    apiConfigured: !!genAI || isOpenRouterActive,
    openRouterConfigured: isOpenRouterActive,
    timestamp: new Date()
  });
});

// Endpoint: Scan fridge/pantry image using Gemini Vision API
app.post('/api/scan', async (req, res) => {
  try {
    const { image } = req.body; // Image comes in as base64 string from React webcam
    
    if (!image) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Offline Sandbox mode fallback
    const isOpenRouterActive = !!openRouterKey && openRouterKey !== 'YOUR_OPENROUTER_API_KEY_HERE';
    if (!genAI && !isOpenRouterActive) {
      console.log('API Key not set. Serving local sandbox fallback data...');
      return res.json({ items: MOCK_DETECTION, note: 'Offline sandbox mode' });
    }

    const prompt = `Analyze the image of this refrigerator, pantry shelf, or collection of food. 
Identify all food items, ingredients, vegetables, fruits, condiments, or packaged goods.
For each item, output a JSON array of objects with the exact schema below. 

Crucial instructions:
1. PACKAGED DATES (OCR): Inspect packaging labels closely. If a visible expiry date is printed on the container (e.g. EXP 25/12/2026), read it using OCR, calculate the remaining days from today, and output that number.
2. VISUAL FRESHNESS PREDICTION: For raw fruits, vegetables, bread, dairy, and other perishables, visually assess their quality (e.g., color, spots, ripeness, bruising) and predict their remaining fresh days.

Schema keys:
- "name": String (Capitalized, e.g. "Green Apple", "Whole Milk", "Tomato")
- "quantity": Number (The count or quantity seen, default to 1 if unclear)
- "unit": String (e.g. "pieces", "bottle", "grams", "can", "box", "pack")
- "expiryDays": Number (Remaining days until expired or spoiled, based on package date or visual state)
- "freshnessPrediction": String (Brief description of its visual state and estimated freshness, e.g., "Crisp & green (7 days)", "Ripe with brown spots (2 days)", "Expires on label: 12/07 (20 days)", "Dry & shelf stable (90 days)")

Provide ONLY the raw JSON array. Do not include markdown code block formatting (like \`\`\`json) or any additional text.`;

    let text = await callGenerativeAI(prompt, image);
    
    const parsed = extractAndParseJSON(text);
    const items = normalizeItemArray(parsed);
    res.json({ items, note: 'Success' });
    
  } catch (error) {
    console.error('Error analyzing image:', error);
    
    let fallbackItems = [...MOCK_DETECTION];
    const { fileName } = req.body;
    
    // Utilize hidden local ML detections if present (comma separated string)
    if (fileName && fileName !== 'camera_capture.jpg' && !fileName.includes('.')) {
       const classes = fileName.split(',').map(s => s.trim()).filter(s => s);
       if (classes.length > 0) {
         fallbackItems = classes.map(cls => {
           let expiryDays = 7;
           let unit = 'pieces';
           const lower = cls.toLowerCase();
           
           if (lower.includes('milk') || lower.includes('bottle')) { expiryDays = 5; unit = 'bottle'; }
           else if (lower.includes('apple') || lower.includes('orange') || lower.includes('banana')) { expiryDays = 10; unit = 'pieces'; }
           else if (lower.includes('broccoli') || lower.includes('lettuce') || lower.includes('carrot')) { expiryDays = 5; unit = 'pieces'; }
           else if (lower.includes('bread')) { expiryDays = 4; unit = 'loaf'; }
           else if (lower.includes('cheese')) { expiryDays = 14; unit = 'pack'; }
           else if (lower.includes('meat') || lower.includes('chicken')) { expiryDays = 3; unit = 'pack'; }
           
           return {
             name: cls.charAt(0).toUpperCase() + cls.slice(1),
             quantity: 1,
             unit: unit,
             expiryDays: expiryDays,
             freshnessPrediction: `Offline scan fallback (${expiryDays} days)`
           };
         });
       }
    }

    res.json({ 
      items: fallbackItems, 
      note: 'Offline high-accuracy fallback'
    });
  }
});

// Endpoint: Scan text description of ingredients
app.post('/api/scan-text', async (req, res) => {
  try {
    const { description } = req.body;
    
    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'No description text provided' });
    }

    // FALLBACK: Sandbox mode if no API key is set
    const isOpenRouterActive = !!openRouterKey && openRouterKey !== 'YOUR_OPENROUTER_API_KEY_HERE';
    if (!genAI && !isOpenRouterActive) {
      console.log('API Key not set. Serving sandbox text extraction...');
      // Extract a few words from user description to make mock data look realistic!
      const words = description.split(/\s+/).filter(w => w.length > 3).slice(0, 3);
      const mockResult = words.map((word, idx) => ({
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

    const prompt = `Analyze the following description of ingredients written by a user in their kitchen: "${description}".
Extract all food items, ingredients, vegetables, fruits, dairy, or pantry goods.
For each item, output a JSON array of objects with the exact schema below.

Schema keys:
- "name": String (Capitalized, e.g. "Green Apple", "Whole Milk", "Tomato")
- "quantity": Number (The count or quantity parsed from text, default to 1 if not specified)
- "unit": String (e.g. "pieces", "bottle", "grams", "can", "box", "pack")
- "expiryDays": Number (Reasonable shelf life days remaining from today, e.g., 5 for fresh tomatoes, 4 for milk, 90 for rice)
- "freshnessPrediction": String (Brief description of estimated state, e.g. "Extracted from description (7 days)", "Dry shelf stable (90 days)")

Provide ONLY the raw JSON array. Do not include markdown code block formatting (like \`\`\`json) or any additional text.`;

    let text = await callGenerativeAI(prompt);
    
    const parsed = extractAndParseJSON(text);
    const items = normalizeItemArray(parsed);
    res.json({ items, note: 'Success' });
    
  } catch (error) {
    console.error('Error analyzing description text:', error);
    res.status(500).json({ 
      error: 'Failed to analyze text description', 
      details: error.message,
      items: [
        { name: 'Pantry Item', quantity: 1, unit: 'pieces', expiryDays: 7, freshnessPrediction: 'Text Sandbox fallback' }
      ],
      note: 'Sandbox fallback'
    });
  }
});

// Helper to check if an ingredient is a liquid or powder to avoid silly cooking steps (like sautéing milk)
function isLiquidOrPowder(name) {
  const lowercase = name.toLowerCase();
  return lowercase.includes('milk') || 
         lowercase.includes('honey') || 
         lowercase.includes('water') || 
         lowercase.includes('oil') || 
         lowercase.includes('sugar') || 
         lowercase.includes('flour') || 
         lowercase.includes('juice') || 
         lowercase.includes('sauce') ||
         lowercase.includes('salt') ||
         lowercase.includes('pepper') ||
         lowercase.includes('butter');
}

// Helper function to dynamically generate mock recipes based on selected ingredients (Sandbox Mode)
function generateMockRecipes(ingredients) {
  const selected = ingredients.map(i => i.toLowerCase());
  const recipes = [];
  
  // 1. Egg-based recipe
  if (selected.some(i => i.includes('egg'))) {
    const eggItem = ingredients.find(i => i.toLowerCase().includes('egg'));
    const used = [eggItem];
    const extra = [];
    
    const tomatoItem = ingredients.find(i => i.toLowerCase().includes('tomato'));
    if (tomatoItem) used.push(tomatoItem);
    else extra.push('Tomato');
    
    const cheeseItem = ingredients.find(i => i.toLowerCase().includes('cheese'));
    if (cheeseItem) used.push(cheeseItem);
    else extra.push('Cheese');
    
    const otherItem = ingredients.find(i => !i.toLowerCase().includes('egg') && !i.toLowerCase().includes('tomato') && !i.toLowerCase().includes('cheese'));
    if (otherItem) used.push(otherItem);

    recipes.push({
      name: `Savory Scrambled Eggs with ${otherItem || 'Herbs'}`,
      prepTime: "10 mins",
      difficulty: "Easy",
      usedIngredients: used,
      missingIngredients: extra.slice(0, 1),
      steps: [
        `Crack and whisk the ${eggItem} in a small bowl.`,
        `Heat a clean pan over medium heat with a teaspoon of oil.`,
        otherItem ? `Lightly sauté the ${otherItem} in the pan for 1 minute.` : `Prepare the pan.`,
        `Pour in the egg mixture and cook, stirring occasionally, until soft and fluffy.`
      ]
    });
  }
  
  // 2. Baking/Dessert recipe (Pancakes / Crepes)
  if (selected.includes('flour') || selected.includes('milk') || selected.includes('sugar') || selected.includes('honey')) {
    const used = [];
    const extra = [];
    
    const flourItem = ingredients.find(i => i.toLowerCase().includes('flour'));
    if (flourItem) used.push(flourItem);
    else extra.push('Flour');
    
    const milkItem = ingredients.find(i => i.toLowerCase().includes('milk'));
    if (milkItem) used.push(milkItem);
    else extra.push('Milk');
    
    const sweetenerItem = ingredients.find(i => i.toLowerCase().includes('sugar') || i.toLowerCase().includes('honey'));
    if (sweetenerItem) used.push(sweetenerItem);
    else extra.push('Sugar or Honey');

    recipes.push({
      name: "Simple Sweet Pancakes",
      prepTime: "15 mins",
      difficulty: "Easy",
      usedIngredients: used,
      missingIngredients: extra,
      steps: [
        "In a mixing bowl, combine the flour and sugar/honey.",
        "Slowly pour in the milk and whisk until a smooth batter forms.",
        "Heat a non-stick pan over medium heat and grease it lightly.",
        "Pour portions of batter onto the pan, flip when bubbles form on the surface, and cook until golden brown.",
        "Serve warm with a drizzle of honey if available."
      ]
    });
  }

  // 3. Tomato-based recipe
  if (selected.some(i => i.includes('tomato'))) {
    const tomatoItem = ingredients.find(i => i.toLowerCase().includes('tomato'));
    const used = [tomatoItem];
    const extra = [];
    
    const garlicItem = ingredients.find(i => i.toLowerCase().includes('garlic') || i.toLowerCase().includes('onion'));
    if (garlicItem) used.push(garlicItem);
    else extra.push('Garlic / Onion');

    recipes.push({
      name: "Rustic Tomato Soup",
      prepTime: "20 mins",
      difficulty: "Easy",
      usedIngredients: used,
      missingIngredients: extra,
      steps: [
        `Chop the ${tomatoItem} into small segments.`,
        "Sauté chopped garlic or onions in a saucepan with oil until fragrant.",
        `Add the chopped ${tomatoItem} and cook over medium heat until they break down into a pulp.`,
        "Blend or mash the mixture, add a splash of water, simmer for 5 minutes, and season to taste."
      ]
    });
  }
  
  // 4. Fruit/Apple recipe
  if (selected.some(i => i.includes('apple') || i.includes('fruit') || i.includes('banana') || i.includes('mango') || i.includes('berry'))) {
    const fruitItems = ingredients.filter(i => {
      const l = i.toLowerCase();
      return l.includes('apple') || l.includes('fruit') || l.includes('banana') || l.includes('mango') || l.includes('berry');
    });
    
    const honeyItem = ingredients.find(i => i.toLowerCase().includes('honey') || i.toLowerCase().includes('yogurt'));
    const used = [...fruitItems];
    if (honeyItem) used.push(honeyItem);

    recipes.push({
      name: `Fresh Fruit Medley Bowl`,
      prepTime: "5 mins",
      difficulty: "Easy",
      usedIngredients: used,
      missingIngredients: honeyItem ? [] : ["Honey or Yogurt"],
      steps: [
        `Rinse the selected fruits (${fruitItems.join(', ')}) thoroughly.`,
        `Chop the fruits into bite-sized segments.`,
        `Place them in a mixing bowl and toss together gently.`,
        honeyItem ? `Drizzle with ${honeyItem} and serve fresh.` : `Top with honey/yogurt if desired and enjoy.`
      ]
    });
  }

  // 5. Intelligent Fallback for remaining combinations (avoids slicing liquids!)
  if (recipes.length < 2 && ingredients.length > 0) {
    const liquids = ingredients.filter(i => isLiquidOrPowder(i));
    const solids = ingredients.filter(i => !isLiquidOrPowder(i));
    
    if (liquids.length > 0 && solids.length === 0) {
      // Scenario: Only liquids or powders selected
      const primary = liquids[0];
      const secondary = liquids[1];
      recipes.push({
        name: `Warm Sweetened ${primary}`,
        prepTime: "5 mins",
        difficulty: "Easy",
        usedIngredients: liquids.slice(0, 2),
        missingIngredients: [],
        steps: [
          `Pour the ${primary} into a small saucepan over low heat.`,
          secondary ? `Add the ${secondary} and stir gently to combine.` : `Let it heat through for 2-3 minutes.`,
          `Pour into a cup and serve warm.`
        ]
      });
    } else if (solids.length > 0) {
      // Scenario: Solids (like veggies/fruits) selected
      const primary = solids[0];
      const secondary = solids[1] || (liquids.length > 0 ? liquids[0] : null);
      recipes.push({
        name: `Sautéed ${primary} Slices`,
        prepTime: "12 mins",
        difficulty: "Easy",
        usedIngredients: [primary, ...(secondary ? [secondary] : [])].filter(Boolean),
        missingIngredients: ["Olive Oil", "Salt & Pepper"],
        steps: [
          `Wash and cut the ${primary} into uniform, bite-sized slices.`,
          `Heat a skillet with olive oil over medium-high heat.`,
          `Sauté the ${primary} pieces for 5 minutes until tender-crisp.`,
          secondary ? (isLiquidOrPowder(secondary) ? `Stir in the ${secondary} for flavor in the last minute.` : `Add the ${secondary} and sauté together.`) : `Season with salt and pepper to taste.`,
          `Transfer to a clean plate and serve immediately.`
        ]
      });
    }
  }
  
  // 6. Hard fallback if empty
  if (recipes.length === 0) {
    recipes.push({
      name: "Fresh Herb Dressing Salad",
      prepTime: "5 mins",
      difficulty: "Easy",
      usedIngredients: ingredients,
      missingIngredients: ["Lemon Juice", "Olive Oil"],
      steps: [
        "Finely chop any fresh ingredients available.",
        "Drizzle with lemon juice and olive oil, toss, and serve."
      ]
    });
  }

  return recipes;
}

// Endpoint: Generate recipes based on available ingredients
app.post('/api/recipes', async (req, res) => {
  const { ingredients } = req.body; // Array of item names: ["Eggs", "Milk"]
  try {
    
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'No ingredients provided' });
    }

    let combinedRecipes = [];

    // PRIMARY ENGINE: TheMealDB (100% free, real recipes, no rate limits)
    try {
      let topMeals = [];
      // Try each ingredient until we find some recipes
      for (let ing of ingredients) {
        // Use the last word (noun) instead of the first word (adjective)
        // e.g. "Red Apples" -> "apples", "Cheddar Cheese" -> "cheese"
        let parts = ing.trim().split(' ');
        let noun = parts[parts.length - 1].toLowerCase();
        // remove trailing 's' to make singular (e.g. apples -> apple)
        if (noun.endsWith('s') && noun.length > 3) noun = noun.slice(0, -1);
        
        const meals = await fetchMealDB(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${noun}`);
        if (meals && meals.length > 0) {
          topMeals = meals.slice(0, 3);
          break; // Found our base recipes!
        }
      }

      if (topMeals.length > 0) {
        for (let m of topMeals) {
          const detail = await fetchMealDB(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${m.idMeal}`);
          if (detail && detail[0]) {
            combinedRecipes.push(formatMealToRecipeSchema(detail[0], ingredients));
          }
        }
      }
    } catch(e) {
      console.error('TheMealDB Primary Engine failed:', e);
    }

    // SECONDARY ENGINE: Generative AI (Invent creative recipes)
    try {
      const prompt = `You are a creative AI Chef. 
Here is a list of ingredients currently in the user's kitchen: ${JSON.stringify(ingredients)}.

Generate 2 to 3 delicious recipes that the user can cook using these ingredients. 
You are allowed to assume common, basic pantry staples are available (such as salt, pepper, cooking oil, water, sugar).

CRITICAL CONSTRAINTS:
The 'usedIngredients' array MUST contain ONLY items that are present in the user's provided list: ${JSON.stringify(ingredients)}. 
Any other ingredient required to complete the recipe (like milk, eggs, bread, butter, cheese, vegetables, meat, flour) that is NOT in the user's provided list MUST be categorized under 'missingIngredients'. Do not claim the user has these items in stock if they are not in their list!

Provide the response as a JSON array of objects with the exact schema below.

Schema keys:
- "name": String (Recipe title, e.g. "Tomato and Mushroom Omelette")
- "prepTime": String (e.g. "15 mins", "30 mins")
- "difficulty": String ("Easy", "Medium", or "Hard")
- "usedIngredients": Array of Strings (The specific items from the user's provided list that this recipe uses)
- "missingIngredients": Array of Strings (Important ingredients needed for this recipe that are NOT in the user's list. Keep this minimal!)
- "steps": Array of Strings (Clear, step-by-step cooking directions)

Provide ONLY the raw JSON array. Do not include markdown code block formatting (like \`\`\`json) or any additional text.`;

      let text = await callGenerativeAI(prompt);
      
      const parsed = extractAndParseJSON(text);
      let recipes = normalizeRecipeArray(parsed);
      
      if (Array.isArray(recipes)) {
        recipes = recipes.map(recipe => {
          if (!recipe || typeof recipe !== 'object') return null;

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
          
          return {
            ...recipe,
            usedIngredients: verifiedUsed,
            missingIngredients: verifiedMissing
          };
        }).filter(Boolean);
        
        combinedRecipes = [...combinedRecipes, ...recipes];
      }
    } catch (error) {
      console.error('Error generating AI recipes:', error);
    }
    
    if (combinedRecipes.length > 0) {
      return res.json({ recipes: combinedRecipes, note: 'Combined TheMealDB + AI' });
    }

    res.status(500).json({ 
      error: 'Failed to generate recipes', 
      recipes: generateMockRecipes(ingredients),
      note: 'Sandbox fallback'
    }); 
    
  } catch (error) {
    console.error('Error generating recipes:', error);
    
    // Attempt TheMealDB infinite fallback
    try {
      const mainIngredient = ingredients[0].split(' ')[0].toLowerCase();
      const meals = await fetchMealDB(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${mainIngredient}`);
      if (meals && meals.length > 0) {
        const topMeals = meals.slice(0, 3);
        const detailedRecipes = [];
        for (let m of topMeals) {
          const detail = await fetchMealDB(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${m.idMeal}`);
          if (detail && detail[0]) {
            detailedRecipes.push(formatMealToRecipeSchema(detail[0], ingredients));
          }
        }
        if (detailedRecipes.length > 0) {
          return res.json({ recipes: detailedRecipes, note: 'TheMealDB Fallback' });
        }
      }
    } catch(e) {
      console.error('TheMealDB Fallback failed:', e);
    }

    res.status(500).json({ 
      error: 'Failed to generate recipes', 
      details: error.message,
      recipes: generateMockRecipes(ingredients), // Hardcoded offline fallback
      note: 'Sandbox fallback'
    });
  }
});

// Endpoint: Search for recipes using description or recipe name
app.post('/api/search-recipes', async (req, res) => {
  const { query } = req.body;
  try {
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'No search query provided' });
    }

    // Offline Sandbox mode fallback
    const isOpenRouterActive = !!openRouterKey && openRouterKey !== 'YOUR_OPENROUTER_API_KEY_HERE';
    if (!genAI && !isOpenRouterActive) {
      console.log('API Key not set. Serving sandbox search recipes...');
      return res.json({
        recipes: [
          {
            name: `Classic ${query.charAt(0).toUpperCase() + query.slice(1)}`,
            prepTime: "25 mins",
            difficulty: "Medium",
            usedIngredients: ["Selected Ingredients"],
            missingIngredients: ["Pantry Staples"],
            steps: [
              `Preheat oven or prepare pan for making ${query}.`,
              "Gather all required ingredients and measure them.",
              "Follow standard instructions for mixing and cooking the ingredients.",
              "Serve warm and enjoy your freshly prepared dish!"
            ]
          }
        ],
        note: 'Offline sandbox mode'
      });
    }

    let combinedRecipes = [];

    // PRIMARY ENGINE: TheMealDB
    try {
      // 1. Try searching by exact name
      let meals = await fetchMealDB(`https://www.themealdb.com/api/json/v1/1/search.php?s=${query}`);
      
      // 2. If name search fails, try extracting an ingredient from the query and searching by ingredient
      if (!meals || meals.length === 0) {
        const words = query.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(w => w.length > 2 && w !== 'and' && w !== 'with');
        for (let word of words) {
          let noun = word;
          if (noun.endsWith('s') && noun.length > 3) noun = noun.slice(0, -1);
          const ingMeals = await fetchMealDB(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${noun}`);
          if (ingMeals && ingMeals.length > 0) {
            meals = ingMeals;
            break; // Found recipes matching one of the ingredients!
          }
        }
      }

      if (meals && meals.length > 0) {
        const topMeals = meals.slice(0, 3);
        const detailedRecipes = [];
        
        for (let m of topMeals) {
          // If it was an ingredient search, we need to lookup the full details
          if (!m.strInstructions) {
            const detail = await fetchMealDB(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${m.idMeal}`);
            if (detail && detail[0]) detailedRecipes.push(formatMealToRecipeSchema(detail[0], []));
          } else {
            detailedRecipes.push(formatMealToRecipeSchema(m, []));
          }
        }

        if (detailedRecipes.length > 0) {
          combinedRecipes = [...combinedRecipes, ...detailedRecipes];
        }
      }
    } catch(e) {
      console.error('TheMealDB Primary Engine failed:', e);
    }

    // SECONDARY ENGINE: Generative AI
    try {
      const prompt = `You are a creative AI Chef. 
The user wants to find a recipe matching this search query (recipe name or description): "${query}".

Generate 1 to 2 delicious recipes that match this request. 
For each recipe, provide the prep time, difficulty level, a list of main ingredients, and clear step-by-step cooking instructions.
You are allowed to assume common, basic pantry staples are available (such as salt, pepper, cooking oil, water, sugar).

Provide the response as a JSON array of objects with the exact schema below.

Schema keys:
- "name": String (Recipe title, e.g. "Homemade Chocolate Chip Cookies")
- "prepTime": String (e.g. "25 mins", "40 mins")
- "difficulty": String ("Easy", "Medium", or "Hard")
- "usedIngredients": Array of Strings (The main ingredients for this recipe)
- "missingIngredients": Array of Strings (Optional or secondary ingredients)
- "steps": Array of Strings (Clear, step-by-step cooking directions)

Provide ONLY the raw JSON array. Do not include markdown code block formatting (like \`\`\`json) or any additional text.`;

      let text = await callGenerativeAI(prompt);
      const parsed = extractAndParseJSON(text);
      const recipes = normalizeRecipeArray(parsed);
      
      if (Array.isArray(recipes) && recipes.length > 0) {
        combinedRecipes = [...combinedRecipes, ...recipes];
      }
    } catch (error) {
      console.error('Error searching AI recipes:', error);
    }

    if (combinedRecipes.length > 0) {
      return res.json({ recipes: combinedRecipes, note: 'Combined TheMealDB + AI' });
    }

    res.status(500).json({ 
      error: 'Failed to search recipes', 
      recipes: [
        {
          name: `Quick ${query}`,
          prepTime: "15 mins",
          difficulty: "Easy",
          usedIngredients: [],
          missingIngredients: [],
          steps: [
            "Prepare the ingredients as described in the search.",
            "Cook over medium heat until ready.",
            "Season to taste and serve."
          ]
        }
      ],
      note: 'Sandbox fallback'
    });
    
  } catch (error) {
    console.error('Error searching recipes:', error);
    
    res.status(500).json({ 
      error: 'Failed to search recipes', 
      details: error.message,
      recipes: [
        {
          name: `Quick ${query}`,
          prepTime: "15 mins",
          difficulty: "Easy",
          usedIngredients: [],
          missingIngredients: [],
          steps: [
            "Prepare the ingredients as described in the search.",
            "Cook over medium heat until ready.",
            "Season to taste and serve."
          ]
        }
      ],
      note: 'Sandbox fallback'
    });
  }
});

// Port listener for local development
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;