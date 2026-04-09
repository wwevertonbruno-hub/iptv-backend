const express = require("express");
const fetch = require("node-fetch");

const app = express();

// 👇 ESSENCIAL PRA LER JSON
app.use(express.json());

const headers = {
  "User-Agent": "IPTVSmartersPlayer",
  "Accept": "*/*"
};

// TESTE
app.get("/", (req, res) => {
  res.send("Backend rodando 🚀");
});

// LOGIN DINÂMICO
app.post("/login", async (req, res) => {
  try {
    const { dns, username, password } = req.body;

    // DEBUG (IMPORTANTE)
    console.log("BODY RECEBIDO:", req.body);

    if (!dns || !username || !password) {
      return res.status(400).json({
        error: "Preencha DNS, usuário e senha"
      });
    }

    const response = await fetch(
      `${dns}/player_api.php?username=${username}&password=${password}&action=get_live_streams`,
      { headers }
    );

    if (!response.ok) {
      return res.status(400).json({
        error: "Erro ao conectar no servidor IPTV"
      });
    }

    const data = await response.json();

    res.json(data);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Falha na conexão",
      detalhe: err.message
    });
  }
});

// IMAGENS
app.get("/img", async (req, res) => {
  try {
    const r = await fetch(req.query.url, { headers });
    res.set("Content-Type", r.headers.get("content-type"));
    r.body.pipe(res);
  } catch {
    res.status(500).send("Erro ao carregar imagem");
  }
});

// PLAYER
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
  console.log("Servidor rodando na porta " + PORT);
});
