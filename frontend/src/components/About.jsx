import React from "react";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import "./style.css";

const HIGHLIGHTS = [
  {
    label: "70+",
    caption: "рынка и девелоперов мы анализируем ежемесячно",
  },
  {
    label: "12",
    caption: "городов в аналитике, три — в глубоком ежедневном мониторинге",
  },
  {
    label: "24/7",
    caption: "мы отслеживаем новости, чтобы вы видели тренды вовремя",
  },
];

const TEAM_VALUES = [
  {
    title: "Прозрачность рынка",
    text: "Мы делимся цифрами, которые помогают девелоперам, банкам и инвесторам принимать решения без догадок.",
  },
  {
    title: "Человечный тон",
    text: "Избавляемся от сухих пресс-релизов — рассказываем истории о городах и проектах на понятном языке.",
  },
  {
    title: "Скорость",
    text: "Работаем в режиме дайджеста: всё главное по рынку в одном месте, обновляется каждый день.",
  },
];

function About() {
  return (
    <div className="page-shell">
      <SiteHeader actionLabel="Назад к ленте" actionTo="/" />
      <main className="container narrow about-grid">
        <section className="glass-panel about-hero">
          <p className="eyebrow">Команда EstatePulse</p>
          <h1>Мы переводим пульс рынка в понятные решения</h1>
          <p className="hero-description">
            EstatePulse — это редакция аналитиков и журналистов, которые каждый день собирают данные о новостройках,
            сделках и городской инфраструктуре. Мы соединяем цифры и истории, чтобы девелоперы и инвесторы видели
            живую картину рынка, а не сухие отчеты.
          </p>
          <div className="about-highlights">
            {HIGHLIGHTS.map((item) => (
              <article key={item.label}>
                <strong>{item.label}</strong>
                <span>{item.caption}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="glass-panel about-values">
          <header>
            <p className="eyebrow">Что нас двигает</p>
            <h2>Три принципа, которые мы не нарушаем</h2>
          </header>
          <div className="value-columns">
            {TEAM_VALUES.map((value) => (
              <article key={value.title}>
                <h3>{value.title}</h3>
                <p>{value.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="glass-panel about-cta">
          <div>
            <p className="eyebrow">Хотите делиться инсайтами?</p>
            <h2>Расскажите нам о своих проектах</h2>
            <p>
              Пишите на <a href="mailto:hello@estatepulse.kz">hello@estatepulse.kz</a> или присоединяйтесь к закрытому чату
              аналитиков. Мы открыты к коллаборациям и гостевым колонкам.
            </p>
          </div>
          <a className="btn btn-primary" href="mailto:hello@estatepulse.kz">Написать редакции</a>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

export default About;
