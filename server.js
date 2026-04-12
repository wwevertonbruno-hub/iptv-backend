const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 HEADERS SIMPLES (ESSENCIAL PRA NÃO DAR 403)
const standardHeaders = {
  "User-Agent": "Mozilla/5.0",
  "Accept": "*/*",
  "Connection": "keep-alive"
};

app.get("/", (req, res) => {
  res.send("Backend IPTV vFINAL (NO 403 + iOS FIX) 🚀");
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

    let url = `${dns}/player_api.php?username=${username}&password=${password}&action=get_short_epg&stream_id=${stream_id}`;
    
    let response = await fetch(url, { headers: standardHeaders });
    let data = await response.json();

    if (!data.epg_listings || data.epg_listings.length === 0) {
      url = `${dns}/player_api.php?username=${username}&password=${password}&action=get_simple_data_table&stream_id=${stream_id}`;
      response = await fetch(url, { headers: standardHeaders });
      data = await response.json();
    }

    let epg = [];

    if (data.epg_listings) {
      epg = data.epg_listings.map(item => ({
        title: item.title ? Buffer.from(item.title, "base64").toString("utf-8") : "",
        start: item.start,
        end: item.end
      }));
    }

    res.json({ epg });

  } catch {
    res.status(500).json({ error: "Erro EPG" });
  }
});


// ================= PLAYER (FIX iOS SEM DAR 403) =================
app.get("/play", async (req, res) => {
  try {
    const streamUrl = req.query.url;

    if (!streamUrl) {
      return res.status(400).send("URL não informada");
    }

    const response = await fetch(streamUrl, {
      headers: standardHeaders
    });

    const contentType = response.headers.get("content-type") || "";

    // 🔥 HLS (.m3u8) — REESCREVE PARA iOS
    if (streamUrl.includes(".m3u8") || contentType.includes("mpegurl")) {
      let body = await response.text();

      const baseUrl = streamUrl.substring(0, streamUrl.lastIndexOf("/") + 1);

      body = body.replace(/(?!#)(.*)/g, (line) => {
        if (!line || line.startsWith("#")) return line;

        const absoluteUrl = line.startsWith("http")
          ? line
          : baseUrl + line;

        return `/play?url=${encodeURIComponent(absoluteUrl)}`;
      });

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.setHeader("Access-Control-Allow-Origin", "*");

      return res.send(body);
    }

    // 🔥 VOD NORMAL
    const range = req.headers.range;

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", contentType || "video/mp4");
    res.setHeader("Accept-Ranges", "bytes");

    if (range) {
      const stream = await fetch(streamUrl, {
        headers: { ...standardHeaders, Range: range }
      });

      res.status(206);
      return stream.body.pipe(res);
    }

    response.body.pipe(res);

  } catch (err) {
    console.error(err);
    res.status(500).send("Erro no player");
  }
});


const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor rodando na porta " + PORT);
});
