import React, { useState } from "react";
import "./style.css";
import { createPost } from "../utils/api";
import { useNavigate, Link } from "react-router-dom";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import { useAuth } from "../context/AuthContext";
import { CATEGORIES } from "../constants/categories";
import { CITY_NAMES } from "../constants/cities";

function NewPost() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [city, setCity] = useState(CITY_NAMES[0]);
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const { token, user } = useAuth();
  const isAdmin = user?.role === "admin";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    setError(null);

    try {
      const post = {
        date: new Date().toISOString().split("T")[0],
        title,
        description,
        content,
        category,
        city,
      };
      await createPost(post, token);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-shell">
      <SiteHeader actionLabel="На главную" actionTo="/" />

      <main className="container narrow">
        <section className="form-panel glass-panel">
          <p className="eyebrow">Новый релиз</p>
          <h1 className="post-title">Добавить материал о рынке</h1>
          {isAdmin ? (
            <p className="form-lead">
              Делитесь аналитикой о проектах, сделках и динамике цен. Чем точнее заголовок и описание, тем быстрее читатели поймут ключевую мысль.
            </p>
          ) : (
            <p className="form-lead">
              Публикация доступна только администраторам. <Link to="/login">Войдите</Link> под админ-аккаунтом, чтобы продолжить.
            </p>
          )}

          <form onSubmit={handleSubmit} className="form-stack">
            <div className="form-group">
              <label htmlFor="title">Заголовок материала</label>
              <input
                type="text"
                id="title"
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Рост цен на бизнес-класс после запуска МЦД"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Короткое резюме</label>
              <textarea
                id="description"
                rows="3"
                className="form-control"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Одним абзацем объясните, что происходит и почему это важно"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="category">Категория</label>
              <select
                id="category"
                className="form-control"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="city">Город</label>
              <select
                id="city"
                className="form-control"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              >
                {CITY_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="content">Подробный разбор</label>
              <textarea
                id="content"
                rows="10"
                className="form-control"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Добавьте цифры, комментарии аналитиков, контекст и прогноз"
                required
              />
            </div>

            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={saving || !isAdmin}>
              {saving ? "Сохраняем материал..." : "Опубликовать в ленте"}
            </button>
          </form>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

export default NewPost;
