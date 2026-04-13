const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// HEADERS MUITO MAIS REALISTAS
const getHeaders = () => ({
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8",
  "Referer": "http://aptxu.com/",
  "Origin": "http://aptxu.com",
  "Connection": "keep-alive",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache"
});

// ================= LOGIN =================
app.post("/login", async (req, res) => {
  const { dns, username, password, action } = req.body;

  const url = `${dns}/player_api.php?username=${username}&password=${password}&action=${action || "get_live_streams"}`;

  try {
    const response = await axios.get(url, {
      headers: getHeaders(),
      timeout: 30000,
      validateStatus: () => true // 🔥 NÃO quebra no 403
    });

    // 🔥 SE FOR 403, tenta novamente (retry)
    if (response.status === 403) {
      console.log("403 detectado, tentando novamente...");

      const retry = await axios.get(url, {
        headers: {
          ...getHeaders(),
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
        },
        timeout: 30000,
        validateStatus: () => true
      });

      return res.status(retry.status).json(retry.data);
    }

    res.status(response.status).json(response.data);

  } catch (err) {
    console.log("ERRO LOGIN:", err.message);

    res.status(500).json({
      erro: "Falha de conexão",
      detalhe: err.message
    });
  }
});


// ================= PLAYER =================
app.get("/play", async (req, res) => {
  try {
    const url = req.query.url;

    if (!url) {
      return res.status(400).send("URL não fornecida");
    }

    const response = await axios({
      method: "GET",
      url: url,
      responseType: "stream",
      headers: getHeaders(),
      timeout: 30000,
      validateStatus: () => true
    });

    if (response.status === 403) {
      return res.status(403).send("IPTV bloqueou o servidor");
    }

    res.setHeader("Content-Type", response.headers["content-type"] || "video/mp4");
    response.data.pipe(res);

  } catch (err) {
    console.log("ERRO PLAY:", err.message);
    res.status(500).send("Erro no stream");
  }
});


// ================= ROOT =================
app.get("/", (req, res) => {
  res.send("Servidor anti-403 rodando 🚀");
});

app.listen(PORT, () => {
  console.log("Rodando na porta", PORT);
});
