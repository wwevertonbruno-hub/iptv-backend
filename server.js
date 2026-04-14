const express = require("express");
const cors = require("cors");
const { Readable } = require("stream");

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 HEADERS ANTI-BLOQUEIO (ESSENCIAL)
const standardHeaders = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "http://aptxu.com/",
  "Origin": "http://aptxu.com",
  "Connection": "keep-alive"
};

app.get("/", (req, res) => {
  res.send("Backend IPTV v11.0 (ANTI-403 + NGROK FIX) 🚀");
});


// ================= LOGIN =================
app.post("/login", async (req, res) => {
  try {
    const { dns, username, password, action } = req.body;

    const act = action || "get_live_streams";

    const url = `${dns}/player_api.php?username=${username}&password=${password}&action=${act}`;

    console.log("LOGIN:", url);

    const response = await fetch(url, {
      headers: standardHeaders
    });

    // 🔥 TENTA NOVAMENTE COM OUTRO USER-AGENT (fallback)
    if (response.status === 403) {
      console.log("Tentando bypass 403...");

      const altHeaders = {
        ...standardHeaders,
        "User-Agent": "VLC/3.0.0 LibVLC"
      };

      const retry = await fetch(url, { headers: altHeaders });

      if (!retry.ok) {
        return res.status(403).json({
          error: "IPTV bloqueou (403)",
          dica: "Servidor bloqueando IP (ngrok/local)"
        });
      }

      const data = await retry.json();
      return res.json(data);
    }

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

    const response = await fetch(url, { headers: standardHeaders });

    const data = await response.json();
    res.json(data);

  } catch {
    res.status(500).json({ error: "Erro ao buscar detalhes" });
  }
});


// ================= IMG (FIX NODE 18+) =================
app.get("/img", async (req, res) => {
  try {
    const url = decodeURIComponent(req.query.url);

    const response = await fetch(url);

    res.set("Content-Type", response.headers.get("content-type") || "image/jpeg");

    const stream = Readable.fromWeb(response.body);
    stream.pipe(res);

  } catch (err) {
    res.status(500).json({
      error: "Erro ao carregar imagem",
      detalhe: err.message
    });
  }
});


// ================= PLAYER =================
app.get("/play", async (req, res) => {
  try {
    const streamUrl = req.query.url;
    const range = req.headers.range;

    const response = await fetch(streamUrl, {
      headers: {
        ...standardHeaders,
        ...(range && { Range: range })
      }
    });

    res.set("Content-Type", response.headers.get("content-type") || "video/mp4");
    res.set("Accept-Ranges", "bytes");

    if (response.headers.get("content-range")) {
      res.set("Content-Range", response.headers.get("content-range"));
    }

    if (response.headers.get("content-length")) {
      res.set("Content-Length", response.headers.get("content-length"));
    }

    res.status(response.status);

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
