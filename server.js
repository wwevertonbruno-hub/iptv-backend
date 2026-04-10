const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Headers de simulação de aplicativo real para evitar erro 403 e carregar metadados
const standardHeaders = {
  "User-Agent": "IPTVSmartersPlayer",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "X-Requested-With": "com.nst.iptvsmartersbox",
  "Origin": "http://aptxu.com",
  "Referer": "http://aptxu.com/",
  "Connection": "keep-alive"
};

app.get("/", (req, res) => res.send("Backend IPTV v5.0 (Full Info + Elenco) Online 🚀"));

// LOGIN E BUSCA POR AÇÃO (Canais, VOD, Séries, Categorias)
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

// NOVA ROTA: BUSCAR DETALHES DO FILME/SÉRIE (Elenco, Capas, Episódios)
app.post("/info", async (req, res) => {
  try {
    const { dns, username, password, type, id } = req.body;
    
    // Define se busca info de VOD ou de SÉRIE
    const actionType = type === 'series' ? 'get_series_info' : 'get_vod_info';
    const idParam = type === 'series' ? 'series_id' : 'vod_id';
    
    const url = `${dns}/player_api.php?username=${username}&password=${password}&action=${actionType}&${idParam}=${id}`;
    
    console.log(`[INFO] Buscando detalhes do ID ${id} (${type})`);

    const response = await fetch(url, { headers: standardHeaders, timeout: 10000 });
    const data = await response.json();
    
    res.json(data);
  } catch (err) {
    console.error("[ERRO INFO]", err.message);
    res.status(500).json({ error: "Erro ao buscar detalhes do conteúdo" });
  }
});

// Proxy de Imagens (Essencial para fotos do elenco e posters)
app.get("/img", async (req, res) => {
  try {
    const r = await fetch(req.query.url, { headers: standardHeaders });
    res.set("Content-Type", r.headers.get("content-type"));
    r.body.pipe(res);
  } catch { res.status(500).send("Erro ao processar imagem"); }
});

// Proxy de Player
app.get("/play", async (req, res) => {
  try {
    const r = await fetch(req.query.url, { headers: standardHeaders });
    res.set("Content-Type", r.headers.get("content-type"));
    r.body.pipe(res);
  } catch { res.status(500).send("Erro ao processar stream"); }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
    console.log("Servidor iniciado na porta " + PORT);
});
