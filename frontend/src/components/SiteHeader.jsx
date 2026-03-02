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
    { label: "Новости", pathname: "/news" },
    { label: "Карта", pathname: "/map" },
    { label: "О нас", pathname: "/about" },
  ];

  const getCurrentCity = () => {
    const params = new URLSearchParams(location.search || "");
    const raw = params.get("city") ?? params.get("");
    return raw ? raw.trim().toLowerCase() : null;
  };

  const isCityAwarePage = location.pathname === "/city" || location.pathname === "/map";
  const activeCity = isCityAwarePage ? getCurrentCity() : null;

  const isActive = (link) => {
    if (link.pathname === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(link.pathname);
  };

  const activeCityLabel = activeCity
    ? CITIES.find((c) => c.name.toLowerCase() === activeCity)?.name
    : null;

  const cityTargetPath = location.pathname === "/map" ? "/map" : "/city";

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

          <details className={`city-menu ${isCityAwarePage ? "active" : ""}`}>
            <summary className="ghost-link">
              {activeCityLabel ? `Город: ${activeCityLabel}` : "Города"}
            </summary>
            <div className="city-dropdown">
              {CITIES.map((city) => (
                <Link
                  key={city.name}
                  to={{ pathname: cityTargetPath, search: `?city=${encodeURIComponent(city.name)}` }}
                  className={`city-option ${activeCity === city.name.toLowerCase() ? "active" : ""}`}
                >
                  {city.name}
                </Link>
              ))}
            </div>
          </details>

          <Link to="/evaluate" className="btn btn-primary nav-cta">
            Оценить объект
          </Link>

          {canShowAction && (
            <Link to={actionTo} className="btn btn-secondary nav-cta">
              {actionLabel}
            </Link>
          )}
          {user ? (
            <>
              <Link to="/profile" className="user-chip">
                {user.name}
              </Link>
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
