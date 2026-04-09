const express = require("express");
const fetch = require("node-fetch");

const app = express();

const BASE = "http://aptxu.com";
const USER = "EzFgZ4v3w";
const PASS = "vyesZtxZk";

const headers = {
  "User-Agent": "VLC/3.0.0 LibVLC",
  "Referer": BASE,
  "Accept": "*/*"
};

// ✅ rota principal (teste)
app.get("/", (req, res) => {
  res.send("Backend rodando 🚀");
});

// canais
app.get("/live", async (req, res) => {
  const r = await fetch(`${BASE}/player_api.php?username=${USER}&password=${PASS}&action=get_live_streams`, { headers });
  res.json(await r.json());
});

// imagens
app.get("/img", async (req, res) => {
  const r = await fetch(req.query.url, { headers });
  res.set("Content-Type", r.headers.get("content-type"));
  r.body.pipe(res);
});

// player
app.get("/play", async (req, res) => {
  const r = await fetch(req.query.url, { headers });
  res.set("Content-Type", r.headers.get("content-type"));
  r.body.pipe(res);
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor rodando na porta " + PORT);
});
