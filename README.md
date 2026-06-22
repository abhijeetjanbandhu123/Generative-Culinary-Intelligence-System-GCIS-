# SmartPantry: Visual Food Tracker & Recipe Suggester

SmartPantry is our final-year college project. We built it to solve a problem we deal with every single week: household food waste. It is a full-stack web app that catalogs what is in your fridge using image recognition, tracks expiry dates, and suggests meals using only the ingredients you have on hand.

---

## 🛠️ The Tech Stack (and why we chose it)

- **Frontend**: React (SPA) + Vite. We went with Vite because it is much faster than Create React App and doesn't clutter our project.
- **Styling**: Vanilla CSS. We actually avoided Tailwind CSS here because we wanted full control over the glassmorphic blur effects and custom radial gauges without fighting a utility framework.
- **Backend**: Node.js & Express. Initially we thought about Python for OCR and vision, but running two separate servers made monorepo deployment on Vercel a nightmare. Consolidating everything under Node using the official Google SDK kept things incredibly clean.
- **AI Integrations**: Google Gemini API (`gemini-1.5-flash`). It handles both image parsing and text extraction in one model, which saved us from writing custom OCR code.
- **Hosting**: Unified Vercel serverless deployment.

---

## 🚀 Key Features & Design Choices

1. **Visual Scanner (with Backup)**: You can upload a photo of your fridge or take a snapshot with your webcam. We realized mid-way that local webcam streams can be finicky on some browsers due to HTTPS permissions, so adding the drag-and-drop file upload was a lifesaver.
2. **Pantry Health Score**: A simple radial gauge that rates how fresh your kitchen is. Expired items deduct roughly 25 points and expiring items deduct 10. We chose a simple mathematical deduction rather than a heavy database weight algorithm to keep loading speeds snappy.
3. **Hallucination-Proof Recipe Builder**: You check off what you want to cook. During our testing, the AI model frequently recommended dishes containing ingredients we didn't have (like cheese or broccoli). To prevent this, we wrote a custom backend filter that forces the AI's suggestions to conform strictly to the user's checklist.
4. **Offline Sandbox Mode**: If your API key is missing or the free-tier quota is throttled, the server automatically defaults to simulated recognition and mock recipes. This guarantees the app won't crash during a live presentation.

---

## 💻 Running the App Locally

### Prerequisites
You need **Node.js** (version 18+). You can grab it from [nodejs.org](https://nodejs.org/).

### Step 1: Open project in VS Code
Open VS Code, click `File > Open Folder`, and select the `smart-pantry` directory.

### Step 2: Install packages
Open your terminal in VS Code (`Ctrl + ~`) and run:
```bash
npm install
```

### Step 3: Configure your API Key
1. Open the `.env` file in the root folder.
2. Replace `YOUR_GEMINI_API_KEY_HERE` with your actual key from [Google AI Studio](https://aistudio.google.com/).
3. Save the file. (If you don't have a key, it's fine—the app will run in local database sandbox mode instead).

### Step 4: Launch Dev Server
In the terminal, run:
```bash
npm run dev
```
Vite runs the frontend on port `5173`, and Express runs the backend on port `3000` concurrently. Open your browser and head to:
👉 **`http://localhost:5173`**

---

## 🎓 College Viva / Project Q&A Guide

Here is roughly how to explain the code when the examiner asks questions:

### 1. How does the monorepo work on Vercel?
"Instead of running a separate frontend host and backend API, we structured this as a monorepo. The React frontend is under the `src` folder, and the Express endpoints live in the `api` folder. We configured `vercel.json` to proxy `/api/*` requests to the Express serverless functions. This lets us deploy the entire codebase in one git push."

### 2. How did you handle webcam acquisition?
"We used the native HTML5 `navigator.mediaDevices.getUserMedia` API to stream video to a `<video>` element. When the user snaps a picture, we draw that video frame to an offscreen canvas, export it as a base64 Data URL, and post it to our `/api/scan` route."

### 3. How do you prevent API key leaks?
"We never call the Gemini API directly from the browser. The frontend only talks to our Express server. The server reads the API key securely from server-side environment variables (`process.env.GEMINI_API_KEY`) and communicates with Google. This prevents users from inspecting our frontend build and stealing our keys."

### 4. What happens when the AI returns ingredients we don't have?
"We noticed this bug early on. To solve it, we built a post-processing filter on the backend inside the `/api/recipes` route. Before sending the recipes to the user, the server iterates through `usedIngredients` and double-checks them against the request payload. If a returned ingredient isn't on the list, it's immediately shifted to `missingIngredients`."
