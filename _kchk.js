const pw=require('/Users/martiskuckailis/.nvm/versions/node/v24.14.1/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async()=>{const b=await pw.chromium.launch();
 const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 // 1. pagrindinio kontaktų blokas NEPALIESTAS
 let p=await c.newPage(); await p.goto('http://localhost:3086/',{waitUntil:'load'}); await p.waitForTimeout(600);
 console.log('pagrindinis .contacts li display:', await p.evaluate(()=>getComputedStyle(document.querySelector('.contacts li')).display));
 console.log('pagrindinis nav Kontaktai:', await p.evaluate(()=>[...document.querySelectorAll('.nav__panel a')].map(a=>a.textContent).join(' | ')));
 await p.close();
 // 2. kontaktų puslapio nuorodos
 p=await c.newPage(); await p.goto('http://localhost:3086/kontaktai/',{waitUntil:'load'}); await p.waitForTimeout(600);
 const r=await p.evaluate(()=>({
   display:getComputedStyle(document.querySelector('.contacts li')).display,
   links:[...document.querySelectorAll('.contacts a')].map(a=>a.getAttribute('href')),
   navK:[...document.querySelectorAll('.nav__links a,.nav__panel a')].filter(a=>/kontaktai/i.test(a.textContent)).map(a=>a.getAttribute('href')),
   footK:(document.querySelector('.foot__legal a')||{}).getAttribute('href'),
   footText:(document.querySelector('.foot__legal')||{}).innerText}));
 console.log('kontaktų psl .contacts li display:', r.display);
 console.log('nuorodos:'); r.links.forEach(l=>console.log('   ', l));
 console.log('nav Kontaktai href:', r.navK, '| footer href:', r.footK);
 console.log('footer tekstas:', r.footText);
 await b.close();})();
