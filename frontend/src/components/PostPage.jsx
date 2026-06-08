import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./style.css";
import { addPostComment, getPost } from "../utils/api";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import { useAuth } from "../context/AuthContext";
import LoadingScreen from "./LoadingScreen";

export default function PostPage() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentError, setCommentError] = useState(null);
  const { user, token } = useAuth();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    let mounted = true;
    getPost(id)
      .then((data) => {
        if (mounted) {
          setPost(data);
          setComments(Array.isArray(data?.comments) ? data.comments : []);
        }
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

  const formatDateTime = (value) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCommentSubmit = async (event) => {
    event.preventDefault();
    if (!token) return;

    const trimmed = commentText.trim();
    if (!trimmed) {
      setCommentError("Введите текст комментария");
      return;
    }

    setCommentSaving(true);
    setCommentError(null);
    try {
      const created = await addPostComment(id, { text: trimmed }, token);
      setComments((prev) => [...prev, created]);
      setCommentText("");
    } catch (err) {
      setCommentError(err.message);
    } finally {
      setCommentSaving(false);
    }
  };

  if (loading) {
    return <LoadingScreen actionLabel="На главную" actionTo="/" />;
  }
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

          <section className="comments-panel glass-panel">
            <header className="comments-header">
              <div>
                <p className="eyebrow">Обсуждение</p>
                <h2 className="section-title">Комментарии</h2>
              </div>
              <span className="comments-count">{comments.length}</span>
            </header>

            {comments.length === 0 ? (
              <p className="empty-state">Пока нет комментариев. Первым поделитесь мнением.</p>
            ) : (
              <div className="comments-list">
                {comments.map((comment, index) => (
                  <article key={comment._id || index} className="comment-card">
                    <div className="comment-meta">
                      <span className="comment-author">{comment.author?.name || "Пользователь"}</span>
                      <time dateTime={comment.createdAt}>{formatDateTime(comment.createdAt)}</time>
                    </div>
                    <p className="comment-text">{comment.text}</p>
                  </article>
                ))}
              </div>
            )}

            {token ? (
              <form className="comment-form" onSubmit={handleCommentSubmit}>
                <label htmlFor="comment-text" className="search-label">Ваш комментарий</label>
                <textarea
                  id="comment-text"
                  className="form-control comment-input"
                  rows="4"
                  value={commentText}
                  onChange={(e) => {
                    setCommentText(e.target.value);
                    if (commentError) setCommentError(null);
                  }}
                  placeholder="Что вы думаете о новости?"
                />
                {commentError && <p className="form-error">{commentError}</p>}
                <div className="comment-actions">
                  <button type="submit" className="btn btn-primary" disabled={commentSaving}>
                    {commentSaving ? "Отправляем..." : "Отправить комментарий"}
                  </button>
                </div>
              </form>
            ) : (
              <p className="comment-auth-hint">
                Чтобы писать комментарии, <Link to="/login">войдите в аккаунт</Link>.
              </p>
            )}
          </section>

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
