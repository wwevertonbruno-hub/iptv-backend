const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());


app.get("/", (req,res)=>{
    res.send("Backend IPTV TESTE CLOUDFLARE 🚀");
});


app.post("/login", async(req,res)=>{

try {

const {dns, username, password} = req.body;


if(!dns || !username || !password){

return res.status(400).json({
error:"Dados incompletos"
});

}


const url =
`${dns}/player_api.php?username=${username}&password=${password}&action=get_live_streams`;


console.log("URL:",url);



const response = await fetch(url,{
headers:{
"User-Agent":"IPTV Smarters Pro",
"Accept":"application/json,text/plain,*/*",
"Connection":"keep-alive"
}
});



const text = await response.text();


const cloudflare =
response.headers.get("server") === "cloudflare";



if(cloudflare){

return res.status(403).json({

error:"Cloudflare bloqueou a requisição",

status:response.status,

mensagem:"O bloqueio ocorreu antes da API IPTV responder",

cf_ray:response.headers.get("cf-ray")

});

}



res.json(JSON.parse(text));


}catch(err){

res.status(500).json({

error:"Erro interno",

detalhe:err.message

});

}

});



const PORT=process.env.PORT || 8080;

app.listen(PORT,"0.0.0.0",()=>{

console.log(
"Servidor rodando porta "+PORT
);

});
