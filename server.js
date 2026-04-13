const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

// Headers mais "reais"
const headersPadrao = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)",
  "Accept": "*/*",
  "Connection": "keep-alive"
};

app.get("/", (req, res) => {
  res.send("Servidor ONLINE 🚀");
});

// PLAYER ESTÁVEL
app.get("/play", async (req, res) => {
  try {
    const url = req.query.url;
    const range = req.headers.range;

    if (!url) {
      return res.status(400).send("Sem URL");
    }

    const response = await axios({
      method: "GET",
      url: url,
      responseType: "stream",
      headers: {
        ...headersPadrao,
        ...(range ? { Range: range } : {})
      },
      timeout: 20000
    });

    // Detecta tipo
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
    res.setHeader("Connection", "keep-alive");

    if (response.headers["content-length"]) {
      res.setHeader("Content-Length", response.headers["content-length"]);
    }

    if (response.headers["content-range"]) {
      res.setHeader("Content-Range", response.headers["content-range"]);
      res.status(206);
    } else {
      res.status(200);
    }

    response.data.pipe(res);

  } catch (err) {
    console.log("ERRO:", err.message);
    res.status(500).send("Erro no stream");
  }
});

app.listen(8080, () => {
  console.log("Rodando na porta 8080");
});
