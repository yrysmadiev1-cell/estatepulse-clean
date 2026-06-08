import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Evaluate from "../Evaluate";

jest.mock("react-router-dom", () => {
  const React = require("react");

  return {
    Link: ({ children, to, ...props }) => {
      const href = typeof to === "string" ? to : to?.pathname || "/";
      return (
        <a href={href} {...props}>
          {children}
        </a>
      );
    },
    MemoryRouter: ({ children }) => <>{children}</>,
    useLocation: () => ({ pathname: "/evaluate", search: "" }),
  };
}, { virtual: true });

const indexResponse7 = {
  normalizedIndex: 12.3,
  positiveCount: 4,
  negativeCount: 1,
  neutralCount: 2,
  count: 7,
  avgImpactScore: 68.4,
};

const indexResponse30 = {
  normalizedIndex: -4.5,
  positiveCount: 6,
  negativeCount: 8,
  neutralCount: 3,
  count: 17,
  avgImpactScore: 51.2,
};

const forecastResponse = {
  evaluation_id: "evaluation-1",
  predicted_price: 25000000,
  price_per_m2: 500000,
  forecast: {
    model: "llama-3.3-70b-versatile",
    confidence: 0.71,
    confidence_label: "средняя",
    summary: "Прогноз на 1-3 года: умеренный рост цены при стабильном новостном фоне.",
    outlook: "умеренная уверенность в базовом сценарии",
    news_snapshot: {
      city: "Алматы",
      short_term: indexResponse7,
      medium_term: indexResponse30,
    },
    news_signal: {
      city: "Алматы",
      short_term_index: 12.3,
      medium_term_index: -4.5,
      combined_index: 7.2,
      direction: "positive",
      label: "умеренно позитивный",
      adjustment_percent: 1.3,
    },
    yearly: [
      {
        year: 1,
        base_price: 26800000,
        conservative_price: 26250000,
        optimistic_price: 27350000,
        growth_percent: 7.2,
        base_price_per_m2: 536000,
      },
      {
        year: 2,
        base_price: 28600000,
        conservative_price: 27500000,
        optimistic_price: 29700000,
        growth_percent: 14.9,
        base_price_per_m2: 572000,
      },
      {
        year: 3,
        base_price: 30500000,
        conservative_price: 28700000,
        optimistic_price: 32300000,
        growth_percent: 22.8,
        base_price_per_m2: 610000,
      },
    ],
    drivers: ["Базовый рост города", "Новостной фон остается конструктивным"],
    risks: ["Негативный новостной фон может замедлить рост"],
  },
};

function mockIndexFetch(url) {
  const payload = String(url).includes("days=30") ? indexResponse30 : indexResponse7;
  return Promise.resolve({
    ok: true,
    json: async () => payload,
  });
}

function mockFetch(url) {
  const urlString = String(url);

  if (urlString.includes("/api/news/index")) {
    return mockIndexFetch(urlString);
  }

  if (urlString.includes("/api/evaluate")) {
    return Promise.resolve({
      ok: true,
      json: async () => forecastResponse,
    });
  }

  throw new Error(`Unexpected fetch call: ${urlString}`);
}

describe("Evaluate page", () => {
  beforeEach(() => {
    global.fetch = jest.fn(mockFetch);
  });

  afterEach(() => {
    delete global.fetch;
  });

  test("renders the evaluation form and loads the market index blocks", async () => {
    render(
      <Evaluate />
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    await screen.findByText(/Новостной фон \(7 дней\):/);
    await screen.findByText(/Новостной фон \(30 дней\):/);

    expect(screen.getByRole("heading", { name: "Рассчитайте стоимость" })).toBeInTheDocument();
    expect(screen.getByText(/Новостной фон \(7 дней\):/).closest("div")).toHaveTextContent("+12.3");
    expect(screen.getByText(/Новостной фон \(30 дней\):/).closest("div")).toHaveTextContent("-4.5");
    expect(screen.getByLabelText("Район")).toHaveValue("0");
  });

  test("switching city updates the district list for the evaluation form", async () => {
    render(
      <Evaluate />
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    fireEvent.change(screen.getByLabelText("Город", { selector: "#eval-city" }), {
      target: { value: "Астана" },
    });

    await waitFor(() => expect(screen.getByLabelText("Район")).toHaveValue("Алматы р-н"));
    expect(screen.getByRole("option", { name: "Есильский р-н" })).toBeInTheDocument();
  });

  test("submitting the evaluation renders the 1-3 year forecast", async () => {
    render(
      <Evaluate />
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByRole("button", { name: "Оценить" }));

    await screen.findByText("Горизонт 1-3 года");
    expect(screen.getByText("Модель: llama-3.3-70b-versatile")).toBeInTheDocument();
    expect(screen.getByText("Год 1")).toBeInTheDocument();
    expect(screen.getByText(forecastResponse.forecast.summary)).toBeInTheDocument();
    expect(screen.getByText(/Уверенность: 71%/)).toBeInTheDocument();
  });
});