import React from "react";
import "./components/style.css";
import AppRoute from "./components/AppRoute";
import ScrollToTopButton from "./components/ScrollToTopButton";
import ChatWidget from "./components/ChatWidget";

function App() {
  return (
    <div className="app-shell">
      <AppRoute />
      <ScrollToTopButton />
      <ChatWidget />
    </div>
  );
}

export default App;
