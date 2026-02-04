import React from "react";
import { Link } from "react-router-dom";
import "./style.css";

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container wide footer-grid">
        <div>
          <p className="footer-logo">EstatePulse</p>
          <p className="footer-tagline">Аналитика рынка недвижимости Казахстана</p>
        </div>
        <div className="footer-links">
          <Link to="/">Главная</Link>
          <Link to="/about">О нас</Link>
          <Link to="/posts/new">Новая публикация</Link>
        </div>
        <div className="footer-contact">
          <p>hello@estatepulse.kz</p>
          <p>+7 (7172) 000-000</p>
        </div>
      </div>
      <div className="footer-bottom">
        <small>© {new Date().getFullYear()} EstatePulse. Все права защищены.</small>
      </div>
    </footer>
  );
}

export default SiteFooter;
