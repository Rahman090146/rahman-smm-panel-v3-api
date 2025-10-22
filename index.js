import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import { LowSync, JSONFileSync } from "lowdb";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

const file = path.join(__dirname, "db.json");
const adapter = new JSONFileSync(file);
const db = new LowSync(adapter);
db.read();
db.data ||= { users: [], orders: [], balance: 30000 };

// 🔹 Root route
app.get("/", (req, res) => {
  res.send("✅ Rahman SMM Panel v3 API aktif!");
});

// 🔹 Get balance
app.get("/api/balance", (req, res) => {
  res.json({ balance: db.data.balance });
});

// 🔹 Topup balance
app.post("/api/topup", (req, res) => {
  db.data.balance += 10000;
  db.write();
  res.json({ success: true, balance: db.data.balance });
});

// 🔹 Create order
app.post("/api/order", (req, res) => {
  const { service, amount, link } = req.body;
  const price = 15000; // harga per 1000
  const total = (price / 1000) * amount;

  if (db.data.balance < total) {
    return res.status(400).json({ error: "Saldo tidak cukup" });
  }

  db.data.balance -= total;
  const newOrder = { id: Date.now(), service, amount, link, total };
  db.data.orders.push(newOrder);
  db.write();

  res.json({ success: true, order: newOrder });
});

// 🔹 Get orders
app.get("/api/orders", (req, res) => {
  res.json(db.data.orders);
});

// 🚀 Export app (tanpa listen!)
export default app;
