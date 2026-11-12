'use strict';
    const defaultRoutes = {
      "Aldi": ["Gemüse", "Brot", "Süßigkeiten", "Fleisch und Wurst", "Kühlregal", "Nudeln und Getreide", "Getränke", "Drogerie", "Sonstiges"],
      "Famila": ["Brot", "Kühlregal", "Gemüse", "Fleisch und Wurst", "Süßigkeiten", "Nudeln und Getreide", "Getränke", "Drogerie", "Sonstiges"]
    };

    const initialDict = {
      "nudeln": "Nudeln und Getreide", "spaghetti": "Nudeln und Getreide", "reis": "Nudeln und Getreide",
      "äpfel": "Gemüse", "apfel": "Gemüse", "banane": "Gemüse", "bananen": "Gemüse", "kartoffel": "Gemüse", "kartoffeln": "Gemüse", 
      "tomate": "Gemüse", "tomaten": "Gemüse", "gurke": "Gemüse", "gurken": "Gemüse", "salat": "Gemüse", "birne": "Gemüse", 
      "birnen": "Gemüse", "paprika": "Gemüse", "zucchini": "Gemüse", "zwiebel": "Gemüse", "zwiebeln": "Gemüse", "knoblauch": "Gemüse", 
      "möhren": "Gemüse", "karotten": "Gemüse", "brokkoli": "Gemüse", "champignons": "Gemüse", "pilze": "Gemüse", "avocado": "Gemüse",
      "zitrone": "Gemüse", "zitronen": "Gemüse", "orange": "Gemüse", "orangen": "Gemüse", "spinat": "Gemüse", "lauch": "Gemüse", "porree": "Gemüse",
      "brot": "Brot", "brötchen": "Brot", "baguette": "Brot", "roggenbrot": "Brot", "dinkelbrot": "Brot", "toast": "Brot", "mehl": "Brot", "hefe": "Brot",
      "schokolade": "Süßigkeiten", "chips": "Süßigkeiten", "kekse": "Süßigkeiten", "keks": "Süßigkeiten", "gummibärchen": "Süßigkeiten",
      "hackfleisch": "Fleisch und Wurst", "hack": "Fleisch und Wurst", "salami": "Fleisch und Wurst", "bratwurst": "Fleisch und Wurst",
      "schinken": "Fleisch und Wurst", "wurst": "Fleisch und Wurst", "hähnchen": "Fleisch und Wurst", "steak": "Fleisch und Wurst",
      "milch": "Kühlregal", "butter": "Kühlregal", "käse": "Kühlregal", "quark": "Kühlregal", "joghurt": "Kühlregal", "sahne": "Kühlregal", "eier": "Kühlregal", "ei": "Kühlregal",
      "wasser": "Getränke", "bier": "Getränke", "cola": "Getränke", "saft": "Getränke", "kaffee": "Getränke", "tee": "Getränke",
      "toilettenpapier": "Drogerie", "klopapier": "Drogerie", "küchenrolle": "Drogerie", "seife": "Drogerie", "shampoo": "Drogerie"
    };

