const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Headers de simulação de aplicativo real para evitar erro 403
const standardHeaders = {
  "User-Agent": "IPTVSmartersPlayer",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "X-Requested-With": "com.nst.iptvsmartersbox",
  "Connection": "keep-alive"
};

app.get("/", (req, res) => {
  res.send("Backend IPTV v3.0 (Categorias + Conteúdo) Online 🚀");
});

// LOGIN E BUSCA ESTRUTURADA (Canais, Filmes, Séries e Categorias)
app.post("/login", async (req, res) => {
  try {
    const { dns, username, password } = req.body;

    if (!dns || !username || !password) {
      return res.status(400).json({ error: "Preencha DNS, usuário e senha" });
    }

    const baseParams = `username=${username}&password=${password}`;
    console.log("Iniciando carga completa para:", dns);

    // Busca simultânea de 6 endpoints para organizar a interface
    const [
      resCatsLive, resCatsVod, resCatsSeries, 
      resLive, resVod, resSeries
    ] = await Promise.all([
      fetch(`${dns}/player_api.php?${baseParams}&action=get_live_categories`, { headers: standardHeaders }),
      fetch(`${dns}/player_api.php?${baseParams}&action=get_vod_categories`, { headers: standardHeaders }),
      fetch(`${dns}/player_api.php?${baseParams}&action=get_series_categories`, { headers: standardHeaders }),
      fetch(`${dns}/player_api.php?${baseParams}&action=get_live_streams`, { headers: standardHeaders }),
      fetch(`${dns}/player_api.php?${baseParams}&action=get_vod_streams`, { headers: standardHeaders }),
      fetch(`${dns}/player_api.php?${baseParams}&action=get_series`, { headers: standardHeaders })
    ]);

    // Retorna um objeto JSON com tudo separado para o Lovable filtrar
    res.json({
      user_info: { auth: 1, status: "Active" },
      categories: {
        live: await resCatsLive.json().catch(() => []),
        vod: await resCatsVod.json().catch(() => []),
        series: await resCatsSeries.json().catch(() => [])
      },
      streams: {
        live: await resLive.json().catch(() => []),
        vod: await resVod.json().catch(() => []),
        series: await resSeries.json().catch(() => [])
      }
    });

  } catch (err) {
    console.error("Erro na Carga:", err.message);
    res.status(500).json({ error: "Falha ao carregar estrutura IPTV", detalhe: err.message });
  }
});

// Proxy de Imagens (Posters e Logos)
app.get("/img", async (req, res) => {
  try {
    const r = await fetch(req.query.url, { headers: standardHeaders });
    res.set("Content-Type", r.headers.get("content-type"));
    r.body.pipe(res);
  } catch {
    res.status(500).send("Erro ao carregar imagem");
  }
});

// Proxy de Player (Vídeo e Streams)
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
  console.log("Servidor Master iniciado na porta " + PORT);
});
