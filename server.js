const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 EXATAMENTE IGUAL AO SEU QUE FUNCIONA
const standardHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  "Accept": "*/*",
  "Connection": "keep-alive"
};

app.get("/", (req, res) => {
  res.send("Backend IPTV FINAL (LOGIN ORIGINAL + iOS FIX) 🚀");
});


// ================= LOGIN (NÃO MEXER) =================
app.post("/login", async (req, res) => {
  try {
    const { dns, username, password, action } = req.body;
    const act = action || "get_live_streams";

    const url = `${dns}/player_api.php?username=${username}&password=${password}&action=${act}`;

    const response = await fetch(url, {
      headers: standardHeaders
      // 🔥 REMOVIDO timeout e size
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


// ================= PLAYER (SÓ AQUI MEXE) =================
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

    // 🔥 HLS (.m3u8) → FIX iOS
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
