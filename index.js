import express from "express";
import cors from "cors";
import { LowSync, JSONFileSync } from "lowdb";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

// Database
const file = path.join(__dirname, "db.json");
const adapter = new JSONFileSync(file);
const db = new LowSync(adapter);
db.read();
db.data ||= { users: [], orders: [], balance: 30000 };

// Root route
app.get("/", (req, res) => {
  res.send("✅ Rahman SMM Panel v3 API aktif dan berjalan lancar!");
});

// Get balance
app.get("/api/balance", (req, res) => {
  res.json({ balance: db.data.balance });
});

// Topup
app.post("/api/topup", (req, res) => {
  db.data.balance += 10000;
  db.write();
  res.json({ success: true, balance: db.data.balance });
});

// Order
app.post("/api/order", (req, res) => {
  const { service, amount, link } = req.body;
  const price = 15000;
  const total = (price / 1000) * amount;

  if (db.data.balance < total) {
    return res.status(400).json({ error: "Saldo tidak cukup" });
  }

  db.data.balance -= total;
  const order = { id: Date.now(), service, amount, link, total };
  db.data.orders.push(order);
  db.write();

  res.json({ success: true, order });
});

// Orders list
app.get("/api/orders", (req, res) => {
  res.json(db.data.orders);
});

export default app;
