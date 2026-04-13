const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// HEADERS REALISTAS (evita bloqueio IPTV)
const headersPadrao = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile Safari/604.1",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
  "Referer": "http://aptxu.com/",
  "Origin": "http://aptxu.com",
  "Connection": "keep-alive"
};

app.get("/", (req, res) => {
  res.send("Servidor IPTV ONLINE 🚀");
});


// ================= LOGIN =================
app.post("/login", async (req, res) => {
  try {
    const { dns, username, password, action } = req.body;

    const url = `${dns}/player_api.php?username=${username}&password=${password}&action=${action || "get_live_streams"}`;

    const response = await axios.get(url, {
      headers: headersPadrao,
      timeout: 60000
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


// ======= LOGIN TEST (GET no navegador) =======
app.get("/login-test", async (req, res) => {
  try {
    const { dns, username, password } = req.query;

    const url = `${dns}/player_api.php?username=${username}&password=${password}&action=get_live_streams`;

    const response = await axios.get(url, {
      headers: headersPadrao,
      timeout: 60000
    });

    res.json(response.data);

  } catch (err) {
    res.status(500).json({
      erro: err.message
    });
  }
});


// ================= PLAYER =================
app.get("/play", async (req, res) => {
  try {
    const url = req.query.url;
    const range = req.headers.range;

    if (!url) {
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
      timeout: 60000
    });

    let contentType = response.headers["content-type"] || "";

    // Detecta tipo correto pro iOS
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
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Cache-Control", "no-cache");

    if (response.headers["content-length"]) {
      res.setHeader("Content-Length", response.headers["content-length"]);
    }

    if (response.headers["content-range"]) {
      res.setHeader("Content-Range", response.headers["content-range"]);
      res.status(206);
    } else if (range) {
      res.status(206);
    } else {
      res.status(200);
    }

    response.data.pipe(res);

  } catch (err) {
    console.log("ERRO PLAY:", err.message);

    res.status(500).send("Erro ao reproduzir stream");
  }
});


// ================= START =================
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Rodando na porta", PORT);
});
