import React, { useEffect, useState } from "react";
import "./style.css";
import { getPost, updatePost } from "../utils/api";
import { useParams, useNavigate, Link } from "react-router-dom";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import { useAuth } from "../context/AuthContext";
import { CATEGORIES } from "../constants/categories";
import { CITY_NAMES } from "../constants/cities";

function EditPost() {
  const { id } = useParams();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [city, setCity] = useState(CITY_NAMES[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    let mounted = true;
    getPost(id)
      .then((p) => {
        if (mounted && p) {
          setTitle(p.title || "");
          setDescription(p.description || "");
          setContent(p.content || "");
          setCategory(p.category || CATEGORIES[0]);
          setCity(p.city || CITY_NAMES[0]);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    return () => (mounted = false);
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    setError(null);
    try {
      await updatePost(id, { title, description, content, category, city }, token);
      navigate(`/posts/${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <main className="container narrow">Загрузка...</main>;
  if (error) return <main className="container narrow">Ошибка: {error}</main>;

  return (
    <div className="page-shell">
      <SiteHeader actionLabel="На главную" actionTo="/" />

      <main className="container narrow">
        <section className="form-panel glass-panel">
          <p className="eyebrow">Обновляем материал</p>
          <h1 className="post-title">Редактировать публикацию</h1>
          {isAdmin ? (
            <p className="form-lead">Уточните цифры, добавьте контекст или обновите прогноз. После сохранения изменения сразу появятся в ленте.</p>
          ) : (
            <p className="form-lead">
              Редактирование доступно только администратору. <Link to="/login">Войдите</Link> под админ-аккаунтом.
            </p>
          )}

          <form onSubmit={handleSubmit} className="form-stack">
            <div className="form-group">
              <label htmlFor="title">Заголовок</label>
              <input
                type="text"
                id="title"
                name="title"
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Краткое описание</label>
              <textarea
                id="description"
                name="description"
                rows="3"
                className="form-control"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
              <label htmlFor="content">Полное содержание</label>
              <textarea
                id="content"
                name="content"
                rows="12"
                className="form-control"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>

            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={saving || !isAdmin}>
              {saving ? "Сохраняем изменения..." : "Сохранить"}
            </button>
          </form>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

export default EditPost;
