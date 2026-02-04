import React, { useEffect, useState } from "react";
import "./style.css";
import { getPost, deletePost } from "../utils/api";
import { useParams, useNavigate, Link } from "react-router-dom";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import { useAuth } from "../context/AuthContext";

function DeletePost() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    let mounted = true;
    getPost(id)
      .then((p) => { if (mounted) setPost(p); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    return () => (mounted = false);
  }, [id]);

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setDeleting(true);
    try {
      await deletePost(id, token);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <main className="container narrow">Загрузка...</main>;
  if (error) return <main className="container narrow">Ошибка: {error}</main>;
  if (!post) return <main className="container narrow">Пост не найден</main>;

  return (
    <div className="page-shell">
      <SiteHeader actionLabel="На главную" actionTo="/" />

      <main className="container narrow">
        <section className="glass-panel delete-panel">
          <p className="eyebrow">Удаление материала</p>
          <h1 className="post-title">Вы уверены, что хотите удалить публикацию?</h1>
          {isAdmin ? (
            <p className="delete-copy">Материал исчезнет из ленты мгновенно и его нельзя будет восстановить.</p>
          ) : (
            <p className="delete-copy">
              Удаление доступно только администратору. <Link to="/login">Войдите</Link>, чтобы продолжить.
            </p>
          )}
          <h3 className="post-title">“{post.title}”</h3>

          <form className="post-actions" onSubmit={handleDelete}>
            <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">
              Оставить как есть
            </button>
            <button type="submit" className="btn btn-danger" disabled={deleting || !isAdmin}>
              {deleting ? "Удаляем..." : "Удалить материал"}
            </button>
          </form>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

export default DeletePost;
