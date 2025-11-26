# 🦍 Monkey Tips - Sports Intelligence Platform (v2.0)

**Monkey Tips** is a high-end, dual-interface sports intelligence system designed to operate as a "Strategic Mind" terminal rather than a traditional betting site. It utilizes Advanced Mathematics (Bayesian Inference) and Multimodal AI (Google Gemini 2.5) to generate Value Bets (+EV).

## 🚀 Features

### 🧠 Core Intelligence
*   **Scout Engine:** Pure mathematical model using Poisson Distribution (Football) and Pace/Efficiency Projections (NBA). Includes Bayesian adjustments for live games.
*   **Fusion Engine:** The decision-making core that combines Math + AI Context + Market Odds to determine "Green Lights".
*   **News Engine:** Analyzes sports news via NLP to calculate statistical impact scores (-30% to +30%) on match probabilities.

### 👁️ Computer Vision
*   **Monkey Vision:** Real-time screen reader that captures data from betting sites via browser stream.
*   **Monkey Labs:** OCR module for analyzing ticket screenshots and validating EV.

### ⚡ Automation
*   **Live Engine:** 30-second cycle loop for real-time monitoring.
*   **Auto-Webhooks:** Dispatches alerts to Discord/Telegram/n8n.
*   **Edge API:** Server-side validation and data ingestion endpoints.

## 🛠️ Tech Stack

*   **Frontend:** React 18, Vite, Tailwind CSS
*   **Language:** TypeScript
*   **AI:** Google Gemini 2.5 Flash (Multimodal)
*   **Database & Auth:** Supabase
*   **API:** Vercel Edge Functions

## 📦 Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-org/monkey-tips.git
    cd monkey-tips
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

## 🔐 Configuration

Access the `/admin` route and navigate to the **Ativação** tab to configure your keys securely (stored in LocalStorage):
*   **Google Gemini API Key**
*   **API-Football Key** (RapidAPI)
*   **Supabase URL & Key**

## 📊 Roadmap Status

*   [x] **Phases 1-3:** Core, Backend, Interface (Completed)
*   [x] **Phase 4:** News Engine & Automation (Completed)
*   [x] **Phase 5:** Live Engine & Scout V2 (Completed)
*   [x] **Phase 6:** v2.0 Launch & Autonomous Systems (Completed)
*   [ ] **Phase 7:** SaaS & Mobile Expansion (In Progress)

---
*© 2024 Monkey Tips Intelligence. System Operational. Last Deployment: v2.0-GOLD-REVISION-3*