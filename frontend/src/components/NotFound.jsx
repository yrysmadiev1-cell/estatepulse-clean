import React from "react";
import { Link } from "react-router-dom";
import "./style.css";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import { useUi } from "../context/UiContext";

function NotFound() {
  const { t } = useUi();

  return (
    <div className="page-shell">
      <SiteHeader actionLabel={t("common.home")} actionTo="/" />
      <main className="container narrow">
        <section className="glass-panel">
          <p className="eyebrow">{t("notFound.eyebrow")}</p>
          <h1 className="post-title">{t("notFound.title")}</h1>
          <p className="hero-description">{t("notFound.description")}</p>
          <Link to="/" className="btn btn-primary">{t("notFound.back")}</Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

export default NotFound;
