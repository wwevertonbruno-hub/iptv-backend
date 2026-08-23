const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));


// ================= CONFIG =================

const PORT = process.env.PORT || 8080;

const REQUEST_TIMEOUT = 15000;


// ================= HEADERS =================

function createHeaders(){

    return {

        "User-Agent":
        "Dalvik/2.1.0 (Linux; Android 11)",

        "Accept":
        "application/json,text/plain,*/*",

        "Accept-Language":
        "pt-BR,pt;q=0.9",

        "Cache-Control":
        "no-cache",

        "Connection":
        "keep-alive",

        "Accept-Encoding":
        "gzip, deflate",

        "DNT":
        "1"

    };

}


// ================= FETCH CONTROL =================

async function requestWithTimeout(url, options={}){


    const controller = new AbortController();


    const timer = setTimeout(()=>{

        controller.abort();

    }, REQUEST_TIMEOUT);



    try{


        const response = await fetch(url,{

            ...options,

            signal:
            controller.signal

        });


        return response;


    }finally{

        clearTimeout(timer);

    }

}



// ================= HEALTH =================


app.get("/",(req,res)=>{

    res.json({

        status:"online",

        service:"IPTV Backend",

        version:"v21",

        time:new Date()

    });

});



// ================= LOGIN =================


app.post("/login",async(req,res)=>{


try{


const {
dns,
username,
password,
action="get_live_streams"
}=req.body;



if(!dns || !username || !password){

return res.status(400).json({

error:"Informe dns, username e password"

});

}



const api = new URL(
"/player_api.php",
dns
);



api.searchParams.set(
"username",
username
);


api.searchParams.set(
"password",
password
);


api.searchParams.set(
"action",
action
);



console.log(
"[LOGIN]",
api.toString()
);



const response =
await requestWithTimeout(

api,

{

method:"GET",

headers:
createHeaders(),

redirect:"follow"

}

);



const server =
response.headers.get("server");


const cloudflare =
server &&
server.toLowerCase()
.includes("cloudflare");



const body =
await response.text();



console.log({

status:response.status,

server,

cloudflare

});



if(!response.ok){


return res.status(response.status).json({

error:"Servidor externo recusou",

status_origem:
response.status,

servidor:
server,

cloudflare,

cf_ray:
response.headers.get("cf-ray"),

resposta:
body.substring(0,300)

});


}



try{


const json =
JSON.parse(body);


return res.json(json);



}catch{


return res.status(500).json({

error:"Resposta inválida do servidor",

resposta:
body.substring(0,300)

});


}



}catch(error){


return res.status(500).json({

error:"Falha no backend",

detalhe:error.message

});


}


});



// ================= START =================


app.listen(

PORT,

"0.0.0.0",

()=>{

console.log(
`Servidor online porta ${PORT}`
);

}

);