const $=id=>document.getElementById(id), norm=s=>s.trim().toLocaleLowerCase('de'), clone=o=>JSON.parse(JSON.stringify(o));
const uuid=()=>typeof crypto.randomUUID==='function'?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(24)),x=>x.toString(16).padStart(2,'0')).join('');
const client=uuid(), STORAGE='einkauf-v3', APP_VERSION='3.4.6';
let deviceId;try{deviceId=localStorage.getItem('einkauf-device-id');if(!deviceId){deviceId=uuid();localStorage.setItem('einkauf-device-id',deviceId)}}catch(e){deviceId=client}
let db={schema:3,rooms:{},room:'',activeStore:'Aldi'}, records={}, items=[],storeRoutes={},categoryDict={},activeStore='Aldi',syncCode='', mqttClient=null,clock=0, syncReady=false, key=null,topic='', generation=0;
let editingItemId=null,editingStoreItemId=null,editingNoteItemId=null,recognition=null,keepRecording=false, waitingWorker=null,reg=null;
function status(t){$('mic-status').textContent=t}
function persist(){try{db.rooms[syncCode]=records;db.room=syncCode;db.activeStore=activeStore;localStorage.setItem(STORAGE,JSON.stringify(db));return true}catch(e){status('Speichern fehlgeschlagen! Bitte Sicherung exportieren.');$('app-state').textContent='Achtung: Änderungen können momentan nicht dauerhaft gespeichert werden.';return false}}
function stamp(){clock=Math.max(Date.now(),clock+1);return [clock,client]}
function newer(a,b){return !b||a.v[0]>b.v[0]||(a.v[0]===b.v[0]&&a.v[1]>b.v[1])}
function put(id,value){records[id]={v:stamp(),data:clone(value)}}
// Identity is article + description. Market, spelling case and extra whitespace do not create variants.
function identityText(value){return String(value||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('de')}
function itemKey(item){return JSON.stringify([identityText(item.title),identityText(item.note)])}
function deduplicateRecords(){
 const groups=new Map();
 for(const [id,r]of Object.entries(records)){
  clock=Math.max(clock,r.v[0]);if(!id.startsWith('i:')||!r.data)continue;
  const k=itemKey(r.data);if(!groups.has(k))groups.set(k,[]);groups.get(k).push([id,r]);
 }
 let changed=false;
 for(const group of groups.values())if(group.length>1){
  group.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
  const canonical=group[0][0];let latest=group[0][1];
  for(const [,r]of group)if(newer(r,latest))latest=r;
  const merged = {...clone(latest.data), id:canonical.slice(2)};
  if (merged.image === undefined) {
    let withImage;
    for (const [, record] of group) {
      if (record.data.image !== undefined && newer(record, withImage)) withImage = record;
    }
    if (withImage) merged.image = withImage.data.image;
  }
  put(canonical, merged);
  for(const [id]of group)if(id!==canonical){put(id,null);pending.delete(id)}
  changed=true;
 }
 return changed;
}
const storeOrderRecord = 'm:store-order';

function orderedStores() {
  const names = Object.keys(storeRoutes);
  const saved = records[storeOrderRecord]?.data;
  if (!Array.isArray(saved)) return names;
  const current = new Set(names);
  const order = new Set(saved.filter(name => current.has(name)));
  const newNames = names.filter(name => !order.has(name)).sort();
  return [...order, ...newNames];
}

function materialize(){deduplicateRecords();items=[];storeRoutes=Object.create(null);categoryDict=Object.assign(Object.create(null),initialDict);for(const [id,r] of Object.entries(records)){clock=Math.max(clock,r.v[0]);if(r.data===null)continue;if(id.startsWith('i:'))items.push(clone(r.data));if(id.startsWith('s:'))storeRoutes[id.slice(2)]=clone(r.data);if(id.startsWith('d:'))categoryDict[id.slice(2)]=r.data}if(!Object.keys(storeRoutes).length){for(const [s,route]of Object.entries(defaultRoutes)){records['s:'+s]={v:[0,'default'],data:clone(route)};storeRoutes[s]=clone(route)}}if(!storeRoutes[activeStore])activeStore=orderedStores()[0]}
function validText(s,n=200){return typeof s==='string'&&s.length<=n}
function validRecord(id,r){if(!r||!Array.isArray(r.v)||!Number.isSafeInteger(r.v[0])||!validText(r.v[1],100))return false;if(r.data===null)return true;const d=r.data;if(id===storeOrderRecord)return Array.isArray(d)&&d.every(name=>validText(name,80)&&name.trim());if(id.startsWith('i:'))return d&&validText(d.id,100)&&id==='i:'+d.id&&validText(d.title)&&d.title.trim()&&validText(d.category)&&validText(d.note||'')&&validText(d.targetStore||'')&&typeof d.done==='boolean'&&validItemImage(d.image);if(id.startsWith('s:'))return validText(id.slice(2),80)&&Array.isArray(d)&&d.length>0&&d.length<=100&&d.every(c=>validText(c,80));if(id.startsWith('d:'))return validText(id,220)&&validText(d,80);return false}
function merge(remote){if(!remote||typeof remote!=='object'||Object.keys(remote).length>10000)return false;let changed=false;for(const [id,r]of Object.entries(remote)){if(validRecord(id,r)&&newer(r,records[id])){records[id]=clone(r);clock=Math.max(clock,r.v[0]);changed=true}}if(changed){materialize();persist();renderStoreButtons();if($('store-manager-modal').style.display==='flex')renderStoreManagerList();render()}return changed}
function broadcastState(){const desired={};if(Array.isArray(records[storeOrderRecord]?.data))desired[storeOrderRecord]=orderedStores();for(const i of items)desired['i:'+i.id]=i;for(const [s,route]of Object.entries(storeRoutes))desired['s:'+s]=route;for(const [word,cat]of Object.entries(categoryDict))desired['d:'+word]=cat;for(const [id,d]of Object.entries(desired)){if(!records[id]||JSON.stringify(records[id].data)!==JSON.stringify(d))put(id,d)}for(const [id,r]of Object.entries(records))if(r.data!==null&&!(id in desired))put(id,null);syncRevision++;pendingSync=true;if(deduplicateRecords())materialize();const saved=persist();if(saved)sendState();return saved}
const enc=new TextEncoder(),dec=new TextDecoder();
function b64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 16384) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 16384));
  }
  return btoa(binary);
}
const unb64=s=>Uint8Array.from(atob(s),x=>x.charCodeAt(0));
async function derive(){const digest=await crypto.subtle.digest('SHA-256',enc.encode(syncCode));key=await crypto.subtle.importKey('raw',digest,'AES-GCM',false,['encrypt','decrypt']);topic='maik-einkauf-v3/'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode('topic:'+syncCode))),x=>x.toString(16).padStart(2,'0')).join('')}
// Independent retained snapshots avoid overwriting an offline device's changes at reconnect.
const syncConnections=[], peerSeen=new Map();
let sending=false,again=false,syncRevision=0,pendingSync=true,syncTimer=null,legacyMigration=null;
function listLabel(){return syncCode.slice(0,6)+'…'+syncCode.slice(-4)}
function networkStatus(){
 const now=Date.now(),ready=syncConnections.filter(c=>c.connected&&c.syncReady),peers=[...peerSeen.values()].filter(t=>now-t<75000).length;
 $('live-dot').classList.toggle('online',ready.length>0);
 $('live-dot').title=ready.length?'Synchronisationsserver erreichbar':'Nur auf diesem Gerät gespeichert';
 let message=!navigator.onLine?'Offline · Änderungen bleiben auf diesem Gerät gespeichert.':ready.length?(peers?'Zweites Gerät auf dieser Liste bestätigt':'Server verbunden · Noch kein zweites Gerät bestätigt')+(pendingSync?' · Übertragung ausstehend.':' · An Server übertragen.'):'Server nicht erreichbar oder verbindet · Änderungen bleiben lokal gespeichert.';
 $('app-state').textContent='Liste '+listLabel()+' · '+message;
 const diagnostic=$('sync-diagnostic');if(diagnostic)diagnostic.textContent=$('app-state').textContent;
}
async function restoreLegacyPairing(){
 if(legacyMigration)return legacyMigration;
 legacyMigration=(async()=>{
  if(db.legacySyncMigrated)return;
  let legacy;try{legacy=localStorage.getItem('local_sync_code')}catch(e){}
  if(!legacy||!crypto.subtle){db.legacySyncMigrated=true;persist();return}
  const digest=await crypto.subtle.digest('SHA-256',enc.encode('einkauf-v3-legacy:'+legacy));
  if(db.legacySyncMigrated)return;
  const restored=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
  persist();const previous=records,next=clone(db.rooms[restored]||{});
  for(const [id,r]of Object.entries(previous))if(newer(r,next[id]))next[id]=clone(r);
  syncCode=restored;records=next;db.legacySyncMigrated=true;materialize();persist();renderStoreButtons();render();
  status('Frühere Geräteverknüpfung wiederhergestellt. Bitte beide Handys aktualisieren.');
 })();return legacyMigration;
}
async function encryptedPacket(data){const iv=crypto.getRandomValues(new Uint8Array(12));const bytes=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(JSON.stringify(data)));return JSON.stringify({iv:b64(iv),body:b64(bytes)})}
async function sendState(){
 const targets=syncConnections.filter(c=>c.connected&&c.syncReady);if(!targets.length||!key)return;
 if(sending){again=true;return}sending=true;const g=generation,revision=syncRevision;
 try{const payload=await encryptedPacket({kind:'state',sender:client,device:deviceId,sentAt:Date.now(),records});
  if(g!==generation)return;
  for(const c of targets)if(c.connected)c.publish(topic+'/state/'+deviceId,payload,{qos:1,retain:true},err=>{if(g!==generation)return;if(!err&&revision===syncRevision)pendingSync=false;networkStatus()});
 }catch(e){pendingSync=true;status('Abgleich fehlgeschlagen. Änderungen bleiben lokal gespeichert.')}
 finally{sending=false;if(again){again=false;sendState()}}
}
async function requestState(){if(!key)return;const g=generation;try{const payload=await encryptedPacket({kind:'hello',sender:client,device:deviceId,sentAt:Date.now()});if(g!==generation)return;for(const c of syncConnections)if(c.connected&&c.syncReady)c.publish(topic+'/hello',payload,{qos:1,retain:false})}catch(e){}}
async function connect(){
 const g=++generation;syncReady=false;clearInterval(syncTimer);for(const c of syncConnections.splice(0))c.end(true);mqttClient=null;peerSeen.clear();
 await restoreLegacyPairing();if(g!==generation)return;networkStatus();
 if(!navigator.onLine||typeof mqtt==='undefined')return;
 if(!crypto.subtle){$('app-state').textContent='Lokal gespeichert · Geräteabgleich und Offline-Start benötigen HTTPS.';return}
 await derive();if(g!==generation)return;const roomKey=key,roomTopic=topic;
 // Keep both transports open, so devices on different networks can share an available broker.
 const brokers=['wss://broker.hivemq.com:8884/mqtt','wss://broker.emqx.io:8084/mqtt'];
 for(const [index,url]of brokers.entries()){
  const c=mqtt.connect(url,{clientId:'ek_'+client.replace(/-/g,'').slice(0,16)+index,clean:true,forceNativeWebSocket:true,connectTimeout:10000,reconnectPeriod:4000,keepalive:25,resubscribe:false});
  c.syncReady=false;syncConnections.push(c);if(!mqttClient)mqttClient=c;
  c.on('connect',()=>{if(g!==generation)return;c.syncReady=false;
   c.subscribe([roomTopic,roomTopic+'/state/+',roomTopic+'/hello'],{qos:1},(err,granted)=>{
    if(g!==generation)return;if(err||granted?.some(x=>x.qos===128)){c.syncReady=false;networkStatus();return}
    c.syncReady=true;syncReady=true;networkStatus();requestState();sendState();
   });
  });
  c.on('message',async(t,msg,packet)=>{
   if(g!==generation||msg.length>2000000)return;
   try{const p=JSON.parse(msg.toString());const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(p.iv)},roomKey,unb64(p.body));if(g!==generation)return;
    const data=JSON.parse(dec.decode(plain));if(data.sender===client)return;
    if(!packet?.retain&&typeof data.device==='string'&&data.device!==deviceId)peerSeen.set(data.device,Date.now());
    if(data.kind==='hello'){sendState();networkStatus();return}
    const changed=merge(data.records);if(changed)sendState();networkStatus();
   }catch(e){status('Eine ungültige Sync-Nachricht wurde ignoriert.')}
  });
  for(const ev of ['offline','close','error'])c.on(ev,()=>{if(g!==generation)return;c.syncReady=false;networkStatus()});
 }
 syncTimer=setInterval(()=>{requestState();sendState();networkStatus()},25000);
}
function resumeApp(){if(document.hidden)return;if(reg)reg.update().catch(()=>{});if(!syncConnections.some(c=>c.connected&&c.syncReady))connect();else{requestState();sendState()}}
function init(){try{const saved=JSON.parse(localStorage.getItem(STORAGE));if(saved?.schema===3&&saved.rooms)db=saved}catch(e){status('Gespeicherte Daten konnten nicht geladen werden. Bitte Sicherung importieren.')}
syncCode=db.room||uuid()+uuid();activeStore=db.activeStore||'Aldi';records=db.rooms[syncCode]||{};
if(!db.room){try{const legacy=JSON.parse(localStorage.getItem('local_einkaufsliste')||'[]');for(const i of legacy)if(i&&typeof i.title==='string')put('i:'+i.id,{...i,note:i.note||'',done:!!i.done});const routes=JSON.parse(localStorage.getItem('local_store_routes')||'null');if(routes)for(const [s,r]of Object.entries(routes))if(Array.isArray(r))put('s:'+s,r);const dict=JSON.parse(localStorage.getItem('local_category_dict')||'null');if(dict&&typeof dict==='object')for(const [word,cat]of Object.entries(dict))if(validText(word,200)&&validText(cat,80))put('d:'+word,cat);const previousStore=localStorage.getItem('local_einkaufsliste_store');if(previousStore)activeStore=previousStore}catch(e){}}
materialize();persist();renderStoreButtons();render();connect();setupPWA();const invite=new URLSearchParams(location.hash.slice(1)).get('join');if(invite){history.replaceState(null,'',location.pathname);setTimeout(()=>joinRoom(invite),200)}
window.addEventListener('online',connect);window.addEventListener('pageshow',resumeApp);document.addEventListener('visibilitychange',resumeApp);window.addEventListener('offline',networkStatus);window.addEventListener('storage',e=>{if(e.key===STORAGE&&e.newValue){try{merge(JSON.parse(e.newValue).rooms[syncCode])}catch(e){}}});}
function switchStore(s){if(storeRoutes[s]){activeStore=s;persist();renderStoreButtons();render();status('Laufweg: '+s)}}
function renderStoreButtons(){const box=$('store-buttons-container');box.replaceChildren();for(const s of orderedStores()){const b=button(s,()=>switchStore(s),'btn-store'+(s===activeStore?' active':''));b.setAttribute('aria-pressed',s===activeStore);box.append(b)}}
function button(text,fn,cls='btn-action-icon',title=text){const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=text;b.onclick=fn;b.title=title;b.setAttribute('aria-label',title);return b}
function text(tag,value,cls){const el=document.createElement(tag);el.textContent=value;el.className=cls||'';return el}
const pending=new Map();

