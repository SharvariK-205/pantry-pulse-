# pantry-pulse-
A smart, zero-waste pantry tracker utilizing Gemini 2.5 Flash.
# 🍳 PantryPulse: Smart Zero-Waste Pantry Tracker

An intelligent inventory system designed to minimize food waste. **PantryPulse** tracks your ingredients, flags items nearing expiration, and utilizes **Gemini 2.5 Flash** to automatically generate chef-crafted, zero-waste recipes using what you already have.

---

## 🚀 Features
* **Visual Risk Scoring:** Automatically highlights expiring ingredients as "High Risk" based on custom thresholds.
* **AI Recipe Generation:** Powered by the official `@google/genai` SDK to dynamically spin up unique recipes using expiring elements.
* **Flexible Architecture:** Fully functional via a lightweight React/TypeScript frontend served by Express, featuring an alternate Python Streamlit prototype build.

---

## 🛠️ Tech Stack & Architecture

### Web Application (Primary)
* **Frontend:** React 19, TypeScript, Tailwind CSS, Motion
* **Tooling:** Vite
* **Backend Runtime:** Node.js, Express, TSX (TypeScript Execute)
* **AI Integration:** Google GenAI SDK (`gemini-2.5-flash`)

### Rapid Prototype Build
* **Dashboard Framework:** Streamlit (Python 3.9+)

---

## 💻 How to Run This Project Locally

To test this application on your computer, ensure you have [Node.js](https://nodejs.org/) installed, then follow these steps:

### 1. Download and Extract
1. Download the code files from this repository.
2. Open your computer's terminal and navigate into the project directory:
   ```bash
   cd path/to/pantry-pulse
