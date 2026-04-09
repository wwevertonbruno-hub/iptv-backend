const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors"); // Importação do CORS

const app = express();

// Ativa o CORS para permitir que o Lovable acesse o backend
app.use(cors());

// Essencial para ler o JSON enviado pelo Hoppscotch/Lovable
app.use(express.json());

const headers = {
  "User-Agent": "IPTVSmartersPlayer",
  "Accept": "*/*",
  "Accept-Encoding": "gzip, deflate",
  "Connection": "keep-alive"
};

// Rota de Teste
app.get("/", (req, res) => {
  res.send("Backend IPTV rodando com CORS ativado 🚀");
});

// LOGIN DINÂMICO (POST)
app.post("/login", async (req, res) => {
  try {
    const { dns, username, password } = req.body;

    console.log("Tentativa de login para DNS:", dns);

    if (!dns || !username || !password) {
      return res.status(400).json({
        error: "Preencha DNS, usuário e senha"
      });
    }

    // Monta a URL da API Xtream Codes
    const apiUrl = `${dns}/player_api.php?username=${username}&password=${password}&action=get_live_streams`;

    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      return res.status(response.status).json({
        error: "O servidor IPTV recusou a conexão",
        status: response.status
      });
    }

    const data = await response.json();
    res.json(data);

  } catch (err) {
    console.error("Erro no Servidor:", err.message);
    res.status(500).json({
      error: "Falha na conexão de rede",
      detalhe: err.message
    });
  }
});

// Proxy de Imagens
app.get("/img", async (req, res) => {
  try {
    const r = await fetch(req.query.url, { headers });
    res.set("Content-Type", r.headers.get("content-type"));
    r.body.pipe(res);
  } catch {
    res.status(500).send("Erro ao carregar imagem");
  }
});

// Proxy de Player (Streams)
app.get("/play", async (req, res) => {
  try {
    const r = await fetch(req.query.url, { headers });
    res.set("Content-Type", r.headers.get("content-type"));
    r.body.pipe(res);
  } catch {
    res.status(500).send("Erro ao reproduzir stream");
  }
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor rodando com sucesso na porta " + PORT);
});