function articleCategory(item) {
  return typeof item.category === 'string' && item.category.trim() ? item.category : 'Sonstiges';
}

const fruitPictures = new Set([
  '🥭', 'papaya', '🍎', '🍏', '🍐', '🍌', '🍍', '🍊', '🍋', '🍋‍🟩', '🥝', '🥥',
  '🍇', '🍉', '🍈', '🍑', 'plum', '🍒', '🍓', '🫐', 'fig', '🌴', 'dragonfruit', 'passionfruit', 'tropical'
]);
const vegetablePictures = new Set([
  '🥑', '🍅', '🥒', '🍆', '🫑', '🌶️', '🥕', '🥔', '🍠', '🫜', '🥬',
  '🥦', '🌽', '🧅', '🧄', '🍄‍🟫', '🫛', '🌿', '🫚', '🎃'
]);
const breadPictures = new Set(['🍞', '🥖', '🥐', '🥨', '🥯', '🫓']);

function catalogCategory(title) {
  const picture = productPictureFor(title);
  if (fruitPictures.has(picture)) return 'Obst';
  if (vegetablePictures.has(picture)) return 'Gemüse';
  if (breadPictures.has(picture)) return 'Brot';
  return null;
}

function categoryForTitle(title) {
  return categoryDict[norm(title)] || catalogCategory(title) || 'Sonstiges';
}

function routeCategoryKey(label) {
  const key = productPictureWords(label).filter(word => word !== 'und').join(' ');
  if (['gemuese obst', 'obst gemuese', 'frisches obst frisches gemuese', 'frisches obst gemuese', 'obst frisches gemuese', 'gemuese frisches obst'].includes(key)) return 'obst gemuese';
  if (['brot backwaren', 'backwaren brot', 'backwaren', 'baeckerei', 'brot broetchen', 'broetchen brot'].includes(key)) return 'brot';
  if (key === 'frisches obst') return 'obst';
  if (key === 'frisches gemuese') return 'gemuese';
  return key;
}

function savedRoute(store) {
  return (storeRoutes[store] || []).filter(category => typeof category === 'string' && category.trim());
}

function categoryOnRoute(item, route) {
  let category = articleCategory(item);
  if (category === 'Sonstiges' && !item.categoryManual) {
    const learned = categoryDict[norm(item.title)];
    category = learned || catalogCategory(item.title) || category;
  }

  const key = routeCategoryKey(category);
  const find = key => route.find(label => routeCategoryKey(label) === key);
  if (['obst', 'gemuese', 'obst gemuese'].includes(key)) {
    const combined = find('obst gemuese');
    if (combined) return combined;
    const fruit = find('obst');
    const vegetables = find('gemuese');
    if (fruit && (key === 'obst' || (!item.categoryManual && catalogCategory(item.title) === 'Obst'))) return fruit;
    // The original "Gemüse" route also covered fruit.
    if (vegetables) return vegetables;
  }
  if (route.includes(category)) return category;
  return find(key) || route.find(label => label.split(/\s+und\s+|[&/+]/i)
    .some(part => routeCategoryKey(part) === key)) || category;
}

function routeCategories(store, categories) {
  const saved = savedRoute(store);
  const extra = [...new Set(categories || items.map(item => categoryOnRoute(item, saved)))]
    .filter(category => !saved.includes(category));
  extra.sort((a, b) => a.localeCompare(b, 'de') || (a < b ? -1 : a > b ? 1 : 0));
  return [...new Set([...saved, ...extra])];
}

function render() {
  const active = items.filter(item => !item.done || pending.has(item.id));
  const done = items.filter(item => item.done && !pending.has(item.id));
  $('count').textContent = active.length + ' Artikel';
  $('done-counter').textContent = 'Erledigte Artikel (' + done.length + ')';
  const box = $('list-container');
  box.replaceChildren();

  const saved = savedRoute(activeStore);
  const groups = new Map();
  for (const item of active) {
    const category = categoryOnRoute(item, saved);
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(item);
  }
  if (!active.length) box.append(text('div', 'Alles bereit für deinen Einkauf.\\nTippe oder sprich deine ersten Artikel.', 'empty'));
  for (const category of routeCategories(activeStore, groups.keys())) {
    const list = groups.get(category);
    if (!list) continue;
    const block = text('section', '', 'cat-block');
    block.append(text('div', category + ' · ' + list.length, 'cat-header'));
    for (const item of list) block.append(itemRow(item));
    box.append(block);
  }
  $('done-list').replaceChildren();
  for (const item of done.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))) $('done-list').append(itemRow(item, true));
  renderSuggestions();
  refreshRouteEditor();
}

const itemImageLimit = 8000;
const listImageLimit = 550000;
const categoryPictures = new Map([
  ['Gemüse', '🥬'], ['Brot', '🍞'], ['Kühlregal', '🥛'], ['Fleisch und Wurst', '🥩'],
  ['Süßigkeiten', '🍬'], ['Nudeln und Getreide', '🍚'], ['Getränke', '🥤'], ['Drogerie', '🧴']
]);

function validItemImage(image) {
  return image == null || (typeof image === 'string' && image.length <= itemImageLimit &&
    /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(image));
}

function articlePicture(item) {
  const frame = text('span', '', 'article-picture');
  frame.setAttribute('aria-hidden', 'true');
  const fullName = [item.title, item.note].filter(Boolean).join(' ');
  const fallback = productPictureFor(fullName) || categoryPictures.get(item.category) || '🛒';
  const showDefault = () => {
    const drawing = productPictureDrawings[fallback];
    if (!drawing) {
      frame.textContent = fallback;
      return;
    }
    const icon = document.createElement('img');
    icon.alt = '';
    icon.src = 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">' + drawing + '</svg>'
    );
    frame.replaceChildren(icon);
  };
  if (item.image && validItemImage(item.image)) {
    const image = document.createElement('img');
    image.alt = '';
    image.src = item.image;
    image.onerror = showDefault;
    frame.append(image);
  } else {
    showDefault();
  }
  return frame;
}

