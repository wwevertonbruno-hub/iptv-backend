const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();

// Ativa o CORS para permitir conexão do Lovable/Browser
app.use(cors());
app.use(express.json());

// Headers de simulação do IPTV Smarters Pro para evitar bloqueios (403 Forbidden)
const standardHeaders = {
  "User-Agent": "IPTVSmartersPlayer",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "X-Requested-With": "com.nst.iptvsmartersbox",
  "Connection": "keep-alive"
};

// Rota de Teste do Railway
app.get("/", (req, res) => {
  res.send("Backend IPTV v2.1 (Canais + Filmes + Séries) Online 🚀");
});

// LOGIN E BUSCA DE CONTEÚDO COMPLETO
app.post("/login", async (req, res) => {
  try {
    const { dns, username, password } = req.body;

    if (!dns || !username || !password) {
      return res.status(400).json({ error: "Preencha DNS, usuário e senha" });
    }

    const baseParams = `username=${username}&password=${password}`;
    
    console.log("Buscando conteúdo completo para:", dns);

    // Faz as 3 requisições simultâneas para otimizar o tempo de resposta
    const [resLive, resMovies, resSeries] = await Promise.all([
      fetch(`${dns}/player_api.php?${baseParams}&action=get_live_streams`, { headers: standardHeaders }),
      fetch(`${dns}/player_api.php?${baseParams}&action=get_vod_streams`, { headers: standardHeaders }),
      fetch(`${dns}/player_api.php?${baseParams}&action=get_series`, { headers: standardHeaders })
    ]);

    // Converte os resultados para JSON
    const live = await resLive.json();
    const movies = await resMovies.json();
    const series = await resSeries.json();

    // Retorna um objeto estruturado para o Lovable
    res.json({
      user_info: { auth: 1, status: "Active" }, // Força status ativo para o frontend
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

// Proxy de Imagens (Logos e Capas de Filmes)
app.get("/img", async (req, res) => {
  try {
    const r = await fetch(req.query.url, { headers: standardHeaders });
    res.set("Content-Type", r.headers.get("content-type"));
    r.body.pipe(res);
  } catch {
    res.status(500).send("Erro ao carregar imagem");
  }
});

// Proxy de Player (Streams ao vivo, MP4 e MKV)
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
  console.log("Servidor iniciado com Canais, Filmes e Séries na porta " + PORT);
});
