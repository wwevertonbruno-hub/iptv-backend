const express = require("express");
const cors = require("cors");
const { Readable } = require("stream");

const app = express();

app.use(cors());
app.use(express.json());


// HEADERS MAIS PARECIDOS COM NAVEGADOR
const buildHeaders = (dns) => ({
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36",

  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",

  "Accept-Language":
    "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",

  "Cache-Control":
    "no-cache",

  "Pragma":
    "no-cache",

  "Connection":
    "keep-alive",

  "Upgrade-Insecure-Requests":
    "1",

  "Referer":
    dns,

  "Origin":
    dns
});


app.get("/", (req, res) => {
  res.send("Backend IPTV v14 (Cloudflare Test) 🚀");
});


// ================= LOGIN =================

app.post("/login", async (req, res) => {

  try {

    const { dns, username, password, action } = req.body;


    if (!dns || !username || !password) {
      return res.status(400).json({
        error: "Preencha DNS, usuário e senha"
      });
    }


    const act = action || "get_live_streams";


    const url =
      `${dns}/player_api.php?username=${username}&password=${password}&action=${act}`;


    console.log("Consultando:");
    console.log(url);


    const response = await fetch(url, {

      method: "GET",

      headers: buildHeaders(dns),

      redirect: "follow"

    });


    console.log("Status:", response.status);
    console.log("Server:", response.headers.get("server"));
    console.log("CF-Ray:", response.headers.get("cf-ray"));


    const text = await response.text();



    if (!response.ok) {

      return res.status(response.status).json({

        error: "Servidor IPTV recusou",

        status_origem: response.status,

        servidor: response.headers.get("server"),

        cf_ray: response.headers.get("cf-ray"),

        resposta: text.substring(0, 500)

      });

    }



    try {

      const data = JSON.parse(text);

      res.json(data);


    } catch {

      res.status(500).json({

        error: "Resposta não é JSON",

        resposta: text.substring(0,500)

      });

    }



  } catch (err) {


    res.status(500).json({

      error: "Falha de conexão",

      detalhe: err.message

    });


  }

});



// ================= IMG =================

app.get("/img", async (req,res)=>{

  try {


    const url = decodeURIComponent(req.query.url);


    const response = await fetch(url,{

      headers:{

        "User-Agent":
        "Mozilla/5.0"

      }

    });


    res.set(
      "Content-Type",
      response.headers.get("content-type") || "image/jpeg"
    );


    const stream = Readable.fromWeb(response.body);

    stream.pipe(res);



  } catch(err){


    res.status(500).json({

      error:"Erro ao carregar imagem",

      detalhe:err.message

    });


  }

});



// ================= PLAYER =================

app.get("/play", async(req,res)=>{


try{


const streamUrl=req.query.url;

const range=req.headers.range;



if(!streamUrl){

return res.status(400).json({

error:"URL não informada"

});

}



const response=await fetch(streamUrl,{

headers:{

"User-Agent":
"Mozilla/5.0",

"Accept":
"*/*",

...(range ? {Range:range}:{})

},

redirect:"follow"

});



res.set(
"Content-Type",
response.headers.get("content-type") ||
"application/vnd.apple.mpegurl"
);


res.set(
"Cache-Control",
"no-cache"
);


const stream=Readable.fromWeb(response.body);

stream.pipe(res);



}catch(err){


res.status(500).json({

error:"Erro ao reproduzir",

detalhe:err.message

});


}



});



const PORT = process.env.PORT || 8080;


app.listen(PORT,"0.0.0.0",()=>{

console.log(
"Servidor rodando na porta " + PORT
);

});