async function makeItemThumbnail(file) {
  if (!file.size || file.size > 20 * 1024 * 1024 ||
      (file.type && !/^image\/(jpeg|png|webp|gif|heic|heif|avif)$/i.test(file.type))) {
    throw new Error('Wähle ein unterstütztes Bild mit höchstens 20 MB.');
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    if (!context || !side) throw new Error('Das Bild konnte nicht geöffnet werden.');
    for (const size of [112, 88, 64]) {
      canvas.width = canvas.height = size;
      context.fillStyle = '#fff';
      context.fillRect(0, 0, size, size);
      context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2,
        side, side, 0, 0, size, size);
      for (const quality of [0.8, 0.6, 0.4]) {
        const thumbnail = canvas.toDataURL('image/jpeg', quality);
        if (validItemImage(thumbnail)) return thumbnail;
      }
    }
    throw new Error('Das Bild konnte nicht ausreichend verkleinert werden.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

function itemRow(item, done = false) {
  const row = text('div', '', done ? 'done-item' : 'item-row');
  row.id = 'row_' + item.id;
  const check = document.createElement('input');
  check.type = 'checkbox';
  check.checked = done || pending.has(item.id);
  check.setAttribute('aria-label', item.title + (done ? ' wieder auf die Liste' : ' erledigen'));
  check.onchange = () => done ? toggleItemDirect(item.id) : handleCheckWithAnimation(item.id);

  const info = text('div', '', 'item-info');
  info.append(text('span', item.title, done ? 'title' : 'item-name'));
  if (item.note) info.append(text('span', item.note, 'item-extra-note'));
  if (item.recipeQuantity && !recipeAmountPattern.test(item.note || '')) {
    info.append(text('span', item.recipeQuantity, 'item-extra-note'));
  }
  if (item.targetStore) info.append(text('span', 'Bei ' + item.targetStore, 'badge-store'));

  const actions = text('div', '', 'item-actions');
  actions.append(
    button('×', () => safeDeleteItem(item.id), 'btn-action-icon danger', 'Artikel löschen'),
    button('✎', () => openEditor(item), 'btn-action-icon', 'Artikel bearbeiten')
  );
  row.append(check, articlePicture(item), info, actions);
  if (pending.has(item.id)) decorate(row);
  return row;
}
function decorate(row){row.classList.add('checking-out');const badge=text('div','','waving-badge');badge.append(text('span','Tschüss!','waving-text'),text('span','😊 👋','waving-hand-icon'));row.append(badge)}
function handleCheckWithAnimation(id){if(pending.has(id))return;const i=items.find(i=>i.id===id);if(!i)return;i.done=true;i.completedAt=Date.now();broadcastState();pending.set(id,true);decorate($('row_'+id));setTimeout(()=>{pending.delete(id);const r=records['i:'+id];if(r?.data)Object.assign(i,r.data);materialize();render()},matchMedia('(prefers-reduced-motion: reduce)').matches?0:2500)}
function toggleItemDirect(id){const i=items.find(i=>i.id===id);if(i){i.done=!i.done;i.completedAt=i.done?Date.now():null;broadcastState();render()}}
function safeDeleteItem(id){const i=items.find(i=>i.id===id);if(i&&confirm('„'+i.title+'“ wirklich löschen?')){items=items.filter(i=>i.id!==id);pending.delete(id);broadcastState();render()}}
function resetAllData(){if(confirm('Alle Artikel dieser verknüpften Liste löschen? Dies wird auch auf andere Geräte übertragen.')){items=[];pending.clear();broadcastState();render()}}
function toggleDoneSection(){const e=$('done-list');e.style.display=e.style.display==='none'?'block':'none';$('done-arrow').textContent=e.style.display==='none'?'▼':'▲'}
function parseText(raw, executeCommands = true){let t=raw.trim().replace(/[.!?]+$/,'');if(!t)return [];for(const s of Object.keys(storeRoutes)){if([norm(s),'zu '+norm(s),'bei '+norm(s),'wechsel zu '+norm(s)].includes(norm(t))){if(executeCommands)switchStore(s);return []}}
if(/^(stopp?|aufnahme beenden)$/i.test(t)){if(executeCommands)stopVoice();return []}
t=t.replace(/\b(ich brauche noch|wir brauchen noch|ich brauche|wir brauchen|ich möchte|wir möchten|kauf bitte|kaufe bitte|bring bitte mit|bring mit|besorge bitte)\b/gi,' ').replace(/\b(packe|pack|schreib|schreibe|setze|setz|tu)\s+(bitte\s+)?/gi,' ').replace(/\b(in die einkaufsliste|auf die einkaufsliste|auf die liste|in die liste|zur liste|dazu|bitte)\b/gi,' ').trim();
const segments=t.split(/\s+(?:und|sowie|außerdem|dann noch)\s+|;\s*|,\s*(?!\d)/i), out=[];
for(let seg of segments){let targetStore=null;for(const s of Object.keys(storeRoutes)){const escaped=s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const re=new RegExp('(?:^|\\s)(?:(?:nur bei|bei|im|für)\\s+)?'+escaped+'(?=\\s|$)','i');if(re.test(seg)){targetStore=s;seg=seg.replace(re,' ').trim();break}}
seg=seg.replace(/^(?:noch|etwas|den|die|das|ein|eine|einen)\s+/i,'').trim();if(!seg)continue;
let note='', name=seg;const price=seg.match(/(?:\s+(?:zu|für))?\s+(\d+(?:[.,]\d{1,2})?)(?:\s*(€|euro|cent|ct))?\s*$/i);if(price){note=price[1].replace('.',',')+(price[2]?' '+price[2]:'');name=seg.slice(0,price.index).trim()}
const quantity=name.match(/^(\d+(?:[.,]\d+)?\s*(?:kg|g|liter|l|stück|packungen?|flaschen?|dosen?)?)\s+(.+)$/i);if(quantity){name=quantity[2];note=[quantity[1],note].filter(Boolean).join(' · ')}
const known=Object.keys(categoryDict).sort((a,b)=>b.length-a.length).find(k=>norm(name)===k||norm(name).startsWith(k+' '));if(known&&norm(name)!==known){note=[name.slice(known.length).trim(),note].filter(Boolean).join(' · ');name=name.slice(0,known.length)}
// Unbekannte mehrteilige Artikelnamen bleiben vollständig erhalten.
name=name.trim();if(!name||name.length>200||/^(noch|bitte|und|für|zu)$/i.test(name))continue;out.push({title:name.charAt(0).toUpperCase()+name.slice(1),note:note.slice(0,200),category:categoryForTitle(name),targetStore})}return out}
function showEntryFeedback(message) {
  $('entry-feedback').textContent = message;
}

function parseAndAdd(raw) {
  const previousStore = activeStore;
  const parsed = parseText(raw);
  if (!parsed.length) {
    if (/^(stopp?|aufnahme beenden)[.!?]*$/i.test(raw.trim())) return;
    const storeCommand = activeStore !== previousStore || [norm(activeStore), 'zu ' + norm(activeStore), 'bei ' + norm(activeStore), 'wechsel zu ' + norm(activeStore)].includes(norm(raw.replace(/[.!?]+$/, '')));
    showEntryFeedback(storeCommand ? 'Laufweg: ' + activeStore : 'Kein Artikel erkannt.');
    return;
  }

  const outcomes = new Map();
  for (const item of parsed) {
    const key = itemKey(item);
    const existing = items.find(entry => itemKey(entry) === key);
    const label = [item.title, item.note].filter(Boolean).join(' · ');
    if (!outcomes.has(key)) {
      const message = !existing ? 'Hinzugefügt' : existing.done ? 'Wieder auf der Liste' : 'Bereits auf der Liste';
      outcomes.set(key, message + ': ' + label);
    }
    if (existing) {
      pending.delete(existing.id);
      existing.done = false;
      existing.completedAt = null;
      if (item.targetStore) existing.targetStore = item.targetStore;
    } else {
      items.push({...item, id: uuid(), done: false, completedAt: null});
    }
  }
  const saved = broadcastState();
  render();
  showEntryFeedback([...outcomes.values()].join(' | ') + (saved ? '' : ' · Speichern fehlgeschlagen.'));
}

const recipeAmountPattern = /^(?:\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?|[¼½¾])\s*(?:kg|g|mg|ml|cl|dl|l|liter|stk\.?|stück|el|tl|packungen?|dosen?|flaschen?|bund|becher)?$/iu;
let recipeIngredients = [];

function readRecipeIngredients(payload) {
  if (typeof payload !== 'string' || payload.length > 16000) throw new Error('Ungültiger Rezeptlink');
  const rows = JSON.parse(payload);
  if (!Array.isArray(rows) || !rows.length || rows.length > 60) throw new Error('Ungültige Zutatenliste');
  const unique = new Map();
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 1 || row.length > 3 ||
        !row.every(value => typeof value === 'string')) throw new Error('Ungültige Zutat');
    const [title, recipeQuantity = '', note = ''] = row.map(value => value.trim());
    if (!title || title.length > 200 || recipeQuantity.length > 60 || note.length > 200) {
      throw new Error('Ungültige Zutat');
    }
    const ingredient = {title, note, recipeQuantity};
    if (!unique.has(itemKey(ingredient))) unique.set(itemKey(ingredient), ingredient);
  }
  return [...unique.values()];
}

