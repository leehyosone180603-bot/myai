// 공통 헬퍼 (사진 배경 썸네일 포함)
const FS=require("fs");
function page(inner){return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><link rel="stylesheet" href="../common.css"></head><body><div class="page"><div class="wrap">'+inner+'</div></div></body></html>';}
function sqbg(tag,ttlHtml,subHtml,brand){ // 사진 배경 bg.jpg + 강한 scrim
 brand=brand||"알고살자";
 return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><link rel="stylesheet" href="../common.css"></head><body>'+
 '<div class="sq">'+
 '<div class="bg" style="background-image:url(\'bg.jpg\')"></div>'+
 '<div class="scrim" style="background:linear-gradient(180deg,rgba(8,20,42,.70) 0%,rgba(8,20,42,.52) 42%,rgba(8,20,42,.90) 100%)"></div>'+
 '<div class="inner"><span class="tag"><span class="dot"></span>'+tag+'</span><div class="bar"></div><div class="ttl">'+ttlHtml+'</div><div class="spacer"></div><div class="subline">'+subHtml+'</div></div>'+
 '<div class="brand">'+brand+'</div></div></body></html>';
}
function foot(src){return '<div class="foot">'+src+'</div>';}
function writeSet(dir,A){
  FS.writeFileSync("/home/user/myai/blog_img/"+dir+"/thumb.html",A.thumb);
  FS.writeFileSync("/home/user/myai/blog_img/"+dir+"/info1.html",A.info1);
  FS.writeFileSync("/home/user/myai/blog_img/"+dir+"/info2.html",A.info2);
  console.log("wrote",dir);
}
module.exports={page,sqbg,foot,writeSet};
