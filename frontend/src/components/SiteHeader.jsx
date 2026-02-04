import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CITIES } from "../constants/cities";

function SiteHeader({ actionLabel = "Добавить аналитику", actionTo = "/posts/new" }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === "admin";
  const canShowAction = actionLabel && actionTo && (actionTo !== "/posts/new" || isAdmin);
  const navLinks = [
    { label: "Рынок РК", pathname: "/" },
    ...CITIES.map((city) => ({
      label: city.name,
      pathname: "/city",
      search: `?=${encodeURIComponent(city.name)}`,
      cityName: city.name,
    })),
    { label: "О нас", pathname: "/about" },
  ];

  const getCurrentCity = () => {
    const params = new URLSearchParams(location.search || "");
    const raw = params.get("city") ?? params.get("");
    return raw ? raw.trim().toLowerCase() : null;
  };

  const activeCity = location.pathname === "/city" ? getCurrentCity() : null;

  const isActive = (link) => {
    if (link.pathname === "/") {
      return location.pathname === "/";
    }
    if (link.pathname === "/city") {
      return location.pathname === "/city" && activeCity === link.cityName.toLowerCase();
    }
    return location.pathname.startsWith(link.pathname);
  };
  return (
    <header className="main-header glass-panel">
      <div className="container wide header-grid">
        <div>
          <Link to="/" className="logo">EstatePulse</Link>
          <p className="logo-subtitle">новости рынка недвижимости</p>
        </div>
        <nav className="main-nav">
          {navLinks.map((link) => (
            <Link
              key={`${link.pathname}${link.search || ""}`}
              to={link.search ? { pathname: link.pathname, search: link.search } : link.pathname}
              className={`ghost-link ${isActive(link) ? "active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
          {canShowAction && (
            <Link to={actionTo} className="btn btn-primary nav-cta">
              {actionLabel}
            </Link>
          )}
          {user ? (
            <>
              <span className="user-chip">{user.name}</span>
              <button type="button" className="ghost-link" onClick={logout}>
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="ghost-link">Войти</Link>
              <Link to="/register" className="btn btn-secondary nav-cta">
                Регистрация
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default SiteHeader;