function recipeItemKey(item) {
  const note = (item.note || '').split(' · ')
    .filter(part => !recipeAmountPattern.test(part.trim())).join(' · ');
  return itemKey({title: item.title, note});
}

function planRecipeImport(ingredients) {
  return ingredients.map(ingredient => {
    const key = itemKey(ingredient);
    const matching = items.filter(item => recipeItemKey(item) === key);
    return {ingredient, open: matching.some(item => !item.done), done: matching.find(item => item.done)};
  });
}

function openRecipeImport(payload) {
  recipeIngredients = [];
  $('recipe-link').value = '';
  $('recipe-message').textContent = '';
  if (typeof payload === 'string') {
    try {
      recipeIngredients = readRecipeIngredients(payload);
    } catch {
      $('recipe-message').textContent = 'Dieser Rezeptlink enthält keine gültigen Zutaten.';
    }
  }
  renderRecipePreview();
  $('recipe-modal').style.display = 'flex';
  $(recipeIngredients.length ? 'recipe-heading' : 'recipe-link').focus();
}

function loadRecipeLink() {
  try {
    const url = new URL($('recipe-link').value.trim());
    if (url.origin !== location.origin || url.pathname !== location.pathname) throw new Error();
    const payload = new URLSearchParams(url.hash.slice(1)).get('zutaten');
    if (!payload) throw new Error();
    openRecipeImport(payload);
  } catch {
    $('recipe-message').textContent = 'Füge einen vollständigen Rezeptlink zu dieser Einkaufs-App ein.';
  }
}

function renderRecipePreview() {
  const list = $('recipe-preview');
  list.replaceChildren();
  const plan = planRecipeImport(recipeIngredients);
  for (const {ingredient, open} of plan) {
    const label = [ingredient.recipeQuantity, ingredient.title, ingredient.note].filter(Boolean).join(' · ');
    list.append(text('li', label + (open ? ' – bereits auf der Liste' : ' – fehlt')));
  }
  const missing = plan.filter(row => !row.open).length;
  $('recipe-apply').disabled = missing === 0;
  $('recipe-apply').textContent = missing ? 'Fehlende Zutaten hinzufügen (' + missing + ')' : 'Keine Zutaten hinzufügen';
}

function applyRecipeIngredients(ingredients) {
  const plan = planRecipeImport(ingredients);
  let added = 0;
  for (const {ingredient, open, done} of plan) {
    if (open) continue;
    if (done) {
      pending.delete(done.id);
      done.done = false;
      done.completedAt = null;
      done.recipeQuantity = ingredient.recipeQuantity;
    } else {
      items.push({...ingredient, id: uuid(), done: false, completedAt: null,
        category: categoryForTitle(ingredient.title), targetStore: null});
    }
    added++;
  }
  if (added) {
    broadcastState();
    render();
  }
  return added;
}

async function confirmRecipeImport() {
  const ingredients = recipeIngredients;
  $('recipe-apply').disabled = true;
  await restoreLegacyPairing();
  if (ingredients !== recipeIngredients || $('recipe-modal').style.display !== 'flex') return;
  const added = applyRecipeIngredients(ingredients);
  closeRecipeImport();
  status(added ? added + ' fehlende Zutaten zur Liste hinzugefügt.' : 'Alle Zutaten stehen bereits auf der Liste.');
}

function closeRecipeImport() {
  recipeIngredients = [];
  $('recipe-modal').style.display = 'none';
}

function readIncomingRecipe() {
  const payload = new URLSearchParams(location.hash.slice(1)).get('zutaten');
  if (payload === null) return;
  history.replaceState(null, '', location.pathname + location.search);
  openRecipeImport(payload);
}

function completedSuggestions(query){
 const q=identityText(query);if(!q)return [];
 return items.filter(i=>i.done&&(identityText(i.title).includes(q)||identityText(i.title+' '+(i.note||'')).includes(q)))
 .sort((a,b)=>Number(identityText(b.title).startsWith(q))-Number(identityText(a.title).startsWith(q))||(b.completedAt||0)-(a.completedAt||0)||a.title.localeCompare(b.title,'de')).slice(0,6);
}
function describeInputItem(candidate) {
  const label = [candidate.title, candidate.note].filter(Boolean).join(' · ');
  const key = itemKey(candidate);
  const exact = items.find(item => itemKey(item) === key);
  if (exact) {
    return label + (exact.done ? ' – schon abgehakt' : ' – bereits auf der Liste');
  }
  const title = identityText(candidate.title);
  const related = items.find(item => !item.done && identityText(item.title).startsWith(title));
  if (related) {
    const relatedLabel = [related.title, related.note].filter(Boolean).join(' · ');
    return label + (identityText(related.title) === title
      ? ' – andere Variante auf der Liste (' + relatedLabel + ')'
      : ' – passt zu „' + relatedLabel + '“ auf der Liste');
  }
  return label + ' – noch nicht auf der Liste';
}

function renderInputListStatus() {
  const inputStatus = $('input-list-status');
  const candidates = parseText($('manual-input').value, false);
  const messages = [...new Set(candidates.map(describeInputItem))];
  const next = messages.slice(0, 3).join(' | ');
  if (inputStatus.textContent !== next) inputStatus.textContent = next;
}

function renderSuggestions(){
 renderInputListStatus();
 const box=$('suggestions');if(!box)return;box.replaceChildren();
 const suggestions=completedSuggestions($('manual-input').value);box.hidden=!suggestions.length;
 $('manual-input').setAttribute('aria-expanded',String(suggestions.length>0));
 if(!suggestions.length)return;
 box.append(text('div','Schon gekauft – zum Übernehmen auswählen','suggestions-title'));
 for(const i of suggestions){
  const label=i.title+(i.note?' · '+i.note:'');
  const b=button(label,()=>restoreCompleted(i.id),'suggestion','Wieder hinzufügen: '+label);
  b.onkeydown=e=>{const buttons=[...box.querySelectorAll('button')],at=buttons.indexOf(b);
   if(e.key==='ArrowDown'){e.preventDefault();buttons[(at+1)%buttons.length].focus()}
   if(e.key==='ArrowUp'){e.preventDefault();if(at===0)$('manual-input').focus();else buttons[at-1].focus()}
   if(e.key==='Escape'){e.preventDefault();box.hidden=true;$('manual-input').setAttribute('aria-expanded','false');$('manual-input').focus()}
  };box.append(b);
 }
}
function restoreCompleted(id){const i=items.find(i=>i.id===id);if(!i)return;pending.delete(id);i.done=false;i.completedAt=null;broadcastState();$('manual-input').value='';$('manual-input').blur();render();showEntryFeedback('Wieder auf der Liste: '+i.title)}
function handleInputKey(e){
 if(e.isComposing||e.keyCode===229)return;
 if(e.key==='Enter'){e.preventDefault();addFromInput()}
 if(e.key==='ArrowDown'){const first=$('suggestions').querySelector('button');if(first&&!$('suggestions').hidden){e.preventDefault();first.focus()}}
 if(e.key==='Escape'){$('suggestions').hidden=true;$('manual-input').setAttribute('aria-expanded','false')}
}
function addFromInput() {
  const input = $('manual-input');
  const value = input.value.trim();
  if (!value) return;
  if (!keepRecording) $('voice-transcript').textContent = '';
  parseAndAdd(value);
  input.value = '';
  input.blur();
  renderSuggestions();
}

