import React, { useState, useEffect, useMemo } from "react";
import { 
  Trash2, 
  Key, 
  AlertTriangle, 
  CheckCircle, 
  Plus, 
  Sparkles, 
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Eye,
  EyeOff,
  ShoppingBag
} from "lucide-react";

// Types for core structures
interface Ingredient {
  id: string;
  name: string;
  category: string;
  expirationDate: string;
}

const CATEGORIES = [
  "Produce", 
  "Dairy", 
  "Meat & Seafood", 
  "Pantry Staples", 
  "Bakery", 
  "Frozen Foods", 
  "Beverages",
  "Other"
];

// Default starting ingredients matching the Python Streamlit applet
const DEFAULT_INGREDIENTS = [
  { 
    id: "1", 
    name: "Whole Milk", 
    category: "Dairy", 
    expirationDate: getRelativeDateString(2) 
  },
  { 
    id: "2", 
    name: "Fresh Spinach", 
    category: "Produce", 
    expirationDate: getRelativeDateString(1) 
  },
  { 
    id: "3", 
    name: "Ripe Bananas", 
    category: "Produce", 
    expirationDate: getRelativeDateString(6) 
  },
  { 
    id: "4", 
    name: "Chicken Breasts", 
    category: "Meat & Seafood", 
    expirationDate: getRelativeDateString(5) 
  }
];

function getRelativeDateString(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split("T")[0];
}

