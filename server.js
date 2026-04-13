const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Headers para evitar bloqueio
const standardHeaders = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile Safari/604.1",
  "Accept": "*/*",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8",
  "Connection": "keep-alive"
};

app.get("/", (req, res) => {
  res.send("Backend IPTV iOS Ready 🚀");
});

// PLAYER (100% ajustado para iOS)
app.get("/play", async (req, res) => {
  try {
    const streamUrl = req.query.url;
    const range = req.headers.range;

    if (!streamUrl) {
      return res.status(400).send("URL não fornecida");
    }

    const headers = {
      ...standardHeaders,
      ...(range ? { Range: range } : {})
    };

    const response = await fetch(streamUrl, {
      headers,
      compress: false
    });

    // Detecta tipo de stream
    let contentType = response.headers.get("content-type") || "";

    if (streamUrl.includes(".m3u8")) {
      contentType = "application/vnd.apple.mpegurl";
    } else if (contentType.includes("mpegurl")) {
      contentType = "application/vnd.apple.mpegurl";
    } else if (contentType.includes("mp2t")) {
      contentType = "video/mp2t";
    } else {
      contentType = "video/mp4";
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    if (response.headers.get("content-length")) {
      res.setHeader("Content-Length", response.headers.get("content-length"));
    }

    if (response.headers.get("content-range")) {
      res.setHeader("Content-Range", response.headers.get("content-range"));
      res.status(206);
    } else if (range) {
      res.status(206);
    } else {
      res.status(200);
    }

    response.body.pipe(res);

  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao reproduzir stream");
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor rodando na porta", PORT);
});