function openEditor(item) {
  editingItemId = editingNoteItemId = editingStoreItemId = item.id;
  const overlay = $('note-modal');
  const modal = overlay.querySelector('.modal');
  const heading = text('h2', 'Artikel bearbeiten');
  heading.tabIndex = -1;
  modal.replaceChildren(heading);
  const form = document.createElement('form');
  const fields = {};
  for (const [label, field, value] of [['Artikel', 'title', item.title], ['Bemerkung / Preis', 'note', item.note || '']]) {
    const wrapper = text('label', label);
    const input = document.createElement('input');
    input.value = value;
    input.maxLength = 200;
    input.required = field === 'title';
    input.style = 'width:100%;padding:12px;margin:6px 0 16px';
    wrapper.append(input);
    form.append(wrapper);
    fields[field] = input;
  }
  const displayedCategory = categoryOnRoute(item, savedRoute(activeStore));
  for (const [label, field, values, value] of [
    ['Kategorie', 'category', [...new Set(Object.values(storeRoutes).flat())], displayedCategory],
    ['Supermarkt', 'targetStore', ['', ...orderedStores()], item.targetStore || '']
  ]) {
    const wrapper = text('label', label);
    const select = document.createElement('select');
    select.style = 'width:100%;padding:12px;margin:6px 0 16px';
    for (const choice of new Set([...values, value])) {
      const option = text('option', choice || 'In jedem Markt');
      option.value = choice;
      select.append(option);
    }
    select.value = value;
    wrapper.append(select);
    form.append(wrapper);
    fields[field] = select;
  }

  let draftImage = item.image || null;
  let imageChanged = false;
  let selection = 0;
  const pictureEditor = text('fieldset', '', 'picture-editor');
  pictureEditor.append(text('legend', 'Artikelbild'));
  const preview = text('div', '', 'picture-preview');
  const fileLabel = text('label', 'Eigenes Foto auswählen');
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = 'image/*';
  fileLabel.append(file);
  const message = text('p', '', 'picture-message');
  message.setAttribute('role', 'status');
  const save = button('Speichern', () => {}, 'btn-modal');
  save.type = 'submit';

  const remove = button('Standardbild verwenden', () => {
    selection++;
    file.value = '';
    draftImage = null;
    imageChanged = true;
    message.textContent = '';
    save.disabled = false;
    updatePreview();
  }, 'btn-action-icon');

  function updatePreview() {
    preview.replaceChildren(articlePicture({...item, image: draftImage}));
    remove.disabled = !draftImage;
  }

  file.onchange = async () => {
    const selected = file.files[0];
    const revision = ++selection;
    if (!selected) {
      save.disabled = false;
      message.textContent = '';
      return;
    }
    save.disabled = true;
    message.textContent = 'Foto wird verkleinert …';
    try {
      const thumbnail = await makeItemThumbnail(selected);
      if (revision !== selection) return;
      draftImage = thumbnail;
      imageChanged = true;
      updatePreview();
      message.textContent = 'Foto ist bereit. Tippe auf Speichern.';
    } catch (error) {
      if (revision !== selection) return;
      file.value = '';
      message.textContent = error instanceof Error && error.message.startsWith('Wähle')
        ? error.message : 'Foto konnte nicht geöffnet werden. Versuche es mit JPG oder PNG.';
    } finally {
      if (revision === selection) save.disabled = false;
    }
  };

  updatePreview();
  pictureEditor.append(preview, fileLabel, remove, message);
  form.append(pictureEditor, save, button('Abbrechen', closeNoteModal, 'btn-modal'));
  form.onsubmit = event => {
    event.preventDefault();
    if (save.disabled) return;
    const current = items.find(entry => entry.id === item.id);
    if (!current) {
      closeNoteModal();
      return;
    }
    if (imageChanged && draftImage) {
      const imageSize = items.reduce((size, entry) =>
        size + (entry.id === item.id ? 0 : (entry.image || '').length), draftImage.length);
      if (imageSize > listImageLimit) {
        message.textContent = 'Die Liste hat ihr Fotolimit erreicht. Entferne zuerst ein eigenes Foto.';
        return;
      }
    }
    for (const [field, input] of Object.entries(fields)) {
      if (field !== 'category') current[field] = input.value.trim();
    }
    if (fields.category.value !== displayedCategory) {
      current.category = fields.category.value;
      current.categoryManual = true;
      categoryDict[norm(current.title)] = current.category;
    }
    if (imageChanged) current.image = draftImage;
    broadcastState();
    render();
    closeNoteModal();
  };
  modal.append(form);
  overlay.style.display = 'flex';
  heading.focus();
}
function closeNoteModal(){$('note-modal').style.display='none'}
function toggleInfo(){const panel=$('info-panel');panel.hidden=!panel.hidden;$('info-toggle').setAttribute('aria-expanded',String(!panel.hidden));if(panel.hidden)$('info-toggle').focus()}
function toggleDropdownMenu(e){e.stopPropagation();$('dropdown-menu').classList.toggle('show')}
function closeDropdownIfClickedOutside(e){if(!e.target.closest('.menu-container'))$('dropdown-menu').classList.remove('show')}
function handleMenuClick(fn){$('dropdown-menu').classList.remove('show');fn()}
let routeEditor;
function draftRoute() {
  return [...$('drag-container').querySelectorAll('.cat-label-text')].map(e => e.textContent);
}

function refreshRouteEditor() {
  if ($('route-modal').style.display !== 'flex' || !routeEditor) return;
  if (activeStore !== routeEditor.store) {
    $('route-modal').style.display = 'none';
    return;
  }
  const pristine = JSON.stringify(draftRoute()) === routeEditor.displayed;
  if (pristine && (JSON.stringify(storeRoutes[activeStore]) !== routeEditor.saved ||
      JSON.stringify(routeCategories(activeStore)) !== routeEditor.displayed)) renderRouteList();
}

function openRouteModal(){$('manual-input').blur();renderRouteList();$('route-modal').style.display='flex'}
let routeDrag;

function finishRouteDrag(cancel = false) {
  if (!routeDrag) return;
  const {box, row, next, pointer, frame} = routeDrag;
  routeDrag = null;
  cancelAnimationFrame(frame);
  row.classList.remove('dragging');
  if (cancel && row.parentNode === box && (!next || next.parentNode === box)) box.insertBefore(row, next);
  if (box.hasPointerCapture(pointer)) box.releasePointerCapture(pointer);
}

function positionRouteRow({box, row, y}) {
  const before = [...box.children].find(candidate => {
    if (candidate === row) return false;
    const rect = candidate.getBoundingClientRect();
    return y < rect.top + rect.height / 2;
  }) || null;
  if (before !== row.nextElementSibling) box.insertBefore(row, before);
}

function scrollRouteWhileDragging() {
  const drag = routeDrag;
  if (!drag) return;
  if ($('route-modal').style.display !== 'flex') {
    finishRouteDrag(true);
    return;
  }
  const {scroll, y} = drag;
  const {top, bottom} = scroll.getBoundingClientRect();
  const margin = 42;
  const distance = y < top + margin ? y - top - margin : Math.max(0, y - bottom + margin);
  if (distance) {
    const previous = scroll.scrollTop;
    scroll.scrollTop += Math.max(-16, Math.min(16, distance / 3));
    if (scroll.scrollTop !== previous) positionRouteRow(drag);
  }
  drag.frame = requestAnimationFrame(scrollRouteWhileDragging);
}

