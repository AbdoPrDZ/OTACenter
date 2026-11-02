import React from "react";
import ReactDOM from "react-dom/client";

import "../../../css/app.css";

import { ThemeProvider } from "@/components/ui/theme";
import HomePage from "./components/HomePage";
import AboutPage from "./components/AboutPage";
import ContactPage from "./components/ContactPage";

/** The `home` Blade shell serves `/`, `/about` and `/contact`; pick the page by path. */
function Page() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  switch (path) {
    case "/about":
      return <AboutPage />;
    case "/contact":
      return <ContactPage />;
    default:
      return <HomePage />;
  }
}

const root = document.getElementById("root") as HTMLElement;

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ThemeProvider>
      <Page />
    </ThemeProvider>
  </React.StrictMode>,
);
