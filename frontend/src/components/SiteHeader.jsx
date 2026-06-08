import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CITIES } from "../constants/cities";
import { useUi } from "../context/UiContext";

function SiteHeader({ actionLabel = "Добавить аналитику", actionTo = "/posts/new" }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { theme, toggleTheme, language, setLanguage, t } = useUi();
  const isAdmin = user?.role === "admin";
  const canShowAction = actionLabel && actionTo && (actionTo !== "/posts/new" || isAdmin);
  const navLinks = [
    { label: t("nav.market"), pathname: "/" },
    { label: t("nav.news"), pathname: "/news" },
    { label: t("nav.map"), pathname: "/map" },
    { label: t("nav.about"), pathname: "/about" },
    { label: t("nav.support"), pathname: "/support" },
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
          <p className="logo-subtitle">{t("nav.market")}</p>
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
              {activeCityLabel ? `${t("nav.cities")}: ${activeCityLabel}` : t("nav.cities")}
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

          <div className="header-tools" aria-label={t("theme.label")}>
  <button
    type="button"
    className="theme-toggle"
    onClick={toggleTheme}
    aria-label={theme === "dark" ? t("theme.toggleToLight") : t("theme.toggleToDark")}
    title={theme === "dark" ? t("theme.toggleToLight") : t("theme.toggleToDark")}
  >
    <span className="theme-toggle__icon" aria-hidden="true">
      {theme === "dark" ? "☀" : "☾"}
    </span>
    {/* Текст переключения скрыт для компактности */}
  </button>

  <label className="language-switch" aria-label={t("language.label")}>
    <span className="sr-only">{t("language.label")}</span>
    <select value={language} onChange={(e) => setLanguage(e.target.value)}>
      <option value="ru">{t("language.ru")}</option>
      <option value="kz">{t("language.kz")}</option>
      <option value="en">{t("language.en")}</option>
    </select>
  </label>
</div>

          <Link to="/evaluate" className="btn btn-primary nav-cta">
            {t("nav.evaluate")}
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
              <Link to="/login" className="ghost-link">{t("nav.login")}</Link>
              <Link to="/register" className="btn btn-secondary nav-cta">
                {t("nav.register")}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default SiteHeader;
