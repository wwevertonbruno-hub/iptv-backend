const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const standardHeaders = {
  "User-Agent": "IPTVSmartersPlayer",
  "Accept": "*/*",
  "X-Requested-With": "com.nst.iptvsmartersbox"
};

app.get("/", (req, res) => res.send("Backend IPTV Estável 🚀"));

// LOGIN E BUSCA POR AÇÃO (O Lovable vai decidir o que buscar)
app.post("/login", async (req, res) => {
  try {
    const { dns, username, password, action } = req.body;
    
    // Se não enviar action, padrão é info da conta
    const act = action || "get_live_streams"; 
    
    const url = `${dns}/player_api.php?username=${username}&password=${password}&action=${act}`;
    
    console.log("Chamando action:", act);

    const response = await fetch(url, { headers: standardHeaders });
    
    if (!response.ok) {
      return res.status(400).json({ error: "Servidor IPTV recusou" });
    }

    const data = await response.json();
    res.json(data);

  } catch (err) {
    res.status(500).json({ error: "Falha de conexão", detalhe: err.message });
  }
});

app.get("/img", async (req, res) => {
  try {
    const r = await fetch(req.query.url, { headers: standardHeaders });
    res.set("Content-Type", r.headers.get("content-type"));
    r.body.pipe(res);
  } catch { res.status(500).send("Erro imagem"); }
});

app.get("/play", async (req, res) => {
  try {
    const r = await fetch(req.query.url, { headers: standardHeaders });
    res.set("Content-Type", r.headers.get("content-type"));
    r.body.pipe(res);
  } catch { res.status(500).send("Erro play"); }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0");
