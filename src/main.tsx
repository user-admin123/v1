// src/main.tsx
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// SIMPLE TOGGLE: Set to true to see the vConsole button on your phone
const SHOW_DEBUG = true;

if (SHOW_DEBUG) {
  import("vconsole").then(({ default: VConsole }) => {
    new VConsole({ theme: "dark" });
    console.log("[🛠️] vConsole is ON");
  });
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
