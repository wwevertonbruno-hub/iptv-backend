const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// 🔒 Controle de carga
let activeRequests = 0;
const MAX_REQUESTS = 10;

// Headers mais realistas
const standardHeaders = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)",
  "Accept": "*/*",
  "Referer": "http://aptxu.com/",
  "Origin": "http://aptxu.com",
  "Connection": "keep-alive"
};

app.get("/", (req, res) => {
  res.send("Servidor estável 🚀");
});


// ================= LOGIN =================
app.post("/login", async (req, res) => {
  if (activeRequests > MAX_REQUESTS) {
    return res.status(503).json({ erro: "Servidor ocupado" });
  }

  activeRequests++;

  try {
    const { dns, username, password, action } = req.body;

    const url = `${dns}/player_api.php?username=${username}&password=${password}&action=${action || "get_live_streams"}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: standardHeaders,
      signal: controller.signal
    });

    clearTimeout(timeout);

    // 🔥 Detecta bloqueio Cloudflare (HTML)
    const text = await response.text();

    if (text.includes("Cloudflare") || text.includes("blocked")) {
      return res.status(403).json({
        erro: "Bloqueado pelo servidor IPTV (Cloudflare)"
      });
    }

    // tenta converter para JSON
    try {
      const data = JSON.parse(text);
      res.json(data);
    } catch {
      res.status(500).json({
        erro: "Resposta inválida do IPTV"
      });
    }

  } catch (err) {
    res.status(500).json({
      erro: "Falha de conexão",
      detalhe: err.message
    });
  }

  activeRequests--;
});


// ================= PLAYER (LIMITADO) =================
app.get("/play", async (req, res) => {
  // 🔴 Limite mais agressivo pra evitar crash
  if (activeRequests > 3) {
    return res.status(503).send("Servidor ocupado");
  }

  activeRequests++;

  try {
    const streamUrl = req.query.url;

    if (!streamUrl) {
      activeRequests--;
      return res.status(400).send("URL não fornecida");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(streamUrl, {
      headers: standardHeaders,
      signal: controller.signal
    });

    clearTimeout(timeout);

    const contentType = response.headers.get("content-type") || "video/mp4";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Connection", "close");

    const stream = response.body;

    // 🔥 proteção contra crash
    stream.on("error", () => {
      res.end();
    });

    res.on("close", () => {
      stream.destroy();
      activeRequests--;
    });

    res.on("finish", () => {
      stream.destroy();
      activeRequests--;
    });

    stream.pipe(res);

  } catch (err) {
    activeRequests--;
    res.status(500).send("Erro no stream");
  }
});


// ================= START =================
app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor rodando na porta", PORT);
});
