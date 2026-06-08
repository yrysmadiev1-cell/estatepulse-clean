import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./style.css";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import { registerUser } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useUi } from "../context/UiContext";

function Register() {
  const { token, user, login } = useAuth();
  const { t } = useUi();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const isAdmin = user?.role === "admin";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await registerUser({ name, email, password }, token);
      if (result?.user && result?.token) {
        login({ user: result.user, token: result.token });
      }
      setSuccess(t("register.created", { email }));
      setName("");
      setEmail("");
      setPassword("");
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
          <p className="eyebrow">{t("register.eyebrow")}</p>
          <h1 className="post-title">{t("register.title")}</h1>
          {isAdmin ? (
            <p className="form-lead">{t("register.leadAdmin")}</p>
          ) : (
            <p className="form-lead">{t("register.leadUser")}</p>
          )}

          <form className="form-stack" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="register-name">{t("register.name")}</label>
              <input
                id="register-name"
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="register-email">{t("register.email")}</label>
              <input
                id="register-email"
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="register-password">{t("register.password")}</label>
              <input
                id="register-password"
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>

            {error && <p className="form-error">{error}</p>}
            {success && <p className="success-note">{success}</p>}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? t("register.loading") : t("register.button")}
            </button>
          </form>

          <p className="hero-description">
            {t("register.haveAccount")} <Link to="/login">{t("register.login")}</Link>.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

export default Register;
