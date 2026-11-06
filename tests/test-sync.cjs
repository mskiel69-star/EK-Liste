const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),crypto=require('node:crypto').webcrypto;
const src=fs.readFileSync('app.js','utf8').replace(/init\(\);\s*$/,'');
function device(network=false){const nodes=new Map(),values=new Map();const node=()=>({textContent:'',value:'',style:{},classList:{toggle(){}},addEventListener(){}});const context={crypto,TextEncoder,TextDecoder,console,Map,Set,Date,JSON,URL,URLSearchParams,Uint8Array,setTimeout,clearTimeout,setInterval(){},clearInterval(){},btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),navigator:{onLine:true},document:{hidden:false,getElementById:id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelectorAll:()=>[],addEventListener(){}},localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},window:{addEventListener(){}},location:{hash:'',search:'',origin:'https://example.test',pathname:'/'},history:{replaceState(){}},confirm:()=>true};vm.createContext(context);vm.runInContext(src,context);const run=s=>vm.runInContext(s,context);run(`render=()=>{};renderStoreButtons=()=>{};${network?'':'sendState=()=>{};'}syncCode='paired-room-12345678901234567890';materialize()`);return {context,run}}
const a=device(),b=device();const transfer=(from,to)=>{to.context.remote=JSON.parse(from.run('JSON.stringify(records)'));to.run('merge(remote)')};
a.run(`parseAndAdd('Milch')`);transfer(a,b);
// materialize previously returned references to record snapshots: this edit did not increase its version.
b.run(`const id=items[0].id;const before=records['i:'+id].v[0];items[0].done=true;broadcastState()`);
assert.ok(b.run(`records['i:'+id].v[0]>before`),'Änderung eines empfangenen Artikels benötigt neue Version');transfer(b,a);assert.equal(a.run('items[0].done'),true);
a.run(`items[0].note='laktosefrei';broadcastState()`);transfer(a,b);assert.equal(b.run('items[0].note'),'laktosefrei');
b.run(`storeRoutes.Aldi.reverse();broadcastState()`);transfer(b,a);assert.equal(a.run('storeRoutes.Aldi[0]'),'Sonstiges');
a.run(`parseAndAdd('Brot')`);b.run(`parseAndAdd('Tomaten')`);transfer(a,b);transfer(b,a);assert.equal(a.run('items.length'),3);assert.equal(b.run('items.length'),3);
a.run(`items[0].done=false;broadcastState()`);transfer(a,b);assert.equal(b.run('items[0].done'),false);
a.run(`items=items.filter(i=>i.title!=='Brot');broadcastState()`);transfer(a,b);assert.equal(b.run(`items.some(i=>i.title==='Brot')`),false);
console.log('Zwei getrennte Geräte: neue Artikel, Abhaken, Notizen, Laufwege, parallele Offline-Ergänzungen, Reaktivieren und Löschen bestanden.');
module.exports={device};
