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

app.get("/", (req, res) => res.send("Backend IPTV v4.5 (Dynamic Action) Online 🚀"));

// ROTA DE LOGIN E CONTEÚDO DINÂMICO
app.post("/login", async (req, res) => {
  try {
    const { dns, username, password, action } = req.body;
    
    // Se o app não enviar 'action', o padrão é buscar canais ao vivo
    const act = action || "get_live_streams"; 
    
    // Monta a URL baseada no que o app quer (Canais, Filmes, Séries ou Categorias)
    const url = `${dns}/player_api.php?username=${username}&password=${password}&action=${act}`;
    
    console.log(`[SOLICITAÇÃO] Buscando action: ${act}`);

    const response = await fetch(url, { headers: standardHeaders, timeout: 30000, size: 0 });
    
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

// ROTA DE DETALHES (Elenco, Capas, Episódios)
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

// PROXY DE PLAYER (CORRIGIDO PARA PC, IPHONE E ANDROID)
app.get("/play", async (req, res) => {
  try {
    const streamUrl = req.query.url;
    const range = req.headers.range;

    const fetchOptions = {
      headers: { ...standardHeaders, ...(range && { Range: range }) }
    };

    const r = await fetch(streamUrl, fetchOptions);

    res.set("Content-Type", r.headers.get("content-type") || "video/mp4");
    res.set("Accept-Ranges", "bytes");
    if (r.headers.get("content-range")) res.set("Content-Range", r.headers.get("content-range"));
    if (r.headers.get("content-length")) res.set("Content-Length", r.headers.get("content-length"));

    res.status(r.status);
    r.body.pipe(res);
  } catch {
    res.status(500).send("Erro ao reproduzir");
  }
});

const PORT = process.env.PORT || 8080;
// Escuta em 0.0.0.0 para compatibilidade total com Fly.io e Railway
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
