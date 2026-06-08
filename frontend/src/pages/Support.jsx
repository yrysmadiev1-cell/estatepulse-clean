import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import "../components/style.css";
import { useAuth } from "../context/AuthContext";
import { useUi } from "../context/UiContext";
import {
  createSupportThread,
  getSupportThreads,
  sendSupportMessage,
  setSupportThreadStatus,
} from "../utils/api";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ru-RU");
}

function MessageBubble({ message, userId, t }) {
  const isMine = message?.sender?.id && String(message.sender.id) === String(userId);
  const authorLabel = message?.senderRole === "admin"
    ? t("support.admin")
    : isMine
      ? t("support.you")
      : t("support.user");

  return (
    <div className={`support-message ${isMine ? "mine" : "theirs"}`}>
      <div className="support-message__meta">
        <strong>{authorLabel}</strong>
        <span>{formatDate(message?.createdAt)}</span>
      </div>
      <div className="support-message__text">{message?.text}</div>
    </div>
  );
}

export default function Support() {
  const { user, token } = useAuth();
  const { t } = useUi();
  const isAdmin = user?.role === "admin";
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const activeThread = useMemo(
    () => threads.find((thread) => thread._id === activeThreadId) || threads[0] || null,
    [activeThreadId, threads]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadThreads() {
      setLoading(true);
      setError("");

      try {
        const data = await getSupportThreads(token);
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setThreads(list);
        setActiveThreadId((current) => current || list[0]?._id || null);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || t("support.errorLoad"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadThreads();
    return () => {
      cancelled = true;
    };
  }, [t, token]);

  useEffect(() => {
    if (!activeThread) return undefined;

    const timer = window.setInterval(async () => {
      try {
        const refreshed = await getSupportThreads(token);
        setThreads(Array.isArray(refreshed) ? refreshed : []);
      } catch {
        // silent polling failure
      }
    }, 15000);

    return () => window.clearInterval(timer);
  }, [activeThread, token]);

  async function refreshThreads(nextThreadId = null) {
    const data = await getSupportThreads(token);
    const list = Array.isArray(data) ? data : [];
    setThreads(list);
    if (nextThreadId) {
      setActiveThreadId(nextThreadId);
    } else if (!list.some((thread) => thread._id === activeThreadId)) {
      setActiveThreadId(list[0]?._id || null);
    }
  }

  async function handleCreateOrReply(e) {
    e.preventDefault();

    const text = message.trim();
    const nextSubject = subject.trim();

    if (!text) return;
    if (!activeThread && !nextSubject) return;

    setSending(true);
    setError("");

    try {
      if (activeThread?._id) {
        const updated = await sendSupportMessage(activeThread._id, { text }, token);
        const nextThreadId = updated?._id || activeThread._id;
        setMessage("");
        await refreshThreads(nextThreadId);
      } else {
        const created = await createSupportThread({ subject: nextSubject, text }, token);
        setSubject("");
        setMessage("");
        await refreshThreads(created?._id || null);
      }
    } catch (err) {
      setError(err?.message || t("support.errorLoad"));
    } finally {
      setSending(false);
    }
  }

  async function handleCloseThread() {
    if (!isAdmin || !activeThread?._id) return;

    setSending(true);
    setError("");
    try {
      await setSupportThreadStatus(activeThread._id, { status: activeThread.status === "closed" ? "open" : "closed" }, token);
      await refreshThreads(activeThread._id);
    } catch (err) {
      setError(err?.message || t("support.errorLoad"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="page-shell">
      <SiteHeader actionLabel={t("common.home")} actionTo="/" />
      <main className="container wide">
        <section className="glass-panel support-hero">
          <div>
            <p className="eyebrow">{t("support.title")}</p>
            <h1 className="post-title">{t("support.subtitle")}</h1>
            <p className="hero-description" style={{ marginTop: 0 }}>
              {isAdmin ? t("support.introAdmin") : t("support.introUser")}
            </p>
          </div>
          <div className="article-pills">
            <span className="badge">{isAdmin ? t("support.admin") : t("support.user")}</span>
            <span className="badge badge-city">
              {activeThread?.status === "closed" ? t("support.statusClosed") : t("support.statusOpen")}
            </span>
          </div>
        </section>

        <section className="support-layout">
          <aside className="glass-panel support-sidebar">
            <div className="support-sidebar__head">
              <h2 className="section-title" style={{ marginBottom: 0 }}>{t("support.threads")}</h2>
              {!isAdmin && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setActiveThreadId(null);
                    setSubject("");
                    setMessage("");
                  }}
                >
                  {t("support.newThread")}
                </button>
              )}
            </div>

            {loading ? (
              <p className="hero-description">{t("support.loading")}</p>
            ) : error ? (
              <p className="form-error">{error}</p>
            ) : threads.length === 0 ? (
              <div className="support-empty">
                <p>{t("support.empty")}</p>
                {!isAdmin && <p className="hero-description">{t("support.startConversation")}</p>}
              </div>
            ) : (
              <div className="support-thread-list">
                {threads.map((thread) => {
                  const isActive = thread._id === activeThread?._id;
                  return (
                    <button
                      key={thread._id}
                      type="button"
                      className={`support-thread-item ${isActive ? "active" : ""}`}
                      onClick={() => {
                        setActiveThreadId(thread._id);
                        setSubject(thread.subject || "");
                        setMessage("");
                      }}
                    >
                      <div className="support-thread-item__head">
                        <strong>{thread.subject || t("support.newThread")}</strong>
                        <span className="badge">{thread.status === "closed" ? t("support.statusClosed") : t("support.statusOpen")}</span>
                      </div>
                      <p>{thread.user?.name || thread.user?.email || t("support.user")}</p>
                      <span>{thread.lastMessagePreview || "—"}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <section className="glass-panel support-chat">
            {activeThread ? (
              <>
                <div className="support-chat__head">
                  <div>
                    <p className="eyebrow">{t("support.subject")}</p>
                    <h2 className="section-title" style={{ marginBottom: 4 }}>{activeThread.subject}</h2>
                    <p className="hero-description" style={{ margin: 0 }}>
                      {activeThread.user?.name || activeThread.user?.email || t("support.user")} · {formatDate(activeThread.createdAt)}
                    </p>
                  </div>
                  <div className="article-pills">
                    <span className="badge">{activeThread.status === "closed" ? t("support.statusClosed") : t("support.statusOpen")}</span>
                    {isAdmin && (
                      <button type="button" className="btn btn-secondary" onClick={handleCloseThread} disabled={sending}>
                        {activeThread.status === "closed" ? t("support.reopenThread") : t("support.closeThread")}
                      </button>
                    )}
                  </div>
                </div>

                <div className="support-message-list">
                  {(activeThread.messages || []).map((messageItem) => (
                    <MessageBubble key={messageItem._id || `${messageItem.createdAt}-${messageItem.text}`} message={messageItem} userId={user?.id} t={t} />
                  ))}
                </div>

                <form className="support-composer" onSubmit={handleCreateOrReply}>
                  {!activeThread && (
                    <div className="form-group">
                      <label htmlFor="support-subject">{t("support.subject")}</label>
                      <input
                        id="support-subject"
                        className="form-control"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder={t("support.placeholderSubject")}
                        required
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label htmlFor="support-message">{activeThread ? t("support.reply") : t("support.message")}</label>
                    <textarea
                      id="support-message"
                      rows={5}
                      className="form-control"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={activeThread ? t("support.placeholderReply") : t("support.placeholderMessage")}
                      required
                    />
                  </div>

                  {error && <p className="form-error">{error}</p>}

                  <div className="support-composer__actions">
                    <button type="submit" className="btn btn-primary" disabled={sending}>
                      {sending ? t("common.loading") : t("support.send")}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="support-chat__empty">
                <p className="hero-description">{t("support.selectThread")}</p>
                {!isAdmin && (
                  <form className="support-composer" onSubmit={handleCreateOrReply}>
                    <div className="form-group">
                      <label htmlFor="support-subject-new">{t("support.subject")}</label>
                      <input
                        id="support-subject-new"
                        className="form-control"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder={t("support.placeholderSubject")}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="support-message-new">{t("support.message")}</label>
                      <textarea
                        id="support-message-new"
                        rows={6}
                        className="form-control"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={t("support.placeholderMessage")}
                        required
                      />
                    </div>

                    {error && <p className="form-error">{error}</p>}

                    <button type="submit" className="btn btn-primary" disabled={sending}>
                      {sending ? t("common.loading") : t("support.startConversation")}
                    </button>
                  </form>
                )}
              </div>
            )}
          </section>
        </section>

        <div className="support-footer-links">
          <Link to="/profile" className="btn btn-secondary">{t("nav.profile")}</Link>
          <Link to="/evaluate" className="btn btn-primary">{t("nav.evaluate")}</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}