const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const mongoose = require("mongoose");

process.env.NODE_ENV = "test";
process.env.GROQ_API_KEY = "";

const app = require("../server");
const Evaluation = require("../models/Evaluation");
const SupportThread = require("../models/SupportThread");

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-me";
const User = mongoose.model("User");

function makeToken() {
  return jwt.sign(
    {
      id: "user-1",
      name: "Aruzhan",
      email: "aruzhan@example.com",
      role: "reader",
    },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

function makeAdminToken() {
  return jwt.sign(
    {
      id: "admin-1",
      name: "Admin",
      email: "admin@example.com",
      role: "admin",
    },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

describe("EstatePulse backend API", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("registers a new reader and returns a JWT", async () => {
    jest.spyOn(User, "findOne").mockResolvedValue(null);
    jest.spyOn(User, "create").mockResolvedValue({
      _id: "user-1",
      toSafeObject: () => ({
        id: "user-1",
        name: "Aruzhan",
        email: "aruzhan@example.com",
        role: "reader",
      }),
    });

    const response = await request(app).post("/api/register").send({
      name: "Aruzhan",
      email: "aruzhan@example.com",
      password: "secret123",
    });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Пользователь успешно зарегистрирован");
    expect(response.body.user).toMatchObject({
      id: "user-1",
      name: "Aruzhan",
      email: "aruzhan@example.com",
      role: "reader",
    });
    expect(jwt.verify(response.body.token, JWT_SECRET)).toMatchObject({
      id: "user-1",
      email: "aruzhan@example.com",
    });
  });

  test("rejects a weak registration password", async () => {
    const response = await request(app).post("/api/register").send({
      name: "Aruzhan",
      email: "aruzhan@example.com",
      password: "123",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Пароль должен содержать минимум 8 символов");
  });

  test("logs in an existing user and issues a valid JWT", async () => {
    const passwordHash = await bcrypt.hash("secret123", 10);

    jest.spyOn(User, "findOne").mockResolvedValue({
      passwordHash,
      toSafeObject: () => ({
        id: "user-1",
        name: "Aruzhan",
        email: "aruzhan@example.com",
        role: "reader",
      }),
    });

    const response = await request(app).post("/api/login").send({
      email: "aruzhan@example.com",
      password: "secret123",
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Успешный вход");
    expect(jwt.verify(response.body.token, JWT_SECRET)).toMatchObject({
      id: "user-1",
      email: "aruzhan@example.com",
    });
  });

  test("rejects evaluation history without a JWT", async () => {
    const response = await request(app).get("/api/evaluations");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Требуется авторизация");
  });

  test("saves an evaluation after the ML prediction response", async () => {
    jest.spyOn(axios, "post").mockResolvedValue({
      data: { predicted_price: 25000000 },
    });

    const createMock = jest.spyOn(Evaluation, "create").mockResolvedValue({
      _id: { toString: () => "evaluation-1" },
    });

    const response = await request(app)
      .post("/api/evaluate")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({
        city: "Алматы",
        district: "Медеуский",
        area: 50,
        rooms: 2,
        floor: 5,
        total_floors: 9,
        ceiling_height: 2.7,
        house_age: 12,
        house_type: "brick",
        condition: "good",
        newsSnapshot: {
          city: "Алматы",
          short_term: {
            normalizedIndex: 12.3,
            count: 7,
            positiveCount: 4,
            negativeCount: 1,
            neutralCount: 2,
            avgImpactScore: 68.4,
          },
          medium_term: {
            normalizedIndex: -4.5,
            count: 17,
            positiveCount: 6,
            negativeCount: 8,
            neutralCount: 3,
            avgImpactScore: 51.2,
          },
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      evaluation_id: "evaluation-1",
      predicted_price: 25000000,
      price_per_m2: 500000,
      forecast: expect.objectContaining({
        model: "rules-based",
        confidence: expect.any(Number),
        yearly: expect.any(Array),
        news_snapshot: expect.objectContaining({
          city: "Алматы",
        }),
      }),
    });
    expect(response.body.forecast.yearly).toHaveLength(3);
    expect(response.body.forecast.yearly[0]).toEqual(
      expect.objectContaining({
        year: 1,
        base_price: expect.any(Number),
        conservative_price: expect.any(Number),
        optimistic_price: expect.any(Number),
      })
    );
    expect(axios.post).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/predict",
      expect.objectContaining({
        city: "Алматы",
        district: "Медеуский",
      })
    );
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          id: "user-1",
          name: "Aruzhan",
          email: "aruzhan@example.com",
        }),
        input: expect.objectContaining({
          city: "Алматы",
          district: "Медеуский",
          area: 50,
        }),
        predicted_price: 25000000,
        price_per_m2: 500000,
        news_snapshot: expect.objectContaining({
          city: "Алматы",
        }),
        forecast: expect.objectContaining({
          yearly: expect.any(Array),
          summary: expect.any(String),
        }),
      })
    );
  });

  test("creates a support thread for a logged-in user", async () => {
    const createMock = jest.spyOn(SupportThread, "create").mockResolvedValue({
      _id: "thread-1",
      subject: "Ошибка в оценке",
      user: {
        id: "user-1",
        name: "Aruzhan",
        email: "aruzhan@example.com",
        role: "reader",
      },
      status: "open",
      messages: [
        {
          senderRole: "user",
          sender: {
            id: "user-1",
            name: "Aruzhan",
            email: "aruzhan@example.com",
            role: "reader",
          },
          text: "Проверьте, пожалуйста, цену",
        },
      ],
      toObject: () => ({
        _id: "thread-1",
        subject: "Ошибка в оценке",
        user: {
          id: "user-1",
          name: "Aruzhan",
          email: "aruzhan@example.com",
          role: "reader",
        },
        status: "open",
        messages: [
          {
            senderRole: "user",
            sender: {
              id: "user-1",
              name: "Aruzhan",
              email: "aruzhan@example.com",
              role: "reader",
            },
            text: "Проверьте, пожалуйста, цену",
          },
        ],
      }),
    });

    const response = await request(app)
      .post("/api/support/threads")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({
        subject: "Ошибка в оценке",
        message: "Проверьте, пожалуйста, цену",
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      _id: "thread-1",
      subject: "Ошибка в оценке",
      status: "open",
      user: expect.objectContaining({ id: "user-1" }),
      messages: expect.any(Array),
    });
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Ошибка в оценке",
        user: expect.objectContaining({ id: "user-1" }),
        messages: expect.any(Array),
      })
    );
  });

  test("lists support threads for an admin user", async () => {
    const findMock = jest.spyOn(SupportThread, "find").mockReturnValue({
      sort: () => ({
        lean: () =>
          Promise.resolve([
            {
              _id: "thread-1",
              subject: "Ошибка в оценке",
              status: "open",
              user: {
                id: "user-1",
                name: "Aruzhan",
                email: "aruzhan@example.com",
              },
              messages: [],
            },
          ]),
      }),
    });

    const response = await request(app)
      .get("/api/support/threads")
      .set("Authorization", `Bearer ${makeAdminToken()}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      _id: "thread-1",
      subject: "Ошибка в оценке",
      status: "open",
    });
    expect(findMock).toHaveBeenCalled();
  });
});