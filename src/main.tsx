import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// VConsole for development debugging only
if (import.meta.env.DEV) {
  import("vconsole").then(({ default: VConsole }) => {
    new VConsole({ theme: "dark" });
    console.log("[🛠️ DEV] VConsole enabled — use tabs below to inspect logs, network, storage");
  });
}

createRoot(document.getElementById("root")!).render(<App />);
