const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Backend rodando 🚀");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Servidor iniciado");
});
