const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();

// Ativa o CORS para o Lovable e navegadores mobile
app.use(cors());
app.use(express.json());

// Headers de simulação de app real para evitar erro 403
const standardHeaders = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
  "Accept": "*/*",
  "X-Requested-With": "com.nst.iptvsmartersbox",
  "Connection": "keep-alive"
};

app.get("/", (req, res) => res.send("Backend IPTV v7.0 (Mobile Ready) Online 🚀"));

// LOGIN E BUSCA POR ACTION
app.post("/login", async (req, res) => {
  try {
    const { dns, username, password, action } = req.body;
    const act = action || "get_live_streams"; 
    const url = `${dns}/player_api.php?username=${username}&password=${password}&action=${act}`;
    
    const response = await fetch(url, { headers: standardHeaders, timeout: 15000 });
    if (!response.ok) return res.status(response.status).json({ error: "Servidor IPTV recusou" });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Falha de conexão", detalhe: err.message });
  }
});

// INFO DETALHADA (Elenco e Episódios)
app.post("/info", async (req, res) => {
  try {
    const { dns, username, password, type, id } = req.body;
    const actionType = type === 'series' ? 'get_series_info' : 'get_vod_info';
    const idParam = type === 'series' ? 'series_id' : 'vod_id';
    const url = `${dns}/player_api.php?username=${username}&password=${password}&action=${actionType}&${idParam}=${id}`;
    
    const response = await fetch(url, { headers: standardHeaders, timeout: 10000 });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar detalhes" });
  }
});

// PROXY DE IMAGENS
app.get("/img", async (req, res) => {
  try {
    const r = await fetch(req.query.url, { headers: standardHeaders });
    res.set("Content-Type", r.headers.get("content-type"));
    r.body.pipe(res);
  } catch { res.status(500).send("Erro imagem"); }
});

// PROXY DE PLAYER (CORREÇÃO PARA IOS E ANDROID)
app.get("/play", async (req, res) => {
  try {
    const streamUrl = req.query.url;
    const range = req.headers.range; // O iPhone envia isso para pedir pedaços do vídeo

    const fetchOptions = {
      headers: { 
        ...standardHeaders,
        ...(range && { Range: range }) // Repassa o pedido de "bytes" para o IPTV
      }
    };

    const r = await fetch(streamUrl, fetchOptions);

    // Headers cruciais para o Player do iOS/Android funcionar
    res.set("Content-Type", r.headers.get("content-type") || "video/mp4");
    res.set("Accept-Ranges", "bytes");
    
    if (r.headers.get("content-range")) {
      res.set("Content-Range", r.headers.get("content-range"));
    }
    if (r.headers.get("content-length")) {
      res.set("Content-Length", r.headers.get("content-length"));
    }

    res.status(r.status);
    r.body.pipe(res);
  } catch (err) {
    console.error("Erro Player:", err.message);
    res.status(500).send("Erro ao reproduzir stream");
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0");
