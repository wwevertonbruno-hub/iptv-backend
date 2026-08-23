const express = require("express");
const cors = require("cors");
const { Readable } = require("stream");

const app = express();

app.use(cors());
app.use(express.json({limit:"10mb"}));

const PORT = process.env.PORT || 8080;


// ================= HEADERS IPTV =================

function headers(){

return {

"User-Agent":
"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",

"Accept":
"*/*"

};

}


// ================= STATUS =================

app.get("/",(req,res)=>{

res.json({

status:"online",
service:"IPTV Backend",
version:"v27",
time:new Date()

});

});




// ================= XTREAM API PROXY =================


app.post("/login", async(req,res)=>{


try{


const {

dns,
username,
password,
action,

...params

}=req.body;



let url =
`${dns}/player_api.php?username=${username}&password=${password}`;



if(action){

url += `&action=${action}`;

}


// adiciona parâmetros extras
Object.keys(params).forEach(key=>{

if(params[key] !== undefined){

url += `&${key}=${encodeURIComponent(params[key])}`;

}

});



console.log("[LOGIN]",url);



const response = await fetch(url,{

headers:headers()

});



const text = await response.text();



console.log("[LOGIN RESPONSE]",{

status:response.status

});



res.status(response.status).send(text);



}catch(err){


console.log(err);


res.status(500).json({

error:err.message

});


}


});






// ================= STREAM =================


function rewriteM3U8(content,base){


return content
.split("\n")
.map(line=>{


if(line.startsWith("#") || !line.trim())

return line;



try{

return `/stream-proxy?url=${encodeURIComponent(new URL(line,base).href)}`;

}catch{

return line;

}


})
.join("\n");


}




async function stream(req,res){


try{


const {url}=req.query;


if(!url)
return res.status(400).send("URL ausente");



console.log("[STREAM]",url);


let h=headers();


if(req.headers.range){

h.Range=req.headers.range;

console.log("[RANGE]",req.headers.range);

}else{

console.log("[RANGE] none");

}



const response =
await fetch(url,{
headers:h,
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


const body =
await response.text();


res.setHeader(
"Content-Type",
"application/x-mpegurl"
);


res.setHeader(
"Access-Control-Allow-Origin",
"*"
);



return res.send(
rewriteM3U8(body,url)
);


}




// VIDEO


res.status(response.status);


res.setHeader(
"Access-Control-Allow-Origin",
"*"
);


if(type)
res.setHeader(
"Content-Type",
type
);



if(response.body)

Readable.fromWeb(response.body)
.pipe(res);

else

res.end();



}catch(err){


console.log("[STREAM ERROR]",err);


res.status(500).json({

error:err.message

});


}


}



app.get("/play",stream);

app.get("/stream-proxy",stream);






// ================= IMAGENS =================


app.get("/image",async(req,res)=>{


try{


const {url}=req.query;


if(!url)
return res.status(400).send("Imagem ausente");



console.log("[IMAGE]",url);



const response =
await fetch(url,{

headers:{
"User-Agent":"Mozilla/5.0"
}

});



if(!response.ok)

return res.status(response.status).end();



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



res.send(
Buffer.from(buffer)
);



}catch(err){


console.log("[IMAGE ERROR]",err);


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

}

);
