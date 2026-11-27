const https=require("https"), fs=require("fs");
const KEY=process.env.PX_KEY;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function get(url){return new Promise((res,rej)=>{https.get(url,r=>{let d=[];r.on("data",c=>d.push(c));r.on("end",()=>res(Buffer.concat(d)));}).on("error",rej);});}
const jobs=fs.readFileSync("/tmp/nvup/pxretro.tsv","utf8").trim().split("\n").map(l=>l.split("\t"));
(async()=>{
  for(const [folder,query] of jobs){
    const out="/home/user/myai/blog_img/"+folder+"/bg.jpg";
    if(fs.existsSync(out)&&fs.statSync(out).size>20000){console.log("SKIP",folder);continue;}
    let j,tries=0;
    while(tries<6){
      const api="https://pixabay.com/api/?key="+KEY+"&q="+encodeURIComponent(query)+"&image_type=photo&orientation=horizontal&per_page=20&safesearch=true&min_width=1280";
      const raw=(await get(api)).toString();
      try{j=JSON.parse(raw);break;}catch(e){tries++;await sleep(8000);}
    }
    if(!j){console.log("FAIL",folder);continue;}
    const hits=(j.hits||[]).filter(h=>h.imageWidth>=h.imageHeight);
    if(!hits.length){console.log("NOHIT",folder);await sleep(2500);continue;}
    const img=await get(hits[0].largeImageURL);
    fs.writeFileSync(out,img);
    console.log("OK",folder,"id="+hits[0].id,Math.round(img.length/1024)+"KB");
    await sleep(3000);
  }
  console.log("retro-download-done");
})();