function renderRouteList() {
  finishRouteDrag(true);
  const order = routeCategories(activeStore);
  routeEditor = {store: activeStore, saved: JSON.stringify(storeRoutes[activeStore]), displayed: JSON.stringify(order)};
  $('route-store-title').textContent = activeStore;
  const box = $('drag-container');
  box.replaceChildren();
  box.onpointermove = e => {
    const drag = routeDrag;
    if (drag?.pointer !== e.pointerId) return;
    if (!drag.active) {
      if (Math.abs(e.clientY - drag.startY) < 5) return;
      drag.active = true;
      drag.row.classList.add('dragging');
      drag.frame = requestAnimationFrame(scrollRouteWhileDragging);
    }
    drag.y = e.clientY;
    positionRouteRow(drag);
  };
  box.onpointerup = e => { if (routeDrag?.pointer === e.pointerId) finishRouteDrag(); };
  box.onpointercancel = box.onlostpointercapture = e => {
    if (routeDrag?.pointer === e.pointerId) finishRouteDrag(true);
  };
  for (const cat of order) {
    const row = text('li', '', 'drag-item');
    const grip = text('span', '☰', 'route-grip');
    grip.setAttribute('aria-hidden', 'true');
    grip.oncontextmenu = e => e.preventDefault();
    grip.onpointerdown = e => {
      if (e.button !== 0 || routeDrag) return;
      e.preventDefault();
      box.setPointerCapture(e.pointerId);
      routeDrag = {
        box, row, next: row.nextElementSibling, pointer: e.pointerId,
        startY: e.clientY, y: e.clientY, scroll: box.closest('.modal'),
        active: false, frame: 0
      };
    };
    const actions = text('div', '', 'route-actions');
    function move(direction, control) {
      const sibling = direction < 0 ? row.previousElementSibling : row.nextElementSibling;
      if (sibling) {
        box.insertBefore(row, direction < 0 ? sibling : sibling.nextElementSibling);
        control.focus();
      }
    }
    const up = button('↑', () => move(-1, up), 'btn-action-icon', cat + ' nach oben');
    const down = button('↓', () => move(1, down), 'btn-action-icon', cat + ' nach unten');
    actions.append(up, down);
    if (cat !== 'Sonstiges') actions.append(
      button('✎', () => renameCategory(cat), 'btn-action-icon', cat + ' umbenennen'),
      button('×', () => deleteCategory(cat), 'btn-action-icon danger', cat + ' löschen')
    );
    row.append(grip, text('span', cat, 'cat-label-text'), actions);
    box.append(row);
  }
}
function saveCustomRoute(){
  finishRouteDrag();
  if (!flushRoute()) return;
  $('route-modal').style.display='none';
  broadcastState();
  render();
}

function flushRoute() {
  if (routeEditor?.store !== activeStore || routeEditor.saved !== JSON.stringify(storeRoutes[activeStore])) {
    alert('Der Laufweg wurde inzwischen geändert. Die aktuelle Reihenfolge wird angezeigt. Bitte verschiebe die Kategorien erneut.');
    renderRouteList();
    return false;
  }
  const current = routeCategories(activeStore);
  const draft = draftRoute().filter(category => current.includes(category));
  const order = [...new Set([...draft, ...current])];
  if (order.length > 100) {
    alert('Ein Laufweg kann höchstens 100 Kategorien enthalten.');
    return false;
  }
  if (order.some(category => category.length > 80)) {
    alert('Kategorienamen dürfen höchstens 80 Zeichen lang sein. Bitte kürze den Namen in der Artikelbearbeitung.');
    return false;
  }
  if (order.length) storeRoutes[activeStore] = order;
  return true;
}
function renameCategory(old){const name=prompt('Neuer Name der Kategorie:',old)?.trim();if(!name||name===old)return;if(name.length>80||Object.values(storeRoutes).some(r=>r.includes(name))){alert('Dieser Name ist bereits vergeben oder zu lang.');return}if(!flushRoute())return;for(const s of Object.keys(storeRoutes))storeRoutes[s]=storeRoutes[s].map(c=>c===old?name:c);for(const i of items)if(articleCategory(i)===old)i.category=name;for(const k of Object.keys(categoryDict))if(categoryDict[k]===old)categoryDict[k]=name;broadcastState();renderRouteList();render()}
function deleteCategory(cat){if(!confirm('Kategorie löschen? Zugehörige Artikel werden unter Sonstiges eingeordnet.')||!flushRoute())return;for(const s of Object.keys(storeRoutes))storeRoutes[s]=storeRoutes[s].filter(c=>c!==cat);for(const i of items)if(i.category===cat)i.category='Sonstiges';for(const k of Object.keys(categoryDict))if(categoryDict[k]===cat)categoryDict[k]='Sonstiges';broadcastState();renderRouteList();render()}
function addNewCategory(){const name=$('new-category-input').value.trim();if(!name||name.length>80||!flushRoute())return;for(const s of Object.keys(storeRoutes))if(!storeRoutes[s].includes(name))storeRoutes[s].splice(Math.max(0,storeRoutes[s].length-1),0,name);$('new-category-input').value='';broadcastState();renderRouteList();render()}
function openStoreManagerModal(){renderStoreManagerList();$('store-manager-modal').style.display='flex'}
function closeStoreManagerModal(){$('store-manager-modal').style.display='none'}
function moveStore(name, direction) {
  const names = orderedStores();
  const from = names.indexOf(name);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= names.length) return;
  [names[from], names[to]] = [names[to], names[from]];
  put(storeOrderRecord, names);
  broadcastState();
  renderStoreButtons();
  renderStoreManagerList(name, direction);
}

