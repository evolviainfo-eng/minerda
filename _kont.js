const pw=require('/Users/martiskuckailis/.nvm/versions/node/v24.14.1/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async()=>{const b=await pw.chromium.launch();
 for(const [w,h,tag] of [[390,844,'m'],[1280,900,'d1280'],[1440,900,'d']]){
  const c=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:w<500,hasTouch:w<500});
  const p=await c.newPage();const errs=[],bad=[];
  p.on('pageerror',e=>errs.push(e.message)); p.on('response',r=>{if(r.status()>=400)bad.push(r.status()+' '+r.url().replace('http://localhost:3086',''))});
  await p.goto('http://localhost:3086/kontaktai/',{waitUntil:'load'});
  await p.evaluate(async()=>{const H=document.body.scrollHeight;for(let y=0;y<H;y+=400){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,30));}window.scrollTo(0,0);});
  await p.waitForTimeout(900);
  const m=await p.evaluate(()=>{
    const nav=document.querySelector('.nav__in');
    const links=document.querySelector('.nav__links');
    const tel=document.querySelector('.nav__tel');
    return {total:Math.round(document.body.scrollHeight),
      overflowX: document.documentElement.scrollWidth>window.innerWidth+1 ? document.documentElement.scrollWidth : 0,
      navOverflow: links ? (links.scrollWidth>links.clientWidth+1) : null,
      navItems: links?links.children.length:null,
      navRight: links?Math.round(links.getBoundingClientRect().right):null,
      telLeft: tel?Math.round(tel.getBoundingClientRect().left):null,
      rows: [...document.querySelectorAll('.contacts li')].map(li=>li.innerText.replace(/\n/g,' | ')),
      hiddenRv: [...document.querySelectorAll('.rv')].filter(e=>+getComputedStyle(e).opacity<.95).length};});
  console.log(`[${w}] total=${m.total} overflowX=${m.overflowX||'no'} navItems=${m.navItems} navOverflow=${m.navOverflow} navRight=${m.navRight} telLeft=${m.telLeft} hiddenRv=${m.hiddenRv}`);
  if(w===390) m.rows.forEach(r=>console.log('   ',r));
  if(errs.length) console.log('   ERR',errs); if(bad.length) console.log('   404',bad);
  await p.screenshot({path:`_shots/kont-${tag}.png`,fullPage:true});
  await c.close();
 } await b.close();})();
