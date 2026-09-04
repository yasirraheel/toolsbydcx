import React from "react";
import ReactDOM from "react-dom/client";

import App from "./components/App";
import { DialogProvider } from "./context/DialogContext";
import "./index.css";

// React v18
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <DialogProvider>
      <App />
    </DialogProvider>
  </React.StrictMode>
);
