const express = require("express");
const cors = require("cors");
const { Readable } = require("stream");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 8080;


// ================= HEADERS =================

function createHeaders(dns) {

    return {

        "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",

        "Accept":
        "*/*",

        "Connection":
        "keep-alive",

        ...(dns ? {
            "Referer": dns
        } : {})

    };

}


// ================= FETCH =================

async function fetchTimeout(url, options={}) {

    const controller = new AbortController();

    const timer = setTimeout(()=>{

        controller.abort();

    },60000);


    try{

        return await fetch(url,{
            ...options,
            signal:controller.signal
        });


    }finally{

        clearTimeout(timer);

    }

}



// ================= HOME =================


app.get("/",(req,res)=>{

    res.json({

        status:"online",

        service:"IPTV Backend",

        version:"v26",

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

action="get_live_streams",

series_id

}=req.body;



if(!dns || !username || !password){

return res.status(400).json({

error:"Dados incompletos"

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



if(series_id){

api.searchParams.set(
"series_id",
series_id
);

}



console.log(
"[LOGIN]",
api.toString()
);



const response = await fetchTimeout(

api,

{

headers:createHeaders(dns)

}

);



const body =
await response.text();



console.log(

"[LOGIN RESPONSE]",

{

status:response.status,

server:
response.headers.get("server"),

size:
body.length

}

);





// ================= DEBUG SERIES =================


if(action === "get_series_info"){


console.log(
"[SERIES DEBUG] tamanho:",
body.length
);


try{


const json = JSON.parse(body);



console.log(

"[SERIES DEBUG] chaves:",

Object.keys(json)

);



console.log(

"[SERIES DEBUG] episodes:",

json.episodes
? "EXISTE"
: "NÃO EXISTE"

);



if(json.episodes){


console.log(

"[SERIES DEBUG] temporadas:",

Object.keys(json.episodes)

);



console.log(

"[SERIES DEBUG] primeiro episodio:",

json.episodes[
Object.keys(json.episodes)[0]
]?.[0]

);


}



}catch(e){


console.log(

"[SERIES DEBUG ERROR]",

e.message

);


}


}





res
.status(response.status)
.json(
JSON.parse(body)
);



}catch(error){


console.log(
"[LOGIN ERROR]",
error.message
);



res.status(500).json({

error:error.message

});


}


});






// ================= HLS REWRITE =================


function rewriteM3U8(content,base){


return content
.split("\n")
.map(line=>{


if(!line || line.startsWith("#")){

return line;

}



let url;


try{


url = new URL(
line,
base
).href;



}catch{


url=line;


}



return `/stream-proxy?url=${encodeURIComponent(url)}`;


})
.join("\n");


}






// ================= STREAM =================


async function streamProxy(req,res){


try{


const {

url

}=req.query;



if(!url){

return res.status(400).json({

error:"URL ausente"

});

}



console.log(
"[STREAM]",
url
);



console.log(

"[RANGE]",

req.headers.range || "none"

);



const headers={


"User-Agent":

"Mozilla/5.0 Chrome/120",


"Accept":

"*/*"

};



if(req.headers.range){

headers.Range=req.headers.range;

}




const response = await fetch(

url,

{

headers

}

);



const type =
response.headers.get(
"content-type"
)
|| "";



console.log(

"[STREAM RESPONSE]",

{

status:response.status,

type

}

);





// HLS


if(

url.includes(".m3u8")

||

type.includes("mpegurl")

){



const text =
await response.text();



const playlist =
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



return res.send(
playlist
);


}





// MP4 / TS


res.status(response.status);


res.setHeader(

"Access-Control-Allow-Origin",

"*"

);



[
"content-type",
"content-length",
"content-range"
]
.forEach(h=>{


const value =
response.headers.get(h);


if(value){

res.setHeader(
h,
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


console.log(

"[STREAM ERROR]",

error.message

);



res.status(500).json({

error:error.message

});


}


}




app.get(
"/play",
streamProxy
);


app.get(
"/stream-proxy",
streamProxy
);





app.listen(

PORT,

"0.0.0.0",

()=>{

console.log(

`Servidor online porta ${PORT}`

);

}

);
