const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Headers de Navegador Real para evitar detecção de Datacenter (Erro 403)
const standardHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
  "X-Requested-With": "com.nst.iptvsmartersbox",
  "Connection": "keep-alive"
};

app.get("/", (req, res) => res.send("Backend IPTV v6.0 (High Compatibility) Online 🚀"));

// ROTA PRINCIPAL: LOGIN E BUSCA
app.post("/login", async (req, res) => {
  try {
    const { dns, username, password, action } = req.body;
    const act = action || "get_live_streams"; 
    
    // Adicionado Cache Buster (?cb=) para evitar respostas cacheadas de erro
    const url = `${dns}/player_api.php?username=${username}&password=${password}&action=${act}&cb=${Date.now()}`;
    
    const response = await fetch(url, { headers: standardHeaders, timeout: 15000 });
    
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

// ROTA DE DETALHES: ELENCO, EPISÓDIOS E SINOPSE
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

// PROXY DE IMAGENS (Posters e Fotos elenco)
app.get("/img", async (req, res) => {
  try {
    const r = await fetch(req.query.url, { headers: standardHeaders });
    res.set("Content-Type", r.headers.get("content-type"));
    r.body.pipe(res);
  } catch { res.status(500).send("Erro imagem"); }
});

// PROXY DE PLAYER
app.get("/play", async (req, res) => {
  try {
    const r = await fetch(req.query.url, { headers: standardHeaders });
    res.set("Content-Type", r.headers.get("content-type"));
    r.body.pipe(res);
  } catch { res.status(500).send("Erro play"); }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0");
