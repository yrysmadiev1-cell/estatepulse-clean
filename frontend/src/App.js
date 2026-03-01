import React from "react";
import "./components/style.css";
import AppRoute from "./components/AppRoute";
import ScrollToTopButton from "./components/ScrollToTopButton";

function App() {
  return (
    <div className="app-shell">
      <AppRoute />
      <ScrollToTopButton />
    </div>
  );
}

export default App;
