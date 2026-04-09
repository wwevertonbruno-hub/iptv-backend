const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Headers de simulação de aplicativo real (IPTV Smarters)
const standardHeaders = {
  "User-Agent": "IPTVSmartersPlayer",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "X-Requested-With": "com.nst.iptvsmartersbox",
  "Connection": "keep-alive"
};

app.get("/", (req, res) => {
  res.send("Backend IPTV v3.2 (Estável) Online 🚀");
});

// LOGIN E BUSCA SEQUENCIAL (Evita bloqueio de múltiplas conexões)
app.post("/login", async (req, res) => {
  try {
    const { dns, username, password } = req.body;

    if (!dns || !username || !password) {
      return res.status(400).json({ error: "Preencha DNS, usuário e senha" });
    }

    const base = `${dns}/player_api.php?username=${username}&password=${password}`;
    console.log("Iniciando busca sequencial para:", dns);

    // Função auxiliar para evitar erros de JSON vazio
    const safeFetch = async (url) => {
      try {
        const r = await fetch(url, { headers: standardHeaders, timeout: 8000 });
        if (!r.ok) return [];
        return await r.json();
      } catch (e) {
        console.error("Erro na rota:", url, e.message);
        return [];
      }
    };

    // Buscando um por um para não sobrecarregar o firewall do servidor IPTV
    const liveCats = await safeFetch(`${base}&action=get_live_categories`);
    const vodCats = await safeFetch(`${base}&action=get_vod_categories`);
    const seriesCats = await safeFetch(`${base}&action=get_series_categories`);
    
    const live = await safeFetch(`${base}&action=get_live_streams`);
    const vod = await safeFetch(`${base}&action=get_vod_streams`);
    const series = await safeFetch(`${base}&action=get_series`);

    // Resposta estruturada
    res.json({
      user_info: { auth: 1, status: "Active" },
      categories: {
        live: Array.isArray(liveCats) ? liveCats : [],
        vod: Array.isArray(vodCats) ? vodCats : [],
        series: Array.isArray(seriesCats) ? seriesCats : []
      },
      streams: {
        live: Array.isArray(live) ? live : [],
        vod: Array.isArray(vod) ? vod : [],
        series: Array.isArray(series) ? series : []
      }
    });

  } catch (err) {
    console.error("Erro Geral:", err.message);
    res.status(500).json({ error: "Falha na estrutura", detalhe: err.message });
  }
});

// Proxy de Imagens
app.get("/img", async (req, res) => {
  try {
    const r = await fetch(req.query.url, { headers: standardHeaders });
    res.set("Content-Type", r.headers.get("content-type"));
    r.body.pipe(res);
  } catch {
    res.status(500).send("Erro ao carregar imagem");
  }
});

// Proxy de Player
app.get("/play", async (req, res) => {
  try {
    const r = await fetch(req.query.url, { headers: standardHeaders });
    res.set("Content-Type", r.headers.get("content-type"));
    r.body.pipe(res);
  } catch {
    res.status(500).send("Erro ao reproduzir stream");
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor iniciado na porta " + PORT);
});
