const express = require("express");
const cors = require("cors");
const { Readable } = require("stream");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));


// ================= CONFIG =================

const PORT = process.env.PORT || 8080;

const REQUEST_TIMEOUT = 20000;


// ================= HEADERS =================

function createHeaders(dns = "") {

    return {

        "User-Agent":
        "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",

        "Accept":
        "application/json,text/plain,*/*",

        "Accept-Language":
        "pt-BR,pt;q=0.9",

        "Cache-Control":
        "no-cache",

        "Connection":
        "keep-alive",

        ...(dns ? {
            "Referer": dns,
            "Origin": dns
        } : {})

    };

}



// ================= FETCH TIMEOUT =================

async function requestWithTimeout(url, options = {}) {


    const controller = new AbortController();


    const timer = setTimeout(() => {

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




// ================= HEALTH =================


app.get("/", (req,res)=>{


    res.json({

        status:"online",

        service:"IPTV Backend",

        version:"v23",

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



const response = await requestWithTimeout(

api,

{

method:"GET",

headers:createHeaders(dns),

redirect:"follow"

}

);



const body = await response.text();



console.log("[LOGIN RESPONSE]", {

status: response.status,

server: response.headers.get("server")

});



if(!response.ok){


return res.status(response.status).json({

error:"Servidor externo recusou",

status_origem:response.status,

resposta:body.substring(0,300)

});


}



try{


return res.json(JSON.parse(body));


}catch{


return res.status(500).json({

error:"Resposta inválida",

resposta:body.substring(0,300)

});


}



}catch(error){


console.log("[LOGIN ERROR]",error);


res.status(500).json({

error:"Falha no backend",

detalhe:error.message

});


}



});






// ================= STREAM HANDLER =================


async function proxyStream(req,res){


try{


const { url } = req.query;



if(!url){


return res.status(400).json({

error:"URL do stream não informada"

});


}



console.log("[STREAM]", url);



const headers = {


"User-Agent":

"Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",


"Accept":

"*/*",


"Connection":

"keep-alive"


};



// importante para players

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

contentType:
response.headers.get("content-type")

});




res.status(response.status);



[
"content-type",
"content-length",
"content-range",
"accept-ranges"
].forEach(header=>{


const value = response.headers.get(header);


if(value){

res.setHeader(header,value);

}


});





if(!response.body){

return res.end();

}





const stream = Readable.fromWeb(
response.body
);



stream.pipe(res);



}catch(error){


console.log("[STREAM ERROR]",error);



res.status(500).json({

error:"Erro no proxy",

detalhe:error.message

});


}


}






// ================= PLAY =================


app.get("/play", proxyStream);




// ================= STREAM PROXY (LOVABLE) =================


app.get("/stream-proxy", proxyStream);






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
