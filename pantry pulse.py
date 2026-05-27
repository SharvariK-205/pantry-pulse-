import streamlit as st
import datetime
import pandas as pd
from google import genai
from google.genai import types

# ---------------------------------------------------------
# Page Setup & Styling
# ---------------------------------------------------------
st.set_page_config(
    page_title="PantryPulse - Smart Zero-Waste Pantry Tracker",
    page_icon="🍳",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom responsive CSS to align with local-first, premium Streamlit layouts
st.markdown("""
<style>
    .reportview-container {
        background: #fdfdfd;
    }
    .main .block-container{
        padding-top: 2rem;
    }
    /* Simple high-contrast badge coloring for High Risk items */
    .badge-danger {
        background-color: #ffebeb;
        color: #d93838;
        padding: 4px 10px;
        border-radius: 4px;
        font-weight: 600;
        border: 1px solid #fad2d2;
    }
    .badge-safe {
        background-color: #ebffed;
        color: #248a3d;
        padding: 4px 10px;
        border-radius: 4px;
        font-weight: 600;
        border: 1px solid #d2fad5;
    }
    /* Styling headers in a Swiss-inspired minimalist layout */
    .stHeading h1 {
        font-weight: 800 !important;
        letter-spacing: -0.05em !important;
    }
</style>
""", unsafe_allow_html=True)

# ---------------------------------------------------------
# Database Initialization (st.session_state)
# ---------------------------------------------------------
if 'pantry_inventory' not in st.session_state:
    # Initialize with some default sample ingredients for a rich starting experience
    st.session_state.pantry_inventory = [
        {"name": "Whole Milk", "category": "Dairy", "expiration_date": datetime.date.today() + datetime.timedelta(days=2)},
        {"name": "Fresh Spinach", "category": "Produce", "expiration_date": datetime.date.today() + datetime.timedelta(days=1)},
        {"name": "Ripe Bananas", "category": "Produce", "expiration_date": datetime.date.today() + datetime.timedelta(days=6)},
        {"name": "Chicken Breasts", "category": "Meat & Seafood", "expiration_date": datetime.date.today() + datetime.timedelta(days=5)},
    ]

# Helper to remove an ingredient by index
def delete_ingredient(index):
    if 0 <= index < len(st.session_state.pantry_inventory):
        st.session_state.pantry_inventory.pop(index)

# ---------------------------------------------------------
# Sidebar - Configuration & API Key
# ---------------------------------------------------------
with st.sidebar:
    st.title("🍳 PantryPulse")
    st.markdown("Your smart zero-waste cooking companion.")
    st.write("---")
    
    # 1. API Key Input Field
    api_key_input = st.text_input(
        "Google AI Studio API Key",
        type="password",
        help="Paste your Gemini API Key here to unlock zero-waste AI recipe generation.",
        placeholder="AIzaSy..."
    )
    
    st.write("---")
    st.markdown("### 📊 Pantry Health Check")
    
    # Calculate pantry stats dynamically
    today = datetime.date.today()
    total_items = len(st.session_state.pantry_inventory)
    high_risk_items = 0
    
    for item in st.session_state.pantry_inventory:
         days_remaining = (item["expiration_date"] - today).days
         if days_remaining <= 3:
             high_risk_items += 1
             
    st.metric("Total Ingredients", total_items)
    st.metric("💡 High Risk (Expires ≤ 3 Days)", high_risk_items, delta=f"{high_risk_items} urgent" if high_risk_items > 0 else "0 urgent", delta_color="inverse")

    st.write("---")
    st.caption("Developed with streamlit and google-genai SDK 2.5")

# ---------------------------------------------------------
# Main App Layout
# ---------------------------------------------------------
st.title("🍳 Zero-Waste Pantry Tracker")
st.write("Track your fresh ingredients, monitor upcoming expirations in real-time, and magically transform expiring items into zero-waste gourmet meals.")

# 1. Ingredient Intake Form
st.markdown("### 📥 Register Fresh Ingredient")
with st.form("add_ingredient_form", clear_on_submit=True):
    col1, col2, col3 = st.columns([2, 1, 1])
    
    with col1:
        ing_name = st.text_input("Ingredient Name", placeholder="e.g. Avocado, Greek Yogurt, Salmon loin")
    with col2:
        ing_category = st.selectbox("Category", [
            "Produce", 
            "Dairy", 
            "Meat & Seafood", 
            "Pantry Staples", 
            "Bakery", 
            "Frozen Foods", 
            "Beverages",
            "Other"
        ])
    with col3:
        ing_exp_date = st.date_input("Expiration Date", value=datetime.date.today() + datetime.timedelta(days=5))
        
    submitted = st.form_submit_state = st.form_submit_button("Add to Pantry Inventory", use_container_width=True)
    
    if submitted:
        if ing_name.strip() == "":
            st.warning("Please enter a valid ingredient name.")
        else:
            new_item = {
                "name": ing_name.strip(),
                "category": ing_category,
                "expiration_date": ing_exp_date
            }
            st.session_state.pantry_inventory.append(new_item)
            st.success(f"Successfully added **{ing_name.strip()}** to your inventory!")

# Space out elements
st.write("")

# 2. Display Pantry Elements
st.markdown("### 📋 Current Kitchen Inventory")
if len(st.session_state.pantry_inventory) == 0:
    st.info("Your pantry is currently empty! Register ingredients above to get started.")
else:
    # Build columns to display headers
    header_cols = st.columns([2, 1, 1.5, 1, 1])
    header_cols[0].markdown("**Ingredient**")
    header_cols[1].markdown("**Category**")
    header_cols[2].markdown("**Expiration Date**")
    header_cols[3].markdown("**Waste Risk Status**")
    header_cols[4].markdown("**Actions**")
    st.markdown("---")
    
    # Iterate dynamically to compile our grid
    today = datetime.date.today()
    for idx, item in enumerate(st.session_state.pantry_inventory):
        cols = st.columns([2, 1, 1.5, 1, 1])
        
        # Calculate days left
        days_left = (item["expiration_date"] - today).days
        
        # Highlight logic - less than 3 days is High Risk
        is_high_risk = days_left <= 3
        
        cols[0].write(f"**{item['name']}**")
        cols[1].write(item['category'])
        
        # Expiration Date & Countdown
        if days_left < 0:
            countdown_text = f"{item['expiration_date'].strftime('%b %d, %Y')} ({abs(days_left)} days expired)"
        elif days_left == 0:
            countdown_text = f"{item['expiration_date'].strftime('%b %d, %Y')} (Expires Today! ⚠️)"
        else:
            countdown_text = f"{item['expiration_date'].strftime('%b %d, %Y')} ({days_left} days left)"
            
        cols[2].write(countdown_text)
        
        # Visual Badge Status
        if is_high_risk:
            cols[3].markdown('<span class="badge-danger">🚨 High Risk</span>', unsafe_allow_html=True)
        else:
            cols[3].markdown('<span class="badge-safe">✅ Safe</span>', unsafe_allow_html=True)
            
        # Delete Action Button
        if cols[4].button("🚮 Delete", key=f"del_{idx}", use_container_width=True):
            delete_ingredient(idx)
            st.rerun()

st.write("")
st.write("---")

# ---------------------------------------------------------
# AI Zero-Waste Recipe Engine
# ---------------------------------------------------------
st.markdown("### ⚡ AI Zero-Waste Recipe Generator")
st.write("Generates 3 curated gourmet ideas by prioritizing ingredients near their expiry to ensure zero food-waste in your kitchen.")

# Get eligible expiring ingredients to feed into AI
expiring_urgent = []
for item in st.session_state.pantry_inventory:
    days_left = (item["expiration_date"] - today).days
    if days_left <= 3:
        expiring_urgent.append(item)

# Render informative action box
if expiring_urgent:
    st.warning(f"💡 You have **{len(expiring_urgent)}** items flagged as High Risk needing rescue! Generating recipes will focus heavily on prioritizing these items.")
else:
    st.info("All your items are safe. Smart recipes will combine standard items in your pantry.")

# Generate Button
if st.button("🍽️ Generate Smart Recipes", type="primary", use_container_width=True):
    # Validate API Key
    if not api_key_input.strip():
        st.error("🔑 API Key Required: Please paste your Google AI Studio API Key in the sidebar to run the recipe engine.")
    elif not st.session_state.pantry_inventory:
        st.error("🥕 No Ingredients: Add at least one kitchen ingredient first!")
    else:
        with st.spinner("🧑‍🍳 Master Chef Gemini is crafting your recipes..."):
            try:
                # 1. Initialize client using the modern google-genai library
                client = genai.Client(api_key=api_key_input.strip())
                
                # 2. Formulate Prompt
                all_ingredients_formatted = [
                    f"- {x['name']} ({x['category']}, expires on {x['expiration_date']})"
                    for x in st.session_state.pantry_inventory
                ]
                
                prompt_text = f"""
                You are a professional zero-waste master chef. Your goal is to write 3 tasty, clear, and actionable zero-waste recipes using some or all of the following available ingredients. Please prioritize the ingredients with closer expiration dates!
                
                Available Ingredients:
                {"\n".join(all_ingredients_formatted)}
                
                For each of the 3 recipes, you MUST provide:
                - A fun name prefixed with a relevant emoji.
                - The specific expiring ingredient(s) rescued in the recipe.
                - Quick step-by-step cooking steps.
                - A list of optional common kitchen shelf essentials (like olive oil, salt, pepper, or water) that can be added.
                
                At the very end, include a short 1-sentence cooking tip for waste reduction. Please respond in clear Markdown.
                """
                
                # 3. Request generation utilizing gemini-2.5-flash
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt_text
                )
                
                # 4. Display Results
                st.success("🎉 chef hand-crafted recipes ready below!")
                st.markdown(response.text)
                
            except Exception as e:
                st.error(f"❌ Failed to generate recipes: {str(e)}")
                st.info("Verify your API key is correctly active and set in the sidebar.")
