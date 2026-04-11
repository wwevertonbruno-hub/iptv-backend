const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Headers de Navegador Real + Bypass para evitar bloqueios de firewall (Erro 403)
const standardHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "*/*",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "X-Requested-With": "com.nst.iptvsmartersbox",
  "Origin": "http://aptxu.com",
  "Referer": "http://aptxu.com/",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
  "Connection": "keep-alive"
};

app.get("/", (req, res) => res.send("Backend IPTV v8.5 (Bypass Reinforced) Online 🚀"));

// LOGIN E BUSCA POR AÇÃO (Suporta Listas Gigantes e Mobile)
app.post("/login", async (req, res) => {
  try {
    const { dns, username, password, action } = req.body;
    const act = action || "get_live_streams"; 
    
    // Adicionado Cache Buster (?t=) para evitar que o servidor IPTV envie erro em cache
    const url = `${dns}/player_api.php?username=${username}&password=${password}&action=${act}&t=${Date.now()}`;
    
    console.log(`[LOG] Chamando ${act} no DNS: ${dns}`);

    const response = await fetch(url, { 
        headers: standardHeaders, 
        timeout: 45000, // 45 segundos para listas muito grandes
        size: 0        // Sem limite de tamanho para evitar listas de filmes cortadas
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

// INFO E ELENCO (Para metadados e extensões de vídeo .mp4/.mkv)
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

// PROXY DE PLAYER (CORRIGIDO PARA IPHONE E ANDROID)
app.get("/play", async (req, res) => {
  try {
    const streamUrl = req.query.url;
    const range = req.headers.range;

    const fetchOptions = {
      headers: { ...standardHeaders, ...(range && { Range: range }) },
      compress: false // Evita corrupção de dados no streaming de vídeo mobile
    };

    const r = await fetch(streamUrl, fetchOptions);

    res.set("Content-Type", r.headers.get("content-type") || "video/mp4");
    res.set("Accept-Ranges", "bytes");
    
    if (r.headers.get("content-range")) res.set("Content-Range", r.headers.get("content-range"));
    if (r.headers.get("content-length")) res.set("Content-Length", r.headers.get("content-length"));

    res.status(r.status);
    r.body.pipe(res);
  } catch {
    res.status(500).send("Erro ao reproduzir stream");
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor iniciado na porta ${PORT}`);
});