function renderStoreManagerList(focusName, direction) {
  const list = $('store-list-container');
  list.replaceChildren();
  const names = orderedStores();
  names.forEach((name, index) => {
    const row = text('li', '', 'drag-item');
    const actions = text('div', '', 'store-order-actions');
    const up = button('↑', () => moveStore(name, -1), 'btn-action-icon', name + ' nach oben verschieben');
    const down = button('↓', () => moveStore(name, 1), 'btn-action-icon', name + ' nach unten verschieben');
    up.disabled = index === 0;
    down.disabled = index === names.length - 1;
    actions.append(
      up, down,
      button('✎', () => renameStore(name), 'btn-action-icon', name + ' umbenennen'),
      button('×', () => deleteStore(name), 'btn-action-icon danger', name + ' löschen')
    );
    row.append(text('strong', name), actions);
    list.append(row);
    if (name === focusName) {
      const preferred = direction < 0 ? up : down;
      const alternate = direction < 0 ? down : up;
      (preferred.disabled ? alternate : preferred).focus();
    }
  });
}
function renameStore(old){const name=prompt('Neuer Marktname:',old)?.trim();if(!name||name===old)return;if(name.length>80||Object.keys(storeRoutes).some(s=>norm(s)===norm(name))){alert('Marktname existiert bereits oder ist zu lang.');return}const order=orderedStores().map(store=>store===old?name:store);storeRoutes[name]=storeRoutes[old];delete storeRoutes[old];put(storeOrderRecord,order);for(const i of items)if(i.targetStore===old)i.targetStore=name;if(activeStore===old)activeStore=name;broadcastState();renderStoreManagerList();renderStoreButtons();render()}
function addNewStore(){const name=$('new-store-input').value.trim();if(!name||name.length>80)return;if(Object.keys(storeRoutes).some(s=>norm(s)===norm(name))){alert('Diesen Markt gibt es bereits.');return}storeRoutes[name]=[...storeRoutes[activeStore]];activeStore=name;$('new-store-input').value='';broadcastState();renderStoreManagerList();renderStoreButtons();render()}
function deleteStore(s){if(Object.keys(storeRoutes).length===1){alert('Mindestens ein Markt bleibt bestehen.');return}if(!confirm('Markt „'+s+'“ löschen?'))return;delete storeRoutes[s];for(const i of items)if(i.targetStore===s)i.targetStore=null;if(activeStore===s)activeStore=orderedStores()[0];broadcastState();renderStoreManagerList();renderStoreButtons();render()}
async function shareList(){await restoreLegacyPairing();const url=location.origin+location.pathname+'#join='+encodeURIComponent(syncCode);try{await navigator.clipboard.writeText(url);status('Geheimer Verknüpfungslink kopiert. Nur mit vertrauten Personen teilen.')}catch(e){prompt('Diesen geheimen Link kopieren:',url)}}
function openSyncModal(){networkStatus();$('sync-current-code').value=syncCode;$('sync-code-input').value='';$('sync-modal').style.display='flex'}
function closeSyncModal(){$('sync-modal').style.display='none'}
function saveSyncCode(){let val=$('sync-code-input').value.trim();try{val=new URLSearchParams(new URL(val).hash.slice(1)).get('join')||val}catch(e){}joinRoom(val);closeSyncModal()}
function joinRoom(code){code=String(code||'').trim();if(!/^[a-zA-Z0-9_-]{24,150}$/.test(code)){alert('Bitte einen vollständigen Verknüpfungslink oder geheimen Code mit mindestens 24 Zeichen verwenden.');return}if(code===syncCode)return;if(!confirm('Mit dieser gemeinsamen Liste verbinden? Deine bisherige Liste bleibt getrennt auf diesem Gerät gespeichert.'))return;persist();db.legacySyncMigrated=true;db.joinedExplicitly=true;syncCode=code;records=clone(db.rooms[code]||{});pendingSync=true;pending.clear();materialize();persist();renderStoreButtons();render();connect()}
function exportBackup(){persist();const blob=new Blob([JSON.stringify({schema:3,records},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Einkaufsliste-Sicherung-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}
$('import-file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>2000000)throw Error();const data=JSON.parse(await f.text());if(data.schema!==3||!data.records||!Object.entries(data.records).every(([id,r])=>validRecord(id,r)))throw Error();if(confirm('Sicherung in die aktuelle Liste übernehmen? Diese Änderungen werden mit verknüpften Geräten abgeglichen.')){for(const [id,r]of Object.entries(data.records))put(id,r.data);materialize();persist();renderStoreButtons();render();sendState()}}catch(e){alert('Diese Sicherung ist ungültig oder zu groß.')}finally{e.target.value=''}};
function toggleVoice(){$('manual-input').blur();keepRecording?stopVoice():startVoice()}
async function startVoice(){const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Speech){status('Dieser Browser unterstützt keine Spracherkennung. Nutze das Mikrofon deiner Bildschirmtastatur.');return}if(!navigator.onLine&&typeof Speech.available!=='function'){status('Offline-Sprache ist in diesem Browser nicht verfügbar. Bitte Tastatur oder Offline-Diktat des Geräts nutzen.');return}recognition=new Speech();recognition.lang='de-DE';recognition.interimResults=true;recognition.continuous=true;
if(!navigator.onLine){try{if(await Speech.available({langs:['de-DE'],processLocally:true})!=='available'){status('Kein deutsches Offline-Sprachpaket verfügbar. Bitte Tastatur verwenden.');return}recognition.processLocally=true}catch(e){status('Offline-Spracherkennung wird hier nicht unterstützt.');return}}
recognition.onstart=()=>{$('manual-input').blur();showEntryFeedback('');$('voice-transcript').textContent='';keepRecording=true;$('btn-mic').classList.add('recording');$('btn-mic').textContent='⏹';$('btn-mic').setAttribute('aria-label','Aufnahme stoppen');status('Ich höre zu. Zum Beispiel: Ich brauche Tomaten, Brot und Milch.')};let lastFinal = '';
recognition.onresult = event => {
  const interim = [];
  const final = [];
  for (let index = event.resultIndex; index < event.results.length; index++) {
    const result = event.results[index];
    const transcript = result[0].transcript.trim();
    if (transcript) (result.isFinal ? final : interim).push(transcript);
  }
  if (final.length) {
    lastFinal = final.join(', ');
    parseAndAdd(lastFinal);
  }
  const heard = interim.join(' ') || lastFinal;
  $('voice-transcript').textContent = heard ? (interim.length ? 'Ich höre: ' : 'Erkannt: ') + heard : '';
};recognition.onerror=e=>{stopVoice();status(e.error==='not-allowed'?'Mikrofon nicht freigegeben. Bitte Browser-Berechtigung prüfen.':'Spracheingabe beendet ('+e.error+'). Tastatureingabe bleibt verfügbar.')};recognition.onend=()=>{keepRecording=false;resetMic();$('voice-transcript').textContent=lastFinal?'Erkannt: '+lastFinal:'';if($('mic-status').textContent.startsWith('Ich höre zu.'))status(lastFinal?'Aufnahme beendet.':'Aufnahme beendet. Kein Artikel erkannt.')};try{recognition.start()}catch(e){stopVoice();status('Mikrofon konnte nicht gestartet werden.')}}
function resetMic(){$('btn-mic').classList.remove('recording');$('btn-mic').textContent='🎙️';$('btn-mic').setAttribute('aria-label','Spracheingabe starten')}
function stopVoice(){keepRecording=false;resetMic();try{recognition?.stop()}catch(e){}status('Aufnahme beendet.')}
async function setupPWA(){if(!('serviceWorker'in navigator)){status('Offline-Start wird von diesem Browser nicht unterstützt.');return}try{reg=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});const show=()=>{waitingWorker=reg.waiting;if(waitingWorker&&navigator.serviceWorker.controller)$('update').hidden=false};show();reg.addEventListener('updatefound',()=>{const w=reg.installing;w?.addEventListener('statechange',()=>{if(w.state==='installed'){show();if(!navigator.serviceWorker.controller)status('Offline-Dateien gespeichert. Die App kann jetzt offline geöffnet werden.')}})});navigator.serviceWorker.addEventListener('controllerchange',()=>{if(sessionStorage.getItem('einkauf-updating')){sessionStorage.removeItem('einkauf-updating');location.reload()}});navigator.serviceWorker.ready.then(()=>{if(navigator.serviceWorker.controller)status('Offline bereit · Tastatur verfügbar, Sprache je nach Browser.');if(navigator.storage?.persist)navigator.storage.persist().catch(()=>{})});setInterval(()=>reg.update().catch(()=>{}),300000)}catch(e){$('app-state').textContent='Offline-Start konnte nicht eingerichtet werden. Bitte App über HTTPS öffnen.'}}
async function checkUpdate(){if(!navigator.onLine){status('Du bist offline. Updates können später geprüft werden.');return}try{await reg?.update();if(reg?.waiting){waitingWorker=reg.waiting;$('update').hidden=false}else status('Update-Prüfung gestartet. Ein verfügbares Update wird zur Bestätigung angezeigt.')}catch(e){status('Updates konnten gerade nicht geprüft werden.')}}
function applyUpdate(){waitingWorker=reg?.waiting||waitingWorker;if(!waitingWorker||!persist())return;stopVoice();sessionStorage.setItem('einkauf-updating','yes');waitingWorker.postMessage({type:'ACTIVATE'})}
for(const overlay of document.querySelectorAll('.modal-overlay')){overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.style.display='none'})}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){for(const o of document.querySelectorAll('.modal-overlay'))o.style.display='none';$('dropdown-menu').classList.remove('show')}if(e.key==='Tab'){const modal=[...document.querySelectorAll('.modal-overlay')].find(o=>o.style.display==='flex');if(modal){const focus=[...modal.querySelectorAll('button,input,select')].filter(x=>!x.disabled);if(e.shiftKey&&(document.activeElement===focus[0]||!focus.includes(document.activeElement))){e.preventDefault();focus.at(-1).focus()}else if(!e.shiftKey&&document.activeElement===focus.at(-1)){e.preventDefault();focus[0].focus()}}}});
$('manual-input').addEventListener('input',()=>{showEntryFeedback('');if(!keepRecording)$('voice-transcript').textContent='';renderSuggestions()});
$('app-version').textContent='Version '+APP_VERSION;
init();
readIncomingRecipe();
window.addEventListener('hashchange', readIncomingRecipe);
