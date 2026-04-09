const express = require("express");
const app = express();

// rota teste
app.get("/", (req, res) => {
  res.send("Backend rodando 🚀");
});

// porta correta
const PORT = process.env.PORT || 3000;

// IMPORTANTE: 0.0.0.0
app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor rodando na porta " + PORT);
});
