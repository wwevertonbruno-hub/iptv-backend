const express = require("express");
const cors = require("cors");
const { Readable } = require("stream");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 8080;


// =========================
// STATUS
// =========================

app.get("/", (req,res)=>{

res.json({
    status:"online",
    service:"IPTV Backend",
    version:"v28",
    time:new Date()
});

});



// =========================
// HEADERS IPTV
// =========================

function iptvHeaders(){

return {

"User-Agent":
"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",

"Accept":
"*/*",

"Connection":
"keep-alive"

};

}



// =========================
// LOGIN / XTREAM API
// =========================

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



// adiciona:
 // vod_id
 // series_id
 // category_id

Object.keys(params).forEach(key=>{


if(params[key] !== undefined){

url +=
`&${key}=${encodeURIComponent(params[key])}`;

}

});



console.log("[LOGIN]",url);



const response =
await fetch(url,{
headers:iptvHeaders()
});



const data =
await response.text();



console.log("[LOGIN RESPONSE]",{
status:response.status
});



res.status(response.status).send(data);



}catch(error){


console.log("[LOGIN ERROR]",error);


res.status(500).json({

error:error.message

});


}


});





// =========================
// STREAM PROXY
// MP4 + M3U8
// =========================


function rewriteM3U8(content,base){


return content
.split("\n")
.map(line=>{


if(
line.startsWith("#") ||
line.trim()===""
){

return line;

}



try{


return `/stream-proxy?url=${encodeURIComponent(
new URL(line,base).href
)}`;


}catch{


return line;


}


})
.join("\n");


}



async function streamProxy(req,res){


try{


const {
url
}=req.query;



if(!url){

return res.status(400)
.send("URL ausente");

}



console.log("[STREAM]",url);



const headers = iptvHeaders();



if(req.headers.range){

headers.Range =
req.headers.range;


console.log(
"[RANGE]",
req.headers.range
);


}else{


console.log("[RANGE] none");


}




const response =
await fetch(url,{

headers,

redirect:"follow"

});



const contentType =
response.headers.get(
"content-type"
) || "";



console.log(
"[STREAM RESPONSE]",
{
status:response.status,
type:contentType
}
);




// =====================
// HLS
// =====================

if(
url.includes(".m3u8") ||
contentType.includes("mpegurl")
){



const text =
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
rewriteM3U8(text,url)
);



}




// =====================
// MP4
// =====================


const headersCopy=[

"content-type",
"content-length",
"content-range",
"accept-ranges",
"last-modified",
"etag"

];



headersCopy.forEach(header=>{


const value =
response.headers.get(header);



if(value){

res.setHeader(
header,
value
);

}


});



res.setHeader(
"Access-Control-Allow-Origin",
"*"
);



res.status(
response.status
);



if(response.body){


Readable
.fromWeb(response.body)
.pipe(res);


}else{


res.end();


}



}catch(error){


console.log(
"[STREAM ERROR]",
error
);



res.status(500).json({

error:error.message

});


}


}




app.get(
"/stream-proxy",
streamProxy
);


app.get(
"/play",
streamProxy
);






// =========================
// IMAGENS
// =========================


app.get("/image",async(req,res)=>{


try{


const {
url
}=req.query;



if(!url)
return res.status(400).end();



console.log(
"[IMAGE]",
url
);



const response =
await fetch(url,{

headers:{
"User-Agent":
"Mozilla/5.0"
}

});



const buffer =
await response.arrayBuffer();



res.setHeader(
"Content-Type",
response.headers.get(
"content-type"
) ||
"image/png"
);



res.setHeader(
"Access-Control-Allow-Origin",
"*"
);



res.send(
Buffer.from(buffer)
);



}catch(error){


console.log(
"[IMAGE ERROR]",
error
);


res.status(500).end();


}



});






// =========================
// START
// =========================


app.listen(
PORT,
"0.0.0.0",
()=>{


console.log(
`Servidor online porta ${PORT}`
);


}
);
