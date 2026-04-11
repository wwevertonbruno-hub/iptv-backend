const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Cabeçalhos de Bypass para simular dispositivo real e evitar Erro 403 (Sua configuração de sucesso)
const standardHeaders = {
  "User-Agent": "IPTVSmartersPlayer",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "X-Requested-With": "com.nst.iptvsmartersbox",
  "Origin": "http://aptxu.com",
  "Referer": "http://aptxu.com/",
  "Connection": "keep-alive"
};

app.get("/", (req, res) => res.send("Backend IPTV v4.5 (Dynamic Action + Big Lists Fix) Online 🚀"));

// ROTA DE LOGIN E CONTEÚDO DINÂMICO
app.post("/login", async (req, res) => {
  try {
    const { dns, username, password, action, category_id } = req.body;
    
    const act = action || "get_live_streams"; 
    let url = `${dns}/player_api.php?username=${username}&password=${password}&action=${act}`;
    
    // Suporte para filtro de categoria se enviado pelo app
    if (category_id) url += `&category_id=${category_id}`;

    console.log(`[SOLICITAÇÃO] Buscando action: ${act}`);

    const response = await fetch(url, { 
      headers: standardHeaders, 
      timeout: 60000, // 1. AUMENTADO: 60s para listas gigantes não darem timeout
      size: 0         // 2. ADICIONADO: Permite JSON de tamanho ilimitado (corrige filmes sumindo)
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

// ROTA DE DETALHES (Elenco, Capas, Episódios)
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

// PROXY DE PLAYER (CORRIGIDO PARA PC, IPHONE E ANDROID)
app.get("/play", async (req, res) => {
  try {
    const streamUrl = req.query.url;
    const range = req.headers.range;

    const fetchOptions = {
      headers: { ...standardHeaders, ...(range && { Range: range }) },
      compress: false // 3. ADICIONADO: Essencial para não corromper o vídeo no streaming mobile
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
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor Master v4.5 rodando na porta ${PORT}`);
});
