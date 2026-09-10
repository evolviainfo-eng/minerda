const pw=require('/Users/martiskuckailis/.nvm/versions/node/v24.14.1/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async()=>{const b=await pw.chromium.launch();
 for(const [w,h,tag] of [[390,844,'m'],[1440,900,'d']]){
  const c=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:w<500,hasTouch:w<500});
  const p=await c.newPage(); await p.goto('http://localhost:3086/',{waitUntil:'load'});
  await p.evaluate(async()=>{const H=document.body.scrollHeight;for(let y=0;y<H;y+=500){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,30));}});
  await p.waitForTimeout(900);
  const m=await p.evaluate(()=>{const e=document.querySelector('.foot__legal');const cs=getComputedStyle(e);const r=e.getBoundingClientRect();
    return {text:e.innerText, h:Math.round(r.height), lineH:parseFloat(cs.lineHeight)||0, size:cs.fontSize, color:cs.color, tt:cs.textTransform,
      overflowX: document.documentElement.scrollWidth>window.innerWidth+1};});
  console.log(`[${w}] ${JSON.stringify(m)}`);
  const bx=await p.evaluate(()=>{const r=document.querySelector('.foot').getBoundingClientRect();return {y:Math.round(r.top+window.scrollY),height:Math.round(r.height)};});
  await p.screenshot({path:`_shots/foot-${tag}.png`,fullPage:true,clip:{x:0,y:bx.y,width:w,height:Math.min(bx.height,900)}});
  await c.close();
 } await b.close();})();
