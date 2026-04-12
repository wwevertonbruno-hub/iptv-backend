const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 HEADERS ULTRA COMPLETOS (SIMULA APP + NAVEGADOR)
const standardHeaders = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 11; SM-G998B) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "X-Requested-With": "com.nst.iptvsmartersbox",
  "Origin": "http://aptxu.com",
  "Referer": "http://aptxu.com/",
  "Connection": "keep-alive"
};

app.get("/", (req, res) => {
  res.send("Backend IPTV v10.0 (ANTI 403 + iOS FIX + FULL) 🚀");
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

    // 🔥 TENTA SEGUNDO HEADER SE DER 403
    if (response.status === 403) {
      console.log("403 detectado → tentando fallback");

      const fallbackHeaders = {
        "User-Agent": "IPTVSmartersPlayer",
        "Accept": "*/*",
        "Connection": "keep-alive"
      };

      const retry = await fetch(url, {
        headers: fallbackHeaders
      });

      if (!retry.ok) {
        return res.status(403).json({
          error: "IPTV bloqueou (403)",
          dica: "Servidor bloqueando IP do Railway"
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


// ================= EPG =================
app.post("/epg", async (req, res) => {
  try {
    const { dns, username, password, stream_id } = req.body;

    const url = `${dns}/player_api.php?username=${username}&password=${password}&action=get_short_epg&stream_id=${stream_id}`;

    const response = await fetch(url, {
      headers: standardHeaders
    });

    const data = await response.json();

    let epg = [];

    if (data.epg_listings) {
      epg = data.epg_listings.map(item => ({
        title: item.title
          ? Buffer.from(item.title, "base64").toString("utf-8")
          : "",
        start: item.start,
        end: item.end
      }));
    }

    res.json({ epg });

  } catch {
    res.status(500).json({ error: "Erro EPG" });
  }
});


// ================= PLAYER =================
app.get("/play", async (req, res) => {
  try {
    const streamUrl = req.query.url;

    if (!streamUrl) {
      return res.status(400).send("URL não informada");
    }

    console.log("STREAM:", streamUrl);

    const response = await fetch(streamUrl, {
      headers: standardHeaders
    });

    const contentType = response.headers.get("content-type") || "";

    // 🔥 HLS (.m3u8)
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

    // 🔥 VOD (.mp4 / .mkv)
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
