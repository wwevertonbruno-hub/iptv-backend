const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// 🔒 Headers mais compatíveis com IPTV
const headers = {
  "User-Agent": "IPTVSmartersPlayer",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "http://aptxu.com/",
  "Origin": "http://aptxu.com"
};

app.get("/", (req, res) => {
  res.send("Backend IPTV (estável - sem proxy de vídeo) 🚀");
});


// ================= LOGIN / LISTA =================
app.post("/login", async (req, res) => {
  try {
    const { dns, username, password, action } = req.body;

    if (!dns || !username || !password) {
      return res.status(400).json({ erro: "Dados incompletos" });
    }

    const act = action || "get_live_streams";

    const url = `${dns}/player_api.php?username=${username}&password=${password}&action=${act}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers,
      signal: controller.signal
    });

    clearTimeout(timeout);

    const text = await response.text();

    // 🔥 Detecta bloqueio Cloudflare
    if (text.includes("Cloudflare") || text.includes("blocked")) {
      return res.status(403).json({
        erro: "Bloqueado pelo servidor IPTV"
      });
    }

    // tenta converter para JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(500).json({
        erro: "Resposta inválida do IPTV"
      });
    }

    res.json(data);

  } catch (err) {
    res.status(500).json({
      erro: "Falha de conexão",
      detalhe: err.message
    });
  }
});


// ================= INFO (VOD / SERIES) =================
app.post("/info", async (req, res) => {
  try {
    const { dns, username, password, type, id } = req.body;

    const actionType = type === "series" ? "get_series_info" : "get_vod_info";
    const idParam = type === "series" ? "series_id" : "vod_id";

    const url = `${dns}/player_api.php?username=${username}&password=${password}&action=${actionType}&${idParam}=${id}`;

    const response = await fetch(url, { headers });
    const text = await response.text();

    if (text.includes("Cloudflare")) {
      return res.status(403).json({ erro: "Bloqueado pelo IPTV" });
    }

    res.json(JSON.parse(text));

  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar detalhes" });
  }
});


// ================= IMAGENS =================
app.get("/img", async (req, res) => {
  try {
    const url = req.query.url;

    const response = await fetch(url, { headers });

    res.setHeader(
      "Content-Type",
      response.headers.get("content-type") || "image/jpeg"
    );

    response.body.pipe(res);

  } catch {
    res.status(500).send("Erro imagem");
  }
});


// ================= START =================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
