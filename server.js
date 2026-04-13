const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let activeStreams = 0;
const MAX_STREAMS = 3; // evita crash

const standardHeaders = {
  "User-Agent": "IPTVSmartersPlayer",
  "Accept": "*/*",
  "Origin": "http://aptxu.com",
  "Referer": "http://aptxu.com/",
  "Connection": "keep-alive"
};

app.get("/", (req, res) => {
  res.send("Backend estável 🚀");
});

// LOGIN (seguro)
app.post("/login", async (req, res) => {
  try {
    const { dns, username, password, action } = req.body;
    const act = action || "get_live_streams";

    const url = `${dns}/player_api.php?username=${username}&password=${password}&action=${act}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: standardHeaders,
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Servidor IPTV recusou",
        status: response.status
      });
    }

    const data = await response.json();
    res.json(data);

  } catch (err) {
    res.status(500).json({ error: "Falha", detalhe: err.message });
  }
});

// PLAYER (ANTI-CRASH)
app.get("/play", async (req, res) => {
  if (activeStreams >= MAX_STREAMS) {
    return res.status(503).send("Muitos streams ativos");
  }

  activeStreams++;

  try {
    const streamUrl = req.query.url;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const r = await fetch(streamUrl, {
      headers: standardHeaders,
      signal: controller.signal
    });

    clearTimeout(timeout);

    res.setHeader("Content-Type", r.headers.get("content-type") || "video/mp4");
    res.setHeader("Accept-Ranges", "bytes");

    const stream = r.body;

    // 🔥 evita crash
    stream.on("error", () => {
      res.end();
    });

    res.on("close", () => {
      stream.destroy();
      activeStreams--;
    });

    res.on("finish", () => {
      stream.destroy();
      activeStreams--;
    });

    stream.pipe(res);

  } catch (err) {
    activeStreams--;
    res.status(500).send("Erro no stream");
  }
});

app.listen(8080, () => {
  console.log("Servidor rodando");
});
