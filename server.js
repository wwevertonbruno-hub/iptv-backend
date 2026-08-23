const express = require("express");
const cors = require("cors");
const { Readable } = require("stream");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 8080;


// ================= HEADERS =================

function createHeaders() {
    return {
        "User-Agent":
        "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",

        "Accept":
        "*/*",

        "Connection":
        "keep-alive"
    };
}



// ================= HOME =================

app.get("/", (req,res)=>{

    res.json({
        status:"online",
        service:"IPTV Backend",
        version:"v26",
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


const url =
`${dns}/player_api.php?username=${username}&password=${password}&action=${action}`;


console.log("[LOGIN]",url);


const response = await fetch(url,{
headers:createHeaders()
});


const data = await response.text();


console.log("[LOGIN RESPONSE]",{
status:response.status
});


res.status(response.status).send(data);


}catch(error){

console.log(error);

res.status(500).json({
error:error.message
});

}

});






// ================= REWRITE HLS =================

function rewriteM3U8(content, baseUrl){

return content
.split("\n")
.map(line=>{


if(!line || line.startsWith("#"))
return line;


let url;


try{

url = new URL(line,baseUrl).href;

}catch{

url=line;

}


return `/stream-proxy?url=${encodeURIComponent(url)}`;


})
.join("\n");

}





// ================= STREAM PROXY =================

async function streamProxy(req,res){

try{


const {url}=req.query;


if(!url){

return res.status(400).json({
error:"URL ausente"
});

}


console.log("[STREAM]",url);

console.log("[RANGE]",req.headers.range || "none");



const headers=createHeaders();


if(req.headers.range){

headers.Range=req.headers.range;

}



const response = await fetch(url,{
headers,
redirect:"follow"
});



const type =
response.headers.get("content-type") || "";



console.log("[STREAM RESPONSE]",{
status:response.status,
type
});





// HLS

if(
url.includes(".m3u8") ||
type.includes("mpegurl")
){


const text =
await response.text();


const fixed =
rewriteM3U8(text,url);



res.setHeader(
"Content-Type",
"application/x-mpegurl"
);


res.setHeader(
"Access-Control-Allow-Origin",
"*"
);


return res.send(fixed);

}




// VIDEO MP4 / TS


res.status(response.status);


res.setHeader(
"Access-Control-Allow-Origin",
"*"
);


res.setHeader(
"Accept-Ranges",
"bytes"
);


[
"content-type",
"content-length",
"content-range"
].forEach(h=>{

const value=response.headers.get(h);

if(value)
res.setHeader(h,value);

});



if(response.body){

Readable.fromWeb(response.body)
.pipe(res);

}else{

res.end();

}



}catch(error){


console.log("[STREAM ERROR]",error);


res.status(500).json({

error:"stream error",

detail:error.message

});


}

}




app.get("/play",streamProxy);

app.get("/stream-proxy",streamProxy);







// ================= IMAGE PROXY =================

app.get("/image", async(req,res)=>{


try{


const {url}=req.query;


if(!url){

return res.status(400).send("Imagem não informada");

}



console.log("[IMAGE]",url);



const response =
await fetch(url,{
headers:{
"User-Agent":
"Mozilla/5.0",
"Accept":
"image/*,*/*"
}
});



if(!response.ok){

return res.status(response.status).end();

}



const type =
response.headers.get("content-type")
||
"image/png";



res.setHeader(
"Content-Type",
type
);


res.setHeader(
"Access-Control-Allow-Origin",
"*"
);



const buffer =
await response.arrayBuffer();



res.send(Buffer.from(buffer));



}catch(error){


console.log("[IMAGE ERROR]",error);


res.status(500).end();


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

});
