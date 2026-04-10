const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Headers de Navegador Real (Chrome Windows) para burlar o Firewall IPTV
const fireWallBypassHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
  "X-Requested-With": "com.nst.iptvsmartersbox",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "cross-site",
  "Connection": "keep-alive"
};

app.get("/", (req, res) => res.send("Backend IPTV v7.0 (Firewall Bypass) Online 🚀"));

// LOGIN E BUSCA DINÂMICA
app.post("/login", async (req, res) => {
  try {
    const { dns, username, password, action } = req.body;
    const act = action || "get_live_streams"; 
    
    // Cache Buster dinâmico (?cb=) para evitar que o servidor IPTV envie erro em cache
    const url = `${dns}/player_api.php?username=${username}&password=${password}&action=${act}&t=${Date.now()}`;
    
    console.log(`[REQ] Chamando: ${act}`);

    const response = await fetch(url, { 
      headers: fireWallBypassHeaders,
      timeout: 15000 
    });
    
    // Se o servidor retornar 403, tentamos avisar o usuário
    if (response.status === 403) {
      console.error("[BLOQUEIO] O IP do Railway foi banido pelo servidor IPTV.");
      return res.status(403).json({ 
        error: "O servidor IPTV bloqueou o servidor do Railway (403)", 
        solucao: "Faça o Redeploy no Railway para tentar mudar o IP." 
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: "Erro no servidor IPTV", status: response.status });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Falha de rede", detalhe: err.message });
  }
});

// INFO DETALHADA E ELENCO
app.post("/info", async (req, res) => {
  try {
    const { dns, username, password, type, id } = req.body;
    const actionType = type === 'series' ? 'get_series_info' : 'get_vod_info';
    const idParam = type === 'series' ? 'series_id' : 'vod_id';
    
    const url = `${dns}/player_api.php?username=${username}&password=${password}&action=${actionType}&${idParam}=${id}`;

    const response = await fetch(url, { headers: fireWallBypassHeaders, timeout: 10000 });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar detalhes" });
  }
});

// PROXIES (Imagens e Vídeo)
app.get("/img", async (req, res) => {
  try {
    const r = await fetch(req.query.url, { headers: fireWallBypassHeaders });
    res.set("Content-Type", r.headers.get("content-type"));
    r.body.pipe(res);
  } catch { res.status(500).send("Erro"); }
});

app.get("/play", async (req, res) => {
  try {
    const r = await fetch(req.query.url, { headers: fireWallBypassHeaders });
    res.set("Content-Type", r.headers.get("content-type"));
    r.body.pipe(res);
  } catch { res.status(500).send("Erro"); }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0");
