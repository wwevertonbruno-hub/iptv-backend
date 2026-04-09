const express = require("express");
const fetch = require("node-fetch");

const app = express();

// 🔐 CONFIG IPTV
const BASE = "http://aptxu.com";
const USER = "EzFgZ4v3w";
const PASS = "vyesZtxZk";

// 🔥 HEADERS ANTI-BLOQUEIO
const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  "Referer": BASE,
  "Origin": BASE,
  "Accept": "*/*",
  "Connection": "keep-alive"
};

// ✅ TESTE BACKEND
app.get("/", (req, res) => {
  res.send("Backend rodando 🚀");
});

// 📺 LISTA DE CANAIS
app.get("/live", async (req, res) => {
  try {
    const response = await fetch(`${BASE}/player_api.php?username=${USER}&password=${PASS}&action=get_live_streams`, {
      headers,
      timeout: 10000
    });

    if (!response.ok) {
      return res.status(500).json({
        error: "Erro ao buscar IPTV",
        status: response.status
      });
    }

    const data = await response.json();
    res.json(data);

  } catch (err) {
    res.status(500).json({
      error: "Falha na conexão com IPTV",
      detalhe: err.message
    });
  }
});

// 🖼️ PROXY DE IMAGEM (BANNERS)
app.get("/img", async (req, res) => {
  try {
    const response = await fetch(req.query.url, { headers });

    if (!response.ok) {
      return res.status(500).send("Erro ao carregar imagem");
    }

    res.set("Content-Type", response.headers.get("content-type"));
    response.body.pipe(res);

  } catch (err) {
    res.status(500).send("Erro na imagem");
  }
});

// 🎬 PROXY DE STREAM (PLAYER)
app.get("/play", async (req, res) => {
  try {
    const response = await fetch(req.query.url, { headers });

    if (!response.ok) {
      return res.status(500).send("Erro ao carregar stream");
    }

    res.set("Content-Type", response.headers.get("content-type"));
    response.body.pipe(res);

  } catch (err) {
    res.status(500).send("Erro no stream");
  }
});

// 🚀 PORTA RAILWAY
const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor rodando na porta " + PORT);
});
