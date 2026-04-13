app.use(cors());
app.use(express.json());

// Headers atualizados (funcionando sem 403)
// HEADERS OTIMIZADOS (ANTI-BLOQUEIO)
const standardHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  "Accept": "*/*",
  "Connection": "keep-alive"
};

app.get("/", (req, res) => {
  res.send("Backend IPTV v6.0 (EPG Inteligente) 🚀");
  res.send("Backend IPTV v7.0 (PLAYER FIX + EPG + STABLE) 🚀");
});


@@ -51,31 +51,7 @@ app.post("/login", async (req, res) => {
});


// ================= INFO =================
app.post("/info", async (req, res) => {
  try {
    const { dns, username, password, type, id } = req.body;

    const actionType = type === "series" ? "get_series_info" : "get_vod_info";
    const idParam = type === "series" ? "series_id" : "vod_id";

    const url = `${dns}/player_api.php?username=${username}&password=${password}&action=${actionType}&${idParam}=${id}`;

    const response = await fetch(url, {
      headers: standardHeaders,
      timeout: 10000
    });

    const data = await response.json();
    res.json(data);

  } catch {
    res.status(500).json({ error: "Erro ao buscar detalhes" });
  }
});


// ================= EPG INTELIGENTE =================
// ================= EPG =================
app.post("/epg", async (req, res) => {
  try {
    const { dns, username, password, stream_id } = req.body;
@@ -86,7 +62,6 @@ app.post("/epg", async (req, res) => {
      });
    }

    // 1️⃣ tenta EPG curto
    let url = `${dns}/player_api.php?username=${username}&password=${password}&action=get_short_epg&stream_id=${stream_id}`;

    let response = await fetch(url, {
@@ -96,7 +71,6 @@ app.post("/epg", async (req, res) => {

    let data = await response.json();

    // 2️⃣ fallback automático se vazio
    if (!data.epg_listings || data.epg_listings.length === 0) {
      url = `${dns}/player_api.php?username=${username}&password=${password}&action=get_simple_data_table&stream_id=${stream_id}`;

@@ -108,7 +82,6 @@ app.post("/epg", async (req, res) => {
      data = await response.json();
    }

    // 3️⃣ decode base64
    let epg = [];

    if (data.epg_listings) {
@@ -138,22 +111,17 @@ app.post("/epg", async (req, res) => {
});


// ================= IMG =================
app.get("/img", async (req, res) => {
  try {
    const r = await fetch(req.query.url, { headers: standardHeaders });
    res.set("Content-Type", r.headers.get("content-type"));
    r.body.pipe(res);
  } catch {
    res.status(500).send("Erro imagem");
  }
});


// ================= PLAYER =================
// ================= PLAYER (CORRIGIDO) =================
app.get("/play", async (req, res) => {
  try {
    const streamUrl = req.query.url;

    if (!streamUrl) {
      return res.status(400).send("URL do stream não informada");
    }

    console.log("STREAM:", streamUrl);

    const range = req.headers.range;

    const fetchOptions = {
@@ -166,22 +134,47 @@ app.get("/play", async (req, res) => {

    const r = await fetch(streamUrl, fetchOptions);

    res.set("Content-Type", r.headers.get("content-type") || "video/mp4");
    res.set("Accept-Ranges", "bytes");
    // HEADERS ESSENCIAIS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD");

    res.setHeader(
      "Content-Type",
      r.headers.get("content-type") || "application/vnd.apple.mpegurl"
    );

    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    if (r.headers.get("content-range")) {
      res.set("Content-Range", r.headers.get("content-range"));
      res.setHeader("Content-Range", r.headers.get("content-range"));
    }

    if (r.headers.get("content-length")) {
      res.set("Content-Length", r.headers.get("content-length"));
      res.setHeader("Content-Length", r.headers.get("content-length"));
    }

    res.status(r.status);

    r.body.pipe(res);

  } catch (err) {
    console.error("ERRO PLAY:", err.message);
    res.status(500).send("Erro ao reproduzir stream");
  }
});


// ================= IMG =================
app.get("/img", async (req, res) => {
  try {
    const r = await fetch(req.query.url, { headers: standardHeaders });
    res.set("Content-Type", r.headers.get("content-type"));
    r.body.pipe(res);
  } catch {
    res.status(500).send("Erro ao reproduzir");
    res.status(500).send("Erro imagem");
  }
});
