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


// ================= HEADERS =================

function createHeaders(dns = "") {

    return {

        "User-Agent":
        "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",

        "Accept":
        "*/*",

        "Connection":
        "keep-alive",

        "Cache-Control":
        "no-cache",

        ...(dns ? {
            "Referer": dns
        } : {})

    };

}



// ================= FETCH =================

async function requestWithTimeout(url, options={}) {


    const controller = new AbortController();


    const timer = setTimeout(()=>{

        controller.abort();

    }, REQUEST_TIMEOUT);



    try {

        return await fetch(url,{
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

        version:"v25",

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



res.status(response.status).json(
JSON.parse(body)
);



}catch(error){


console.log("[LOGIN ERROR]",error);


res.status(500).json({

error:error.message

});


}


});







// ================= HLS REWRITE =================


function rewriteM3U8(content, baseUrl){


return content
.split("\n")
.map(line=>{


    line=line.trim();


    if(!line){

        return line;

    }



    // comentários do m3u8

    if(line.startsWith("#")){

        return line;

    }



    // URL absoluta ou relativa

    let segmentUrl;



    if(line.startsWith("http")){

        segmentUrl=line;

    }else{


        segmentUrl =
        new URL(line, baseUrl).href;

    }



    return `/stream-proxy?url=${encodeURIComponent(segmentUrl)}`;


})
.join("\n");


}






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



const headers={


"User-Agent":
"Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",


"Accept":
"*/*",


"Connection":
"keep-alive"

};



if(req.headers.range){

headers.Range=req.headers.range;

}




const response =
await fetch(url,{

headers,

redirect:"follow"

});




const contentType =
response.headers.get("content-type") || "";



console.log("[STREAM RESPONSE]",{

status:response.status,

type:contentType

});





// ===== HLS =====


if(

url.includes(".m3u8")

||

contentType.includes("mpegurl")

){



const text =
await response.text();



const rewritten =
rewriteM3U8(
text,
url
);



res.setHeader(
"Content-Type",
"application/x-mpegurl"
);



res.setHeader(
"Access-Control-Allow-Origin",
"*"
);



res.setHeader(
"Cache-Control",
"no-cache"
);



return res.send(rewritten);



}







// ===== MP4 / TS =====


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
]
.forEach(header=>{


const value =
response.headers.get(header);


if(value){

res.setHeader(
header,
value
);

}


});





if(response.body){


Readable.fromWeb(
response.body
).pipe(res);


}else{

res.end();

}



}catch(error){


console.log("[STREAM ERROR]",error);



res.status(500).json({

error:"Erro no stream",

detail:error.message

});


}


}




// ================= ROUTES =================


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
