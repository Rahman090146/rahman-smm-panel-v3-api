import express from "express";
import cors from "cors";
import { LowSync, JSONFileSync } from "lowdb";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Database
const file = path.join(process.cwd(), "db.json");
const adapter = new JSONFileSync(file);
const db = new LowSync(adapter);
db.read();
db.data ||= { users: [], services: [], orders: [], balance: 30000 };

// ✅ Route utama
app.get("/", (req, res) => {
  res.send("✅ Rahman SMM Panel v3 API aktif dan berjalan lancar!");
});

app.get("/api/balance", (req, res) => {
  res.json({ balance: db.data.balance });
});

app.post("/api/topup", (req, res) => {
  db.data.balance += 10000;
  db.write();
  res.json({ success: true, balance: db.data.balance });
});

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

app.get("/api/orders", (req, res) => {
  res.json(db.data.orders);
});

export default app;
