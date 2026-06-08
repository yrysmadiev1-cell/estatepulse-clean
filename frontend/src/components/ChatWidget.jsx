import React, { useEffect, useRef, useState } from "react";
import "./style.css";
import { useUi } from "../context/UiContext";

const CITY_OPTIONS = ["Алматы", "Астана"];

function ChatWidget() {
  const { t } = useUi();
  const [open, setOpen] = useState(false);
  const [city, setCity] = useState("Алматы");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: t("chat.initial"),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bodyRef = useRef(null);

  useEffect(() => {
    if (!open || !bodyRef.current) return;
    bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [open, messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const resp = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, city }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.message || t("chat.error"));
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.answer || "" }]);
    } catch (err) {
      const message = err?.message || t("chat.error");
      setError(message);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: t("chat.fallback") },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="assistant-widget">
      {open && (
        <div className="assistant-panel">
          <div className="assistant-header">
            <div>
              <div className="assistant-title">{t("chat.title")}</div>
              <div className="assistant-subtitle">{t("chat.subtitle")}</div>
            </div>
            <select
              className="assistant-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              {CITY_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="assistant-body" ref={bodyRef}>
            {messages.map((msg, index) => (
              <div
                key={`${msg.role}-${index}`}
                className={`assistant-message ${msg.role === "user" ? "user" : "assistant"}`}
              >
                {msg.content}
              </div>
            ))}
          </div>

          <div className="assistant-footer">
            <textarea
              className="assistant-input"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("chat.placeholder")}
            />
            <button
              className="assistant-send"
              type="button"
              onClick={sendMessage}
              disabled={loading}
            >
              {loading ? "..." : t("chat.send")}
            </button>
          </div>

          {error ? <div className="assistant-error">{error}</div> : null}
        </div>
      )}

      <button
        className="assistant-fab"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "×" : "AI"}
      </button>
    </div>
  );
}

export default ChatWidget;
