# 🍳 GCIS: Generative Culinary Intelligence System

*(Formerly known as SmartPantry)*

Hey there! 👋 Welcome to my project. 

I built GCIS because I realized I was throwing away way too much expired food every week just because I lost track of what was sitting in the back of my fridge. I wanted to build a full-stack web app that not only acts as a digital inventory for your kitchen, but actively helps you use up your ingredients by intelligently suggesting recipes.

## 🛠️ The Tech Stack (and why I chose it)

- **Frontend**: React (SPA) + Vite. I went with Vite because it's blazing fast compared to traditional bundlers and keeps the development environment snappy.
- **Styling**: Pure CSS! I purposely avoided Tailwind CSS or Bootstrap here because I really wanted to challenge myself to build a premium, glassmorphic UI system entirely from scratch using modern CSS variables. 
- **Backend**: Node.js & Express. I chose Node to keep the entire stack in JavaScript, allowing for a seamless serverless deployment on Vercel.
- **Computer Vision**: Google Gemini API (`gemini-1.5-flash`). I integrated Gemini to handle the image parsing so you can literally just upload a photo of your fridge, and the vision model will extract the ingredients and estimate their shelf life without needing complex local OCR pipelines.
- **Recipe Engine**: A hybrid culinary engine using **TheMealDB** as a highly stable, limitless primary source, with an **OpenRouter Generative AI** fallback to creatively invent recipes when standard ones aren't found.

## 🚀 Key Features

1. **Visual Pantry Scanner**: You can upload a photo of your fridge or take a snapshot with your webcam. The vision model automatically detects food items, categorizes them, and logs them into your digital inventory.
2. **Kitchen Health Score**: A custom, mathematically-driven radial gauge that gives your kitchen a real-time "Freshness Score." Expired items hurt your score, encouraging you to consume responsibly and save money.
3. **Hallucination-Proof Recipe Generation**: You check off what you want to cook, and the system cross-references your inventory to build a recipe. If the AI suggests ingredients you don't actually have, my custom backend filter catches it and explicitly flags them as "Missing Ingredients."
4. **Waste Log Tracking**: Automatically tracks items that expire, helping you visualize where you are losing money on spoiled food.

## 💻 Running it Locally

If you want to spin this up on your own machine:

1. Clone the repo: `git clone https://github.com/abhijeetjanbandhu123/Generative-Culinary-Intelligence-System-GCIS-.git`
2. Install the dependencies: `npm install`
3. Create a `.env` file in the root folder and drop your API Keys in (`GEMINI_API_KEY` and optionally `OPENROUTER_API_KEY`).
4. Start the dev server: `npm run dev`

---
*Built with ❤️ to make kitchens smarter and cooking easier.*
