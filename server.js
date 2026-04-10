const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();

// Ativa o CORS para o Lovable
app.use(cors());
app.use(express.json());

// Headers que funcionaram nos seus testes anteriores (IPTV Smarters)
const standardHeaders = {
  "User-Agent": "IPTVSmartersPlayer",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "X-Requested-With": "com.nst.iptvsmartersbox",
  "Connection": "keep-alive"
};

// Teste de conexão
app.get("/", (req, res) => {
  res.send("Backend IPTV Restaurado (Canais + Filmes + Séries) 🚀");
});

// LOGIN E BUSCA DE CONTEÚDO (POST)
app.post("/login", async (req, res) => {
  try {
    const { dns, username, password } = req.body;

    if (!dns || !username || !password) {
      return res.status(400).json({ error: "Preencha DNS, usuário e senha" });
    }

    const baseParams = `username=${username}&password=${password}`;
    
    // Busca simultânea das 3 listas principais
    const [resLive, resMovies, resSeries] = await Promise.all([
      fetch(`${dns}/player_api.php?${baseParams}&action=get_live_streams`, { headers: standardHeaders }),
      fetch(`${dns}/player_api.php?${baseParams}&action=get_vod_streams`, { headers: standardHeaders }),
      fetch(`${dns}/player_api.php?${baseParams}&action=get_series`, { headers: standardHeaders })
    ]);

    // Converte para JSON
    const live = await resLive.json().catch(() => []);
    const movies = await resMovies.json().catch(() => []);
    const series = await resSeries.json().catch(() => []);

    // Retorna a estrutura que o Lovable já reconhece
    res.json({
      user_info: { auth: 1, status: "Active" },
      live_streams: Array.isArray(live) ? live : [],
      vod_streams: Array.isArray(movies) ? movies : [],
      series: Array.isArray(series) ? series : []
    });

  } catch (err) {
    console.error("Erro no Processamento:", err.message);
    res.status(500).json({
      error: "Falha ao carregar conteúdo",
      detalhe: err.message
    });
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
  console.log("Servidor restaurado na porta " + PORT);
});
