# Cogniflix: Context-Aware Streaming Platform 🎬

Cogniflix is a modern, full-stack, AI-driven streaming platform engineered to provide users with a dynamic, context-aware Netflix-style experience. The application utilizes a hybrid recommendation engine powered by Supabase, `pgvector`, and Gemini AI to suggest content tailored precisely to the user's mood, region, and watch history.

## 🌟 Key Features

### 1. Hybrid AI Recommendation Engine
Cogniflix goes beyond basic collaborative filtering by integrating Gemini AI with our Postgres database. It dynamically calculates content affinity based on:
- **Emotion & Mood:** Suggests content matching the user's current emotional state.
- **Regional Personalization:** Prioritizes content trending within the user's culture and location.
- **Time-Aware Ranking:** Learns watch patterns to suggest the right content at the right time.

### 2. Premium Cinematic Interface
- **Netflix-Style UI:** Responsive, immersive design featuring dark mode, glassmorphism, and seamless micro-interactions.
- **Framer Motion Animations:** Fluid page transitions, dynamic hover reveals on movie posters, and scroll-triggered content rows.
- **Vite & React:** High-performance, lightning-fast rendering on the client side.

### 3. Robust Authentication & Security
- **JWT-Based Auth:** Secure session management with HttpOnly cookies.
- **Protected Routes:** Both client-side route guards and robust backend middleware prevent unauthorized access.
- **CORS Configured:** Strictly secured cross-origin policies locking requests to authenticated frontend domains.

## 🏗️ Architecture & Tech Stack

### Frontend (Client-Side)
- **Framework:** React + TypeScript (Vite)
- **Styling:** Vanilla CSS (Netflix-Style UI patterns)
- **Animations:** Framer Motion
- **State Management:** Context API
- **Routing:** React Router v6

### Backend (Server-Side)
- **Runtime:** Node.js + Express
- **AI Integration:** Google Gemini API (`@google/genai`)
- **Database:** PostgreSQL (Supabase) + `pgvector` for similarity search
- **Authentication:** JWT & bcryptjs
- **External Data:** TMDB API

## 🚀 Live Environments
- **Frontend (Vercel):** [https://cogniflix.vercel.app](https://cogniflix.vercel.app)
- **Frontend (AWS Amplify):** [https://main.d3pelnl55s3qgs.amplifyapp.com/](https://main.d3pelnl55s3qgs.amplifyapp.com/)
- **Backend (Production):** Render

## 💻 Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Tejender06/Cogniflix-Backend.git
   ```

2. **Backend Setup:**
   ```bash
   cd CogniflixBackend
   npm install
   # Configure your .env file with DATABASE_URL, JWT_SECRET, TMDB_API_KEY, and GEMINI_API_KEY
   npm start
   ```

3. **Frontend Setup:**
   ```bash
   cd CogniflixFrontend
   npm install
   # Configure VITE_API_URL if testing locally
   npm run dev
   ```

## 🛡️ License & Contact
Developed as part of an advanced AI engineering internship focusing on recommendation algorithms and modern full-stack web deployment.
