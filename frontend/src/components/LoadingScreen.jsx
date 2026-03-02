import React from "react";
import "./style.css";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

export default function LoadingScreen({
  actionLabel = "На главную",
  actionTo = "/",
  title = "Загрузка…",
  message = "Если страница открывается дольше обычного, подождите немного.",
  container = "narrow",
}) {
  const containerClass = container === "wide" ? "container wide" : "container narrow";

  return (
    <div className="page-shell">
      <SiteHeader actionLabel={actionLabel} actionTo={actionTo} />
      <main className={containerClass}>
        <section className="glass-panel loading-panel">
          <h1 className="post-title" style={{ margin: 0 }}>
            {title}
          </h1>
          <p className="hero-description" style={{ margin: 0 }}>
            {message}
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
