import React from "react";
import ReactDOM from "react-dom/client";

import "../../../css/app.css";

import { ThemeProvider } from "@/components/ui/theme";
import HomePage from "./components/HomePage";

const root = document.getElementById("root") as HTMLElement;

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ThemeProvider>
      <HomePage />
    </ThemeProvider>
  </React.StrictMode>,
);