export default function App() {
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => {
    const saved = localStorage.getItem("pantry_inventory");
    return saved ? JSON.parse(saved) : DEFAULT_INGREDIENTS;
  });

  const [customApiKey, setCustomApiKey] = useState(() => {
    return localStorage.getItem("pantry_api_key") || "";
  });

  const [showApiKey, setShowApiKey] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Produce");
  const [expirationDate, setExpirationDate] = useState(() => getRelativeDateString(5));

  // AI states
  const [loading, setLoading] = useState(false);
  const [recipeMarkdown, setRecipeMarkdown] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // Sync state with localStorage
  useEffect(() => {
    localStorage.setItem("pantry_inventory", JSON.stringify(ingredients));
  }, [ingredients]);

  useEffect(() => {
    localStorage.setItem("pantry_api_key", customApiKey);
  }, [customApiKey]);

  // Compute days until expiration for any given date
  const getDaysLeft = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(dateStr);
    expDate.setHours(0, 0, 0, 0);
    const diffTime = expDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Determine High Risk status (expires in <= 3 days)
  const isHighRisk = (dateStr: string) => {
    const daysLeft = getDaysLeft(dateStr);
    return daysLeft <= 3;
  };

  // Calculate high risk count
  const highRiskCount = useMemo(() => {
    return ingredients.filter(item => isHighRisk(item.expirationDate)).length;
  }, [ingredients]);

  // Action: Add ingredient
  const handleAddIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newItem: Ingredient = {
      id: Date.now().toString(),
      name: name.trim(),
      category: category,
      expirationDate: expirationDate
    };

    setIngredients(prev => [newItem, ...prev]);
    setName("");
    // Reset date to +5 days by default
    setExpirationDate(getRelativeDateString(5));
  };

  // Action: Delete ingredient
  const handleDeleteIngredient = (id: string) => {
    setIngredients(prev => prev.filter(item => item.id !== id));
  };

  // Action: Reset defaults
  const handleResetDefaults = () => {
    if (confirm("Reset pantry back to default sample ingredients?")) {
      setIngredients(DEFAULT_INGREDIENTS);
      setRecipeMarkdown(null);
      setErrorStatus(null);
    }
  };

  // Run Chef API call
  const generateZeroWasteRecipes = async () => {
    if (ingredients.length === 0) {
      setErrorStatus("Your kitchen is empty. Please add some ingredients to generate recipes!");
      return;
    }

    setLoading(true);
    setErrorStatus(null);
    setRecipeMarkdown(null);

    try {
      const response = await fetch("/api/generate-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: ingredients.map(item => ({
            name: item.name,
            category: item.category,
            expirationDate: item.expirationDate
          })),
          customApiKey: customApiKey
        })
      });

      const bodyData = await response.json();

      if (!response.ok) {
        throw new Error(bodyData.error || "Failed to generate recipes from the chef server.");
      }

      setRecipeMarkdown(bodyData.recipeMarkdown);
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || "An error occurred while calling the recipe server.");
    } finally {
      setLoading(false);
    }
  };

  // Simple, elegant HTML formatting for Markdown presentation in React
  const formatMarkdownToHTML = (text: string) => {
    return text
      .split("\n")
      .map((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("###")) {
          return `<h4 class="text-lg font-bold text-slate-800 mt-5 mb-2">${trimmed.replace(/^###\s*/, "")}</h4>`;
        }
        if (trimmed.startsWith("##")) {
          return `<h3 class="text-xl font-bold text-indigo-700 mt-6 mb-3 border-b border-indigo-100 pb-1">${trimmed.replace(/^##\s*/, "")}</h3>`;
        }
        if (trimmed.startsWith("#")) {
          return `<h2 class="text-2xl font-extrabold text-indigo-900 mt-8 mb-4">${trimmed.replace(/^#\s*/, "")}</h2>`;
        }
        if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
          return `<li class="ml-5 list-disc text-slate-600 my-1">${trimmed.replace(/^[-*]\s*/, "")}</li>`;
        }
        if (trimmed.match(/^\d+\./)) {
          return `<li class="ml-5 list-decimal text-slate-600 my-1">${trimmed.replace(/^\d+\.\s*/, "")}</li>`;
        }
        if (trimmed === "" || trimmed === "---") {
          return trimmed === "---" ? `<hr class="my-4 border-slate-200" />` : `<div class="h-2"></div>`;
        }
        return `<p class="my-1 text-slate-700 leading-relaxed">${line}</p>`;
      })
      .join("\n");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col md:flex-row relative">
      {/* Streamlit Top Accent Indicator */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-emerald-500 z-50 animate-pulse" />

      {/* Sidebar: Configuration & Navigation (High Density representation) */}
      <aside className="w-full md:w-72 bg-slate-900 text-slate-300 flex flex-col p-6 shadow-2xl shrink-0 z-40 pt-10">
        <div className="flex items-center gap-3 mb-8 text-white">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <span className="text-xl">🍳</span>
          </div>
          <div>
            <span className="text-2xl font-black tracking-tight block">PantryPulse</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block">Smart AI Assistant</span>
          </div>
        </div>

        <div className="space-y-6 flex-1">
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-3">
              Google AI Studio SDK Settings
            </label>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Google AI Studio API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    placeholder="sk-gemini-v2-px7892..."
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-slate-800 transition-all pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-2.5 text-slate-500 hover:text-slate-300 focus:outline-none"
                  >
                    {showApiKey ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                <p className="text-[10px] mt-2 text-slate-500 leading-relaxed">
                  gemini-2.5-flash will execute recipe generation locally.
                </p>
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-3">
              Local Database
            </label>
            <div className="flex items-center gap-3 px-3 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-semibold border border-emerald-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Inventory Active Board
            </div>
            <div className="text-[11px] text-slate-400 px-3 py-1 bg-slate-800/40 border border-slate-800/80 rounded mt-3 leading-snug">
              <span className="font-bold text-amber-400 block mb-0.5">📂 Python Engine File:</span>
              Streamlit script is generated and saved as <strong className="font-mono text-slate-200">/pantry pulse.py</strong>.
            </div>
          </nav>
        </div>

        {/* Sidebar Status Footer */}
        <div className="mt-auto pt-6 border-t border-slate-800">
          <div className="flex items-center justify-between text-[11px] font-medium">
            <span className="text-slate-500 uppercase tracking-wider font-bold">Status</span>
            <span className="text-emerald-500 flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Connected
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-6 md:p-8 overflow-y-auto max-w-6xl w-full mx-auto">
        
        {/* Top Header & Stats (High Density styled layout) */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Kitchen Inventory</h1>
            <p className="text-slate-500 text-sm mt-1">Tracking local session state for real-time zero-waste pantry management.</p>
          </div>
          <div className="flex flex-row gap-4">
            <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm min-w-[110px]">
              <span className="text-slate-400 text-[10px] font-bold uppercase block tracking-wider">High Risk</span>
              <div className="text-xl font-black text-red-650 font-sans text-red-600 mt-1">
                {String(highRiskCount).padStart(2, '0')} Items
              </div>
            </div>
            <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm min-w-[110px]">
              <span className="text-slate-400 text-[10px] font-bold uppercase block tracking-wider">Total Count</span>
              <div className="text-xl font-black text-slate-950 mt-1">
                {String(ingredients.length).padStart(2, '0')} Items
              </div>
            </div>
            <button
              onClick={handleResetDefaults}
              className="px-3.5 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-800 text-slate-500 flex items-center justify-center transition-all shadow-sm"
              title="Reset configuration defaults"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </header>

        {/* Quick Action Intake Form */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
          <form onSubmit={handleAddIngredient} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="col-span-1 md:col-span-5">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">
                Ingredient Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Fresh Mango, Tofu pack, Greek Yogurt"
                className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all"
              />
            </div>
            
            <div className="col-span-1 md:col-span-3">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">
                Category
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all appearance-none"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">
                Expiration Date
              </label>
              <input
                type="date"
                required
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-slate-700"
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <button
                type="submit"
                className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-slate-850 hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
              >
                Add Item
              </button>
            </div>
          </form>
        </section>

        {/* High Density Table */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">
              CURRENT KITCHEN STOCK
            </h2>
            
            <button
              type="button"
              disabled={loading || ingredients.length === 0}
              onClick={generateZeroWasteRecipes}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                  Analyzing Menu...
                </>
              ) : (
                <>
                  <Sparkles size={13} className="text-emerald-100" />
                  Generate Smart Recipes
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto">
            {ingredients.length === 0 ? (
              <div className="p-10 text-center bg-white space-y-3">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400 border border-slate-100">
                  <ShoppingBag size={20} />
                </div>
                <p className="text-slate-600 text-sm font-semibold">Your pantry index is empty!</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Insert items above or click the "Reset Defaults" cycle to fill standard ingredients.
                </p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50/80 sticky top-0 backdrop-blur-md">
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="px-8 py-3">Ingredient</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Expiry countdown</th>
                    <th className="px-6 py-3">Waste Risk Status</th>
                    <th className="px-8 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-50">
                  {ingredients.map((item) => {
                    const daysLeft = getDaysLeft(item.expirationDate);
                    const risk = isHighRisk(item.expirationDate);

                    return (
                      <tr 
                        key={item.id} 
                        className={`transition-colors group ${
                          risk 
                            ? "bg-red-50/40 hover:bg-red-50/60" 
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="px-8 py-4 font-bold text-slate-800 italic">
                          {item.name}
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-medium">
                          {item.category}
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-medium">
                          {daysLeft < 0 ? (
                            <span className="text-red-600 font-bold">
                              Expired {Math.abs(daysLeft)} {Math.abs(daysLeft) === 1 ? 'day' : 'days'} ago
                            </span>
                          ) : daysLeft === 0 ? (
                            <span className="text-orange-600 font-extrabold flex items-center gap-1">
                              Expires Today! ⚠️
                            </span>
                          ) : (
                            <span>
                              {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                              <span className="text-[10px] text-slate-400 block font-normal">
                                ({new Date(item.expirationDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})})
                              </span>
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {risk ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-red-600 text-white uppercase tracking-wider">
                              High Risk
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-500 uppercase tracking-wider">
                              Stable
                            </span>
                          )}
                        </td>
                        <td className="px-8 py-4 text-right">
                          <button
                            onClick={() => handleDeleteIngredient(item.id)}
                            className="bg-transparent border-0 text-slate-400 group-hover:text-red-500 font-bold text-xs transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Recipe Display area */}
        {(loading || recipeMarkdown || errorStatus) && (
          <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm p-6 mb-8 animate-fade-in">
            {loading && (
              <div className="py-12 flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
                <p className="text-sm font-semibold text-slate-700">Master Chef Gemini is parsing zero-waste combinations...</p>
                <p className="text-xs text-slate-400">Crafting recipe list from expiring items</p>
              </div>
            )}

            {errorStatus && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-sm flex items-start gap-3">
                <span className="text-lg">⚠️</span>
                <div>
                  <h4 className="font-bold">Execution Error</h4>
                  <p className="text-slate-600 mt-1">{errorStatus}</p>
                </div>
              </div>
            )}

            {recipeMarkdown && !loading && (
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-emerald-600 flex items-center gap-1.5 font-mono">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      Gemini 2.5 Flash Chef Response
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">3 Custom Zero-Waste Recipes</h3>
                  </div>
                  <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-mono font-bold">
                    Zero Waste active
                  </span>
                </div>
                
                <div 
                  className="markdown-body prose max-w-none text-slate-700 text-sm leading-relaxed prose-slate speech-readable"
                  dangerouslySetInnerHTML={{ __html: formatMarkdownToHTML(recipeMarkdown) }}
                />
              </div>
            )}
          </section>
        )}

      </main>
    </div>
  );
}
