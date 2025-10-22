import express from "express";
import cors from "cors";
import { LowSync, JSONFileSync } from "lowdb";
import path from "path";
import { fileURLToPath } from "url";

// setup __dirname untuk ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// buat express app
const app = express();
app.use(cors());
app.use(express.json());

// setup database JSON
const file = path.join(process.cwd(), "db.json");
const adapter = new JSONFileSync(file);
const db = new LowSync(adapter);
db.read();
db.data ||= { users: [], services: [], orders: [], balance: 30000 };

// routes utama
app.get("/", (req, res) => {
  res.status(200).send("✅ Rahman SMM Panel v3 API aktif dan berjalan lancar!");
});

app.get("/balance", (req, res) => {
  res.json({ balance: db.data.balance });
});

app.post("/topup", (req, res) => {
  db.data.balance += 10000;
  db.write();
  res.json({ success: true, balance: db.data.balance });
});

app.post("/order", (req, res) => {
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

app.get("/orders", (req, res) => {
  res.json(db.data.orders);
});

// ✅ ekspor express ke vercel
export default function handler(req, res) {
  return app(req, res);
}
