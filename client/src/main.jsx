import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import "./css/madar.css";
import "./css/participant.css";
import "./css/kiosk.css";
import "./css/admin.css";
import "./css/extra.css";
import { LangProvider } from "./i18n.jsx";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <LangProvider><BrowserRouter><App /></BrowserRouter></LangProvider>
);
