import { createRoot } from "react-dom/client";
import { Suspense } from "react";
import App from "./App";
import "./index.css";
import "./lib/i18n";

createRoot(document.getElementById("root")!).render(
  <Suspense fallback={
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  }>
    <App />
  </Suspense>
);
