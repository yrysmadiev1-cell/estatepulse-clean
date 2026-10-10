import React from "react";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import "./style.css";
export default function About() {
  return <div className="page-shell">
    <SiteHeader actionLabel="На главную" actionTo="/" />
    <main className="container narrow"><section className="glass-panel">
      <p className="eyebrow">Дипломный проект</p>
      <h1>EstatePulse</h1>
      <p className="hero-description">Веб-приложение для ориентировочной оценки квартир в Астане и публикации материалов о недвижимости.</p>
      <h2>Как работает оценка</h2>
      <p>Модель обучается на характеристиках объявлений: площади, комнатах, этажности, годе постройки, типе дома, состоянии и районе. Данные собраны в январе 2026 года.</p>
      <h2>Возможности</h2>
      <p>Оценка квартиры, личная история расчётов, регистрация и публикация статей администратором. Лента содержит разделы для Алматы, Астаны и Шымкента; модель оценки поддерживает только Астану.</p>
      <h2>Ограничения</h2>
      <p>Результат — оценка цены предложения, а не цены сделки или профессиональное заключение оценщика. Прогноз на будущие годы, автоматический мониторинг новостей и обновление цен пока не реализованы.</p>
      <p>Автор: Ырысдаулет Мадиев. <a href="https://github.com/yrysmadiev1-cell/estatepulse-clean">Исходный код и методология</a>.</p>
    </section></main><SiteFooter />
  </div>;
}
