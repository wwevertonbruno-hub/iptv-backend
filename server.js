const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());


const buildHeaders = (dns) => ({
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",

  "Accept":
    "*/*",

  "Accept-Encoding":
    "gzip, deflate, br",

  "Accept-Language":
    "pt-BR,pt;q=0.9,en-US;q=0.8",

  "Connection":
    "keep-alive",

  "Cache-Control":
    "no-cache",

  "Pragma":
    "no-cache",

  "Referer":
    dns + "/",

  "Origin":
    dns
});


app.get("/", (req,res)=>{
  res.send("Backend IPTV v15 TESTE 🚀");
});



// ================= LOGIN =================

app.post("/login", async (req,res)=>{

try{


const {
dns,
username,
password,
action
}=req.body;



if(!dns || !username || !password){

return res.status(400).json({

error:"DNS, usuário e senha obrigatórios"

});

}



const act = action || "get_live_streams";



const apiUrl = new URL(
"/player_api.php",
dns
);



apiUrl.searchParams.append(
"username",
username
);

apiUrl.searchParams.append(
"password",
password
);

apiUrl.searchParams.append(
"action",
act
);



console.log(
"Acessando:",
apiUrl.toString()
);



const controller = new AbortController();


const timeout = setTimeout(()=>{

controller.abort();

},15000);



const response = await fetch(
apiUrl,
{

method:"GET",

headers:buildHeaders(dns),

redirect:"follow",

signal:controller.signal

}
);



clearTimeout(timeout);



console.log(
"STATUS:",
response.status
);


console.log(
"SERVER:",
response.headers.get("server")
);


console.log(
"CF-RAY:",
response.headers.get("cf-ray")
);



const text =
await response.text();



if(!response.ok){


return res.status(response.status).json({

error:"Servidor IPTV recusou",

status_origem:response.status,

servidor:response.headers.get("server"),

cf_ray:response.headers.get("cf-ray"),

resposta:text.substring(0,1000)

});


}



try{


const json = JSON.parse(text);

return res.json(json);


}catch{


return res.json({

resposta:text

});


}



}catch(err){


return res.status(500).json({

error:"Falha interna",

detalhe:err.message

});


}


});



const PORT =
process.env.PORT || 8080;



app.listen(
PORT,
"0.0.0.0",
()=>{

console.log(
"Servidor rodando porta:",
PORT
);

});
