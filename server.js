const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// 🔒 Limite de conexões simultâneas (evita crash)
let activeStreams = 0;
const MAX_STREAMS = 5;

// HEADERS realistas
const headersPadrao = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)",
  "Accept": "*/*",
  "Referer": "http://aptxu.com/",
  "Origin": "http://aptxu.com",
  "Connection": "keep-alive"
};

app.get("/", (req, res) => {
  res.send("Servidor IPTV Estável 🚀");
});


// ================= LOGIN =================
app.post("/login", async (req, res) => {
  try {
    const { dns, username, password, action } = req.body;

    const url = `${dns}/player_api.php?username=${username}&password=${password}&action=${action || "get_live_streams"}`;

    const response = await axios.get(url, {
      headers: headersPadrao,
      timeout: 30000
    });

    res.json(response.data);

  } catch (err) {
    console.log("ERRO LOGIN:", err.message);

    if (err.response) {
      return res.status(err.response.status).json({
        erro: "Servidor IPTV recusou",
        status: err.response.status
      });
    }

    res.status(500).json({
      erro: "Falha de conexão",
      detalhe: err.message
    });
  }
});


// ================= LOGIN TEST =================
app.get("/login-test", async (req, res) => {
  try {
    const { dns, username, password } = req.query;

    const url = `${dns}/player_api.php?username=${username}&password=${password}&action=get_live_streams`;

    const response = await axios.get(url, {
      headers: headersPadrao,
      timeout: 30000
    });

    res.json(response.data);

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});


// ================= PLAYER =================
app.get("/play", async (req, res) => {
  if (activeStreams >= MAX_STREAMS) {
    return res.status(503).send("Servidor ocupado, tente novamente");
  }

  activeStreams++;

  try {
    const url = req.query.url;
    const range = req.headers.range;

    if (!url) {
      activeStreams--;
      return res.status(400).send("URL não fornecida");
    }

    const response = await axios({
      method: "GET",
      url: url,
      responseType: "stream",
      headers: {
        ...headersPadrao,
        ...(range ? { Range: range } : {})
      },
      timeout: 30000
    });

    let contentType = response.headers["content-type"] || "";

    if (url.includes(".m3u8")) {
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

    const stream = response.data;

    // 🔥 Evita crash
    stream.on("error", (err) => {
      console.log("STREAM ERROR:", err.message);
      res.end();
    });

    res.on("close", () => {
      stream.destroy();
      activeStreams--;
      console.log("Conexão fechada | Ativos:", activeStreams);
    });

    res.on("finish", () => {
      stream.destroy();
      activeStreams--;
      console.log("Finalizado | Ativos:", activeStreams);
    });

    stream.pipe(res);

  } catch (err) {
    activeStreams--;
    console.log("ERRO PLAY:", err.message);
    res.status(500).send("Erro no stream");
  }
});


// ================= START =================
app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor rodando na porta", PORT);
});
