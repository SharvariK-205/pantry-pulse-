import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// API Route for recipe generation
app.post("/api/generate-recipes", async (req, res) => {
  try {
    const { ingredients, customApiKey } = req.body;

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: "No ingredients provided to cook with." });
    }

    // Resolve API key in order of priority: 
    // 1. User specified key from the client-side input
    // 2. Secret key stored in system environment variables (Settings > Secrets)
    const apiKey = (customApiKey && customApiKey.trim() !== "") 
      ? customApiKey.trim() 
      : process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      return res.status(400).json({ 
        error: "Google AI Studio API Key is missing. Please paste your API Key in the sidebar or configure it in the application settings." 
      });
    }

    // Initialize the new Google GenAI client
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const ingredientsList = ingredients.map(
      (item) => `- ${item.name} (${item.category}, expires on ${item.expirationDate})`
    ).join("\n");

    const prompt = `You are a professional zero-waste master chef. Your mission is to create exactly 3 delicious, creative recipes that maximize the use of the ingredients, prioritizing those closest to their expiration date to reduce food waste.

Here are the available pantry ingredients:
${ingredientsList}

Please return the response as a clean, beautifully-structured Markdown layout.
Provide:
1. An encouraging, friendly introductory sentence.
2. Exactly 3 recipes. For each recipe, provide:
   - A descriptive, creative name (e.g. "🍳 Crispy Pan-Seared Tofu & Veggie medley").
   - A "Zero-Waste Saving" status (explaining which expiring ingredients were rescued).
   - "Prep & Cook Time".
   - "Ingredients Needed" (including amounts and highlight which are optional or pantry-staple substitutions).
   - "Simple Step-by-Step Instructions".
3. A short Chef's Pro-Tip on pantry organization or food preservation.

Make the output feel professional, warm, engaging, and highly scannable to view!`;

    // Use gemini-2.5-flash as requested by the user, representing the new stable flash model
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    res.json({ recipeMarkdown: response.text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ 
      error: error.message || "Failed to communicate with Gemini AI. Double-check your API key and network connection." 
    });
  }
});

async function startServer() {
  // Vite integration 
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PantryPulse server listening at http://localhost:${PORT}`);
  });
}

startServer();
