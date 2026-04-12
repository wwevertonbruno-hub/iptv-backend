const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const standardHeaders = {
  "User-Agent": "IPTVSmartersPlayer",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "X-Requested-With": "com.nst.iptvsmartersbox",
  "Origin": "http://aptxu.com",
  "Referer": "http://aptxu.com/",
  "Connection": "keep-alive"
};

app.get("/", (req, res) => res.send("Backend IPTV v10.0 (EPG + Ultra Speed) Online 🚀"));

// LOGIN E CONTEÚDO (Canais, VOD, Séries)
app.post("/login", async (req, res) => {
  try {
    const { dns, username, password, action } = req.body;
    const act = action || "get_live_streams"; 
    const url = `${dns}/player_api.php?username=${username}&password=${password}&action=${act}`;
    
    const response = await fetch(url, { headers: standardHeaders, timeout: 45000, size: 0 });
    if (!response.ok) return res.status(response.status).json({ error: "Servidor IPTV recusou" });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Falha de conexão", detalhe: err.message });
  }
});

// NOVA ROTA: EPG (Grade de Programação)
app.post("/epg", async (req, res) => {
  try {
    const { dns, username, password, stream_id } = req.body;
    // Busca a programação curta do canal específico
    const url = `${dns}/player_api.php?username=${username}&password=${password}&action=get_short_epg&stream_id=${stream_id}`;
    
    const response = await fetch(url, { headers: standardHeaders, timeout: 15000 });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar EPG" });
  }
});

// INFO E ELENCO
app.post("/info", async (req, res) => {
  try {
    const { dns, username, password, type, id } = req.body;
    const actionType = type === 'series' ? 'get_series_info' : 'get_vod_info';
    const idParam = type === 'series' ? 'series_id' : 'vod_id';
    const url = `${dns}/player_api.php?username=${username}&password=${password}&action=${actionType}&${idParam}=${id}`;
    
    const response = await fetch(url, { headers: standardHeaders, timeout: 15000 });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Erro detalhes" });
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

// PROXY DE PLAYER (OTIMIZADO: FIX IOS DELAY + BYTES STREAM)
app.get("/play", async (req, res) => {
  try {
    const streamUrl = req.query.url;
    const range = req.headers.range;
    const isLive = streamUrl.includes("/live/");

    const fetchOptions = {
      headers: { ...standardHeaders, ...(range && { Range: range }) },
      compress: false,
      timeout: isLive ? 0 : 45000
    };

    const r = await fetch(streamUrl, fetchOptions);

    res.set("Content-Type", r.headers.get("content-type") || "video/mp4");
    res.set("Accept-Ranges", "bytes");
    // Headers para forçar o player do iPhone a carregar mais rápido (sem cache)
    res.set("Cache-Control", "no-cache, no-store, must-revalidate");

    if (r.headers.get("content-range")) res.set("Content-Range", r.headers.get("content-range"));
    if (r.headers.get("content-length")) res.set("Content-Length", r.headers.get("content-length"));

    res.status(r.status);
    r.body.pipe(res);

    req.on("close", () => {
      if (r.body && r.body.destroy) r.body.destroy();
    });
  } catch {
    res.status(500).send("Erro ao reproduzir");
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0");
