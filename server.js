const express = require("express");
const cors = require("cors");
const { Readable } = require("stream");

const app = express();

app.use(cors());

app.use(express.json({
    limit: "10mb"
}));


// ================= CONFIG =================

const PORT = process.env.PORT || 8080;

const REQUEST_TIMEOUT = 60000;



// ================= HEADERS IPTV =================

function createHeaders(dns = "") {

    return {

        "User-Agent":
        "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",

        "Accept":
        "*/*",

        "Accept-Language":
        "pt-BR,pt;q=0.9",

        "Connection":
        "keep-alive",

        "Cache-Control":
        "no-cache",

        ...(dns ? {
            "Referer": dns
        } : {})

    };

}



// ================= FETCH TIMEOUT =================

async function requestWithTimeout(url, options={}) {


    const controller = new AbortController();


    const timer = setTimeout(()=>{

        controller.abort();

    }, REQUEST_TIMEOUT);



    try {


        return await fetch(url, {

            ...options,

            signal: controller.signal

        });


    } finally {

        clearTimeout(timer);

    }


}




// ================= HOME =================


app.get("/",(req,res)=>{


    res.json({

        status:"online",

        service:"IPTV Backend",

        version:"v24",

        time:new Date()

    });


});





// ================= LOGIN =================


app.post("/login", async(req,res)=>{


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



console.log("[LOGIN]", api.toString());



const response =
await requestWithTimeout(

api,

{

method:"GET",

headers:createHeaders(dns)

}

);



const body =
await response.text();



console.log("[LOGIN RESPONSE]",{

status:response.status,

server:
response.headers.get("server")

});



return res.status(response.status).json(
JSON.parse(body)
);



}catch(error){


console.log("[LOGIN ERROR]",error);


res.status(500).json({

error:error.message

});


}


});







// ================= STREAM PROXY =================


async function streamProxy(req,res){


try{


const {

url

}=req.query;



if(!url){

return res.status(400).json({

error:"URL não informada"

});

}



console.log("[STREAM]",url);

console.log("[RANGE]",req.headers.range || "none");



const headers = {


"User-Agent":

"Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",


"Accept":

"*/*",


"Connection":

"keep-alive"

};



// repassa range do player

if(req.headers.range){

headers.Range = req.headers.range;

}



const response = await fetch(url,{

method:"GET",

headers,

redirect:"follow"

});



console.log("[STREAM RESPONSE]",{

status:response.status,

type:
response.headers.get("content-type")

});





// headers importantes para vídeo

res.status(response.status);



res.setHeader(
"Access-Control-Allow-Origin",
"*"
);


res.setHeader(
"Cache-Control",
"no-cache"
);


res.setHeader(
"Accept-Ranges",
"bytes"
);



[
"content-type",
"content-length",
"content-range"
].forEach(header=>{


const value =
response.headers.get(header);


if(value){

res.setHeader(header,value);

}


});





if(!response.body){

return res.end();

}



Readable.fromWeb(
response.body
).pipe(res);



}catch(error){


console.log("[STREAM ERROR]",error);


res.status(500).json({

error:"Erro no stream",

detail:error.message

});


}


}




// ================= ROTAS DE VIDEO =================


app.get("/play",streamProxy);


app.get("/stream-proxy",streamProxy);






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
