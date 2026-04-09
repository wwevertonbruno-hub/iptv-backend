const express = require("express");
const fetch = require("node-fetch");

const app = express();

// permitir JSON no body
app.use(express.json());

// 🔥 HEADERS ANTI-BLOQUEIO
const getHeaders = (base) => ({
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  "Referer": base,
  "Origin": base,
  "Accept": "*/*",
  "Connection": "keep-alive"
});

// ✅ TESTE BACKEND
app.get("/", (req, res) => {
  res.send("Backend rodando 🚀");
});

// 🔐 LOGIN DINÂMICO (XTREAM)
app.post("/login", async (req, res) => {
  try {
    const { dns, username, password } = req.body;

    if (!dns || !username || !password) {
      return res.status(400).json({
        error: "Preencha DNS, usuário e senha"
      });
    }

    const response = await fetch(
      `${dns}/player_api.php?username=${username}&password=${password}&action=get_live_streams`,
      {
        headers: getHeaders(dns),
        timeout: 10000
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Erro ao conectar no servidor IPTV"
      });
    }

    const data = await response.json();
    res.json(data);

  } catch (err) {
    res.status(500).json({
      error: "Falha na conexão",
      detalhe: err.message
    });
  }
});

// 🖼️ PROXY DE IMAGEM
app.get("/img", async (req, res) => {
  try {
    const url = req.query.url;

    if (!url) return res.status(400).send("URL não informada");

    const base = new URL(url).origin;

    const response = await fetch(url, {
      headers: getHeaders(base)
    });

    if (!response.ok) {
      return res.status(500).send("Erro ao carregar imagem");
    }

    res.set("Content-Type", response.headers.get("content-type"));
    response.body.pipe(res);

  } catch (err) {
    res.status(500).send("Erro na imagem");
  }
});

// 🎬 PROXY DE STREAM
app.get("/play", async (req, res) => {
  try {
    const url = req.query.url;

    if (!url) return res.status(400).send("URL não informada");

    const base = new URL(url).origin;

    const response = await fetch(url, {
      headers: getHeaders(base)
    });

    if (!response.ok) {
      return res.status(500).send("Erro ao carregar stream");
    }

    res.set("Content-Type", response.headers.get("content-type"));
    response.body.pipe(res);

  } catch (err) {
    res.status(500).send("Erro no stream");
  }
});

// 🚀 PORTA
const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor rodando na porta " + PORT);
});
