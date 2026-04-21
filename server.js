const express = require("express");
const cors = require("cors");
const { Readable } = require("stream");
const https = require("https");
const http = require("http");

const app = express();
app.use(cors());
app.use(express.json());

// agentes keep-alive (melhora conexão)
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

// HEADERS mais “reais”
const buildHeaders = (dns) => ({
  "User-Agent": "IPTV Smarters Pro",
  "Accept": "*/*",
  "Connection": "keep-alive",
  "Referer": dns,
  "Origin": dns,
  "X-Requested-With": "XMLHttpRequest"
});

app.get("/", (req, res) => {
  res.send("Backend IPTV v20 (ANTI-403 + IOS + DEBUG) 🚀");
});


// ================= LOGIN =================
app.post("/login", async (req, res) => {
  try {
    const { dns, username, password, action } = req.body;

    if (!dns || !username || !password) {
      return res.status(400).json({
        error: "Preencha DNS, usuário e senha"
      });
    }

    const act = action || "get_live_streams";

    const url = `${dns}/player_api.php?username=${username}&password=${password}&action=${act}`;

    const response = await fetch(url, {
      headers: buildHeaders(dns),
      redirect: "follow",
      agent: url.startsWith("https") ? httpsAgent : httpAgent
    });

    const text = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Servidor IPTV recusou",
        status_origem: response.status,
        resposta: text // 👈 ESSENCIAL PRA DEBUG
      });
    }

    try {
      const data = JSON.parse(text);
      res.json(data);
    } catch {
      res.send(text);
    }

  } catch (err) {
    res.status(500).json({
      error: "Falha de conexão",
      detalhe: err.message
    });
  }
});


// ================= IMG =================
app.get("/img", async (req, res) => {
  try {
    const url = decodeURIComponent(req.query.url);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    res.set(
      "Content-Type",
      response.headers.get("content-type") || "image/jpeg"
    );

    const stream = Readable.fromWeb(response.body);
    stream.pipe(res);

  } catch (err) {
    res.status(500).json({
      error: "Erro ao carregar imagem",
      detalhe: err.message
    });
  }
});


// ================= PLAYER (IOS + HLS FIX) =================
app.get("/play", async (req, res) => {
  try {
    const streamUrl = req.query.url;
    const range = req.headers.range;

    if (!streamUrl) {
      return res.status(400).json({ error: "URL não informada" });
    }

    const response = await fetch(streamUrl, {
      headers: {
        "User-Agent": "VLC/3.0.18",
        "Accept": "*/*",
        "Connection": "keep-alive",
        ...(range ? { Range: range } : {})
      },
      redirect: "follow",
      agent: streamUrl.startsWith("https") ? httpsAgent : httpAgent
    });

    // HEADERS importantes pra iOS
    res.set("Content-Type", response.headers.get("content-type") || "application/vnd.apple.mpegurl");
    res.set("Accept-Ranges", "bytes");

    if (response.headers.get("content-range")) {
      res.set("Content-Range", response.headers.get("content-range"));
      res.status(206);
    } else {
      res.status(200);
    }

    // evitar buffering travado no Safari
    res.set("Cache-Control", "no-cache");

    const stream = Readable.fromWeb(response.body);
    stream.pipe(res);

  } catch (err) {
    res.status(500).json({
      error: "Erro ao reproduzir",
      detalhe: err.message
    });
  }
});


const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor rodando na porta " + PORT);
});
