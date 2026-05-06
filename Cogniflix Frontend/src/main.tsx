/*
FILE: main.tsx

PURPOSE:
React application entry point, attaching the root App to the DOM.

FLOW:
Vite -> main.tsx -> App.tsx

USED BY:
index.html

NEXT FLOW:
App.tsx

*/
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);