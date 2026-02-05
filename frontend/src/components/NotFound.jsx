import React from "react";
import { Link } from "react-router-dom";
import "./style.css";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

function NotFound() {
  return (
    <div className="page-shell">
      <SiteHeader actionLabel="На главную" actionTo="/" />
      <main className="container narrow">
        <section className="glass-panel">
          <p className="eyebrow">404</p>
          <h1 className="post-title">Страница не найдена</h1>
          <p className="hero-description">
            Такой страницы нет или она была перемещена.
          </p>
          <Link to="/" className="btn btn-primary">Вернуться на главную</Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

export default NotFound;
