import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./style.css";
import { getPost } from "../utils/api";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import { useAuth } from "../context/AuthContext";

export default function PostPage() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    let mounted = true;
    getPost(id)
      .then((data) => {
        if (mounted) setPost(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [id]);

  const formatDate = (value) => {
    if (!value) return "Дата уточняется";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) return <main className="container narrow">Загрузка...</main>;
  if (error) return <main className="container narrow">Ошибка: {error}</main>;
  if (!post) return <main className="container narrow">Пост не найден</main>;

  return (
    <div className="page-shell">
      <SiteHeader actionLabel="Публиковать аналитику" actionTo="/posts/new" />

      <main className="container narrow">
        <article className="article-panel glass-panel">
          <div className="article-meta">
            <div className="article-pills">
              <span className="badge">{post.category || "Аналитика рынка"}</span>
              {post.city && <span className="badge badge-city">{post.city}</span>}
            </div>
            <time dateTime={post.date}>{formatDate(post.date)}</time>
          </div>

          <h1 className="post-title">{post.title}</h1>
          <p className="article-lead">{post.description}</p>

          <div className="article-stats">
            <div>
              <span>Цены м²</span>
              <strong>+3.8%</strong>
              <small>к прошлому месяцу</small>
            </div>
            <div>
              <span>Спрос</span>
              <strong>68%</strong>
              <small>продажи от предложения</small>
            </div>
            <div>
              <span>Сделки</span>
              <strong>12 400</strong>
              <small>договоров в месяц</small>
            </div>
          </div>

          <div className="post-content">
            {post.content
              ?.split(/\n\s*/)
              .filter(Boolean)
              .map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
          </div>

          {isAdmin && (
            <div className="post-actions">
              <Link to={`/posts/${id}/edit`} className="btn btn-secondary">
                Редактировать материал
              </Link>
              <Link to={`/posts/${id}/delete`} className="btn btn-danger">
                Удалить
              </Link>
            </div>
          )}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
