import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./style.css";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import { loginUser } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useUi } from "../context/UiContext";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useUi();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = await loginUser({ email, password });
      login(payload);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <SiteHeader actionLabel={t("common.home")} actionTo="/" />
      <main className="container narrow">
        <section className="form-panel glass-panel">
          <p className="eyebrow">{t("login.eyebrow")}</p>
          <h1 className="post-title">{t("login.title")}</h1>
          <p className="form-lead">{t("login.lead")}</p>

          <form className="form-stack" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="login-email">{t("login.email")}</label>
              <input
                id="login-email"
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password">{t("login.password")}</label>
              <input
                id="login-password"
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="form-error">{error}</p>}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? t("login.loading") : t("login.button")}
            </button>
          </form>

          <p className="hero-description">
            {t("login.noAccount")} <Link to="/register">{t("login.register")}</Link>.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

export default Login;
