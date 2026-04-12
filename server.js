const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Headers atualizados (funcionando sem 403)
const standardHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  "Accept": "*/*",
  "Connection": "keep-alive"
};

app.get("/", (req, res) => {
  res.send("Backend IPTV v6.0 (EPG Inteligente) 🚀");
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


// ================= INFO =================
app.post("/info", async (req, res) => {
  try {
    const { dns, username, password, type, id } = req.body;

    const actionType = type === "series" ? "get_series_info" : "get_vod_info";
    const idParam = type === "series" ? "series_id" : "vod_id";

    const url = `${dns}/player_api.php?username=${username}&password=${password}&action=${actionType}&${idParam}=${id}`;

    const response = await fetch(url, {
      headers: standardHeaders,
      timeout: 10000
    });

    const data = await response.json();
    res.json(data);

  } catch {
    res.status(500).json({ error: "Erro ao buscar detalhes" });
  }
});


// ================= EPG INTELIGENTE =================
app.post("/epg", async (req, res) => {
  try {
    const { dns, username, password, stream_id } = req.body;

    if (!dns || !username || !password || !stream_id) {
      return res.status(400).json({
        error: "Preencha dns, username, password e stream_id"
      });
    }

    // 1️⃣ tenta EPG curto
    let url = `${dns}/player_api.php?username=${username}&password=${password}&action=get_short_epg&stream_id=${stream_id}`;
    
    let response = await fetch(url, {
      headers: standardHeaders,
      timeout: 15000
    });

    let data = await response.json();

    // 2️⃣ fallback automático se vazio
    if (!data.epg_listings || data.epg_listings.length === 0) {
      url = `${dns}/player_api.php?username=${username}&password=${password}&action=get_simple_data_table&stream_id=${stream_id}`;
      
      response = await fetch(url, {
        headers: standardHeaders,
        timeout: 15000
      });

      data = await response.json();
    }

    // 3️⃣ decode base64
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


// ================= PLAYER =================
app.get("/play", async (req, res) => {
  try {
    const streamUrl = req.query.url;
    const range = req.headers.range;

    const fetchOptions = {
      headers: {
        ...standardHeaders,
        ...(range && { Range: range })
      },
      compress: false
    };

    const r = await fetch(streamUrl, fetchOptions);

    res.set("Content-Type", r.headers.get("content-type") || "video/mp4");
    res.set("Accept-Ranges", "bytes");

    if (r.headers.get("content-range")) {
      res.set("Content-Range", r.headers.get("content-range"));
    }

    if (r.headers.get("content-length")) {
      res.set("Content-Length", r.headers.get("content-length"));
    }

    res.status(r.status);
    r.body.pipe(res);

  } catch {
    res.status(500).send("Erro ao reproduzir");
  }
});


const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor rodando na porta " + PORT);
});
