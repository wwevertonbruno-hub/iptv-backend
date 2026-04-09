const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();

// Ativa o CORS para permitir conexão do Lovable/Browser
app.use(cors());
app.use(express.json());

// Headers que simulam o aplicativo IPTV Smarters Pro (Evita Erro 403)
const standardHeaders = {
  "User-Agent": "IPTVSmartersPlayer",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "X-Requested-With": "com.nst.iptvsmartersbox",
  "Connection": "keep-alive"
};

// Rota de Teste para verificar se o Railway está online
app.get("/", (req, res) => {
  res.send("Backend IPTV v2 Online 🚀");
});

// LOGIN E BUSCA DE CANAIS (POST)
app.post("/login", async (req, res) => {
  try {
    const { dns, username, password } = req.body;

    if (!dns || !username || !password) {
      return res.status(400).json({ error: "Preencha DNS, usuário e senha" });
    }

    // Adicionado um 'cb' (cache buster) no final para evitar bloqueio de repetição
    const apiUrl = `${dns}/player_api.php?username=${username}&password=${password}&action=get_live_streams&cb=${Date.now()}`;

    console.log("Tentando conexão em:", dns);

    const response = await fetch(apiUrl, { 
      headers: standardHeaders,
      timeout: 10000 // 10 segundos de limite
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: "O servidor IPTV recusou a conexão",
        status: response.status,
        mensagem: "Verifique se o DNS e as credenciais estão corretos ou se o IP foi bloqueado."
      });
    }

    const data = await response.json();
    
    // Se o retorno for um objeto de erro do Xtream Codes
    if (data.user_info && data.user_info.auth === 0) {
      return res.status(401).json({ error: "Usuário ou senha inválidos no servidor IPTV" });
    }

    res.json(data);

  } catch (err) {
    console.error("Erro no Processamento:", err.message);
    res.status(500).json({
      error: "Falha crítica de conexão",
      detalhe: err.message
    });
  }
});

// Proxy de Imagens (Logos dos canais)
app.get("/img", async (req, res) => {
  try {
    const r = await fetch(req.query.url, { headers: standardHeaders });
    res.set("Content-Type", r.headers.get("content-type"));
    r.body.pipe(res);
  } catch {
    res.status(500).send("Erro ao carregar imagem");
  }
});

// Proxy de Player (Streams .ts ou .m3u8)
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
  console.log("Servidor rodando na porta " + PORT);
});
