const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Cabeçalhos avançados para simular um dispositivo real e evitar bloqueios
const standardHeaders = {
  "User-Agent": "IPTVSmartersPlayer",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "X-Requested-With": "com.nst.iptvsmartersbox",
  "Origin": "http://aptxu.com",
  "Referer": "http://aptxu.com/",
  "Connection": "keep-alive"
};

app.get("/", (req, res) => res.send("Backend IPTV v4.0 (Bypass) Online 🚀"));

// LOGIN E BUSCA POR AÇÃO
app.post("/login", async (req, res) => {
  try {
    const { dns, username, password, action } = req.body;
    
    // Se não enviar action, o padrão é buscar info da conta/canais
    const act = action || "get_live_streams"; 
    
    // Constrói a URL exata da API Xtream Codes
    const url = `${dns}/player_api.php?username=${username}&password=${password}&action=${act}`;
    
    console.log(`[LOG] Chamando ${act} no DNS: ${dns}`);

    const response = await fetch(url, { 
        headers: standardHeaders,
        timeout: 15000 // Aumentado para 15 segundos para listas grandes
    });
    
    if (!response.ok) {
        console.error(`[ERRO] Servidor IPTV retornou status: ${response.status}`);
        return res.status(response.status).json({ 
            error: "Servidor IPTV recusou", 
            status_origem: response.status 
        });
    }

    const data = await response.json();
    res.json(data);

  } catch (err) {
    console.error(`[ERRO CRÍTICO] ${err.message}`);
    res.status(500).json({ error: "Falha de conexão", detalhe: err.message });
  }
});

// Proxy de Imagens
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
    console.log("Servidor em execução na porta " + PORT);
});
