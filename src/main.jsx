import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "@/App.jsx";
// TanStack React Query setup
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// Ensure global styles and Tailwind CSS are loaded
import "./index.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);

// The root service worker is registered by OneSignal (see utils/oneSignal.js,
// scope "/"). Registering a second worker at that same scope here made OneSignal
// re-register its own worker and reload the page, which showed up as the site
// (and the admin login) refreshing in a loop.
