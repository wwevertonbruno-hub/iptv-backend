const express = require("express");
const cors = require("cors");
const { Readable } = require("stream");

const app = express();
app.use(cors());
app.use(express.json());

// HEADERS
const standardHeaders = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile Safari/604.1",
  "Accept": "*/*",
  "Connection": "keep-alive"
};

app.get("/", (req, res) => {
  res.send("Backend IPTV v12 (NO WARNING + IOS FIX) 🚀");
});


// ================= LOGIN =================
app.post("/login", async (req, res) => {
  try {
    const { dns, username, password, action } = req.body;
    const act = action || "get_live_streams";

    const url = `${dns}/player_api.php?username=${username}&password=${password}&action=${act}`;

    const response = await fetch(url, {
      headers: standardHeaders
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


// ================= IMG =================
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


// ================= PLAYER (IOS FIX) =================
app.get("/play", async (req, res) => {
  try {
    const streamUrl = req.query.url;
    const range = req.headers.range;

    const response = await fetch(streamUrl, {
      headers: {
        ...standardHeaders,
        ...(range ? { Range: range } : {})
      }
    });

    res.set("Content-Type", response.headers.get("content-type") || "video/mp2t");
    res.set("Accept-Ranges", "bytes");

    if (response.headers.get("content-range")) {
      res.set("Content-Range", response.headers.get("content-range"));
      res.status(206);
    } else {
      res.status(200);
    }

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
