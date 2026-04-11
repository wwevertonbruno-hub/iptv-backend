const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Cabeçalhos de Bypass para simular dispositivo real e evitar Erro 403
const standardHeaders = {
  "User-Agent": "IPTVSmartersPlayer",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "X-Requested-With": "com.nst.iptvsmartersbox",
  "Origin": "http://aptxu.com",
  "Referer": "http://aptxu.com/",
  "Connection": "keep-alive"
};

app.get("/", (req, res) => res.send("Backend IPTV v9.0 (Ultra Low Latency) Online 🚀"));

// LOGIN E BUSCA SINCRONIZADA (Suporta sincronização massiva para o banco do Lovable)
app.post("/login", async (req, res) => {
  try {
    const { dns, username, password, action, category_id } = req.body;
    const act = action || "get_live_streams"; 
    let url = `${dns}/player_api.php?username=${username}&password=${password}&action=${act}`;
    
    if (category_id) url += `&category_id=${category_id}`;

    console.log(`[REQ] Buscando: ${act}`);

    const response = await fetch(url, { 
      headers: standardHeaders, 
      timeout: 90000, // 90s para permitir sincronização de catálogos gigantes
      size: 0         // Sem limite de tamanho para o JSON (Avatar e listas completas)
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
    res.status(500).json({ error: "Falha de conexão", detalhe: err.message });
  }
});

// INFO DETALHADA (Elenco, Capas, Episódios)
app.post("/info", async (req, res) => {
  try {
    const { dns, username, password, type, id } = req.body;
    const actionType = type === 'series' ? 'get_series_info' : 'get_vod_info';
    const idParam = type === 'series' ? 'series_id' : 'vod_id';
    const url = `${dns}/player_api.php?username=${username}&password=${password}&action=${actionType}&${idParam}=${id}`;
    
    const response = await fetch(url, { headers: standardHeaders, timeout: 20000 });
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

// PROXY DE PLAYER (OTIMIZADO PARA STREAMING AO VIVO NO IOS)
app.get("/play", async (req, res) => {
  try {
    const streamUrl = req.query.url;
    const range = req.headers.range;
    const isLive = streamUrl.includes("/live/"); // Identifica se é canal ao vivo

    const fetchOptions = {
      headers: { ...standardHeaders, ...(range && { Range: range }) },
      compress: false, // Impede corrupção do fluxo de vídeo
      timeout: isLive ? 0 : 45000 // Timeout infinito para canais ao vivo (Real-time)
    };

    const r = await fetch(streamUrl, fetchOptions);

    // Headers para reduzir o buffer e acelerar o início no iPhone
    res.set("Content-Type", r.headers.get("content-type") || "video/mp4");
    res.set("Accept-Ranges", "bytes");
    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    if (r.headers.get("content-range")) res.set("Content-Range", r.headers.get("content-range"));
    if (r.headers.get("content-length")) res.set("Content-Length", r.headers.get("content-length"));

    res.status(r.status);
    
    // Streaming direto para o dispositivo sem armazenamento temporário
    r.body.pipe(res);

    // Encerra a conexão no servidor IPTV se o usuário fechar o player
    req.on("close", () => {
      if (r.body && r.body.destroy) r.body.destroy();
    });

  } catch (err) {
    console.error("Erro Stream:", err.message);
    res.status(500).send("Erro ao reproduzir");
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor Master v9.0 Online na porta ${PORT}`);
});
