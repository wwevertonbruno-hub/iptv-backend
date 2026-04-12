const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// HEADERS OTIMIZADOS (ANTI-BLOQUEIO)
const standardHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  "Accept": "*/*",
  "Connection": "keep-alive"
};

app.get("/", (req, res) => {
  res.send("Backend IPTV v7.0 (PLAYER FIX + EPG + STABLE) 🚀");
});


// ================= LOGIN =================
app.post("/login", async (req, res) => {
  try {
    const { dns, username, password, action } = req.body;
    const act = action || "get_live_streams";

    const url = `${dns}/player_api.php?username=${username}&password=${password}&action=${act}`;

    const response = await fetch(url, {
      headers: standardHeaders,
      timeout: 30000,
      size: 0
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Servidor IPTV recusou",
        status_origem: response.status
      });
    }

    const data = await response.json();
    res.json(data);

  } catch (err) {
    res.status(500).json({
      error: "Falha de conexão",
      detalhe: err.message
    });
  }
});


// ================= EPG =================
app.post("/epg", async (req, res) => {
  try {
    const { dns, username, password, stream_id } = req.body;

    if (!dns || !username || !password || !stream_id) {
      return res.status(400).json({
        error: "Preencha dns, username, password e stream_id"
      });
    }

    let url = `${dns}/player_api.php?username=${username}&password=${password}&action=get_short_epg&stream_id=${stream_id}`;
    
    let response = await fetch(url, {
      headers: standardHeaders,
      timeout: 15000
    });

    let data = await response.json();

    if (!data.epg_listings || data.epg_listings.length === 0) {
      url = `${dns}/player_api.php?username=${username}&password=${password}&action=get_simple_data_table&stream_id=${stream_id}`;
      
      response = await fetch(url, {
        headers: standardHeaders,
        timeout: 15000
      });

      data = await response.json();
    }

    let epg = [];

    if (data.epg_listings) {
      epg = data.epg_listings.map(item => ({
        title: item.title
          ? Buffer.from(item.title, "base64").toString("utf-8")
          : "",
        description: item.description
          ? Buffer.from(item.description, "base64").toString("utf-8")
          : "",
        start: item.start,
        end: item.end
      }));
    }

    res.json({
      total: epg.length,
      epg
    });

  } catch (err) {
    res.status(500).json({
      error: "Erro ao carregar EPG",
      detalhe: err.message
    });
  }
});


// ================= PLAYER (CORRIGIDO) =================
app.get("/play", async (req, res) => {
  try {
    const streamUrl = req.query.url;

    if (!streamUrl) {
      return res.status(400).send("URL do stream não informada");
    }

    console.log("STREAM:", streamUrl);

    const range = req.headers.range;

    const fetchOptions = {
      headers: {
        ...standardHeaders,
        ...(range && { Range: range })
      },
      compress: false
    };

    const r = await fetch(streamUrl, fetchOptions);

    // HEADERS ESSENCIAIS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD");

    res.setHeader(
      "Content-Type",
      r.headers.get("content-type") || "application/vnd.apple.mpegurl"
    );

    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    if (r.headers.get("content-range")) {
      res.setHeader("Content-Range", r.headers.get("content-range"));
    }

    if (r.headers.get("content-length")) {
      res.setHeader("Content-Length", r.headers.get("content-length"));
    }

    res.status(r.status);

    r.body.pipe(res);

  } catch (err) {
    console.error("ERRO PLAY:", err.message);
    res.status(500).send("Erro ao reproduzir stream");
  }
});


// ================= IMG =================
app.get("/img", async (req, res) => {
  try {
    const r = await fetch(req.query.url, { headers: standardHeaders });
    res.set("Content-Type", r.headers.get("content-type"));
    r.body.pipe(res);
  } catch {
    res.status(500).send("Erro imagem");
  }
});


const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor rodando na porta " + PORT);
});
