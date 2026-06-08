import React from "react";
import "./style.css";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import { useUi } from "../context/UiContext";

export default function LoadingScreen({
  actionLabel,
  actionTo = "/",
  title,
  message,
  container = "narrow",
}) {
  const { t } = useUi();
  const containerClass = container === "wide" ? "container wide" : "container narrow";

  return (
    <div className="page-shell">
      <SiteHeader actionLabel={actionLabel || t("common.home")} actionTo={actionTo} />
      <main className={containerClass}>
        <section className="glass-panel loading-panel">
          <h1 className="post-title" style={{ margin: 0 }}>
            {title || t("loading.title")}
          </h1>
          <p className="hero-description" style={{ margin: 0 }}>
            {message || t("loading.message")}
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
