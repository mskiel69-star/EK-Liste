const assert=require('node:assert/strict'),{EventEmitter}=require('node:events'),{device}=require('./test-sync.cjs');
const brokers=new Map();
class Connection extends EventEmitter{
 constructor(url){super();this.url=url;this.connected=true;this.syncReady=false;this.subs=[];if(!brokers.has(url))brokers.set(url,{clients:new Set(),retained:new Map()});brokers.get(url).clients.add(this);queueMicrotask(()=>this.emit('connect'))}
 subscribe(topics,options,callback){this.subs=Array.isArray(topics)?topics:[topics];queueMicrotask(()=>{callback(null,this.subs.map(topic=>({topic,qos:1})));for(const [topic,payload]of brokers.get(this.url).retained)if(this.matches(topic))this.emit('message',topic,Buffer.from(payload),{retain:true})})}
 matches(topic){return this.subs.some(pattern=>pattern===topic||(pattern.endsWith('/+')&&topic.startsWith(pattern.slice(0,-1))&&!topic.slice(pattern.length-1).includes('/')))}
 publish(topic,payload,options,callback){if(!this.connected){callback?.(Error('offline'));return}const broker=brokers.get(this.url);if(options.retain)broker.retained.set(topic,payload);queueMicrotask(()=>{for(const c of broker.clients)if(c.connected&&c.matches(topic))c.emit('message',topic,Buffer.from(payload),{retain:false});callback?.()})}
 end(){this.connected=false;brokers.get(this.url).clients.delete(this);this.emit('close')}
}
async function until(predicate){const deadline=Date.now()+3000;while(!predicate()){if(Date.now()>deadline)throw Error('Transport timeout');await new Promise(r=>setTimeout(r,5))}}
(async()=>{const a=device(true),b=device(true);for(const x of [a,b])x.context.mqtt={connect:url=>new Connection(url)};
 await Promise.all([a.run('connect()'),b.run('connect()')]);await until(()=>a.run('peerSeen.size')===1&&b.run('peerSeen.size')===1);
 a.run(`parseAndAdd('Milch')`);await until(()=>b.run('items.length')===1);
 b.run(`toggleItemDirect(items[0].id)`);await until(()=>a.run('items[0].done')===true);
 a.run(`items[0].note='fettarm';broadcastState()`);await until(()=>b.run('items[0].note')==='fettarm');
 b.context.navigator.onLine=false;await b.run('connect()');a.run(`parseAndAdd('Brot')`);b.run(`parseAndAdd('Tomaten')`);b.context.navigator.onLine=true;await b.run('connect()');await until(()=>a.run('items.length')===3&&b.run('items.length')===3);
 // A late device must recover all retained device snapshots without destroying their union.
 const c=device(true);c.context.mqtt={connect:url=>new Connection(url)};await c.run('connect()');await until(()=>c.run('items.length')===3);
 // Even if one broker is unavailable, both devices still exchange changes on the other.
 a.run('syncConnections[0].end(true)');b.run('syncConnections[0].end(true)');a.run(`parseAndAdd('Käse')`);await until(()=>b.run('items.length')===4);
 for(const x of [a,b,c])x.run('syncConnections.forEach(c=>c.end(true))');
 const l=device(true),r=device(true);for(const x of [l,r]){x.run(`db.legacySyncMigrated=false;localStorage.setItem('local_sync_code','familie_alter_gemeinsamer_code')`)}l.run(`parseAndAdd('Brot')`);r.run(`parseAndAdd('Milch')`);await Promise.all([l.run('restoreLegacyPairing()'),r.run('restoreLegacyPairing()')]);assert.equal(l.run('syncCode'),r.run('syncCode'));assert.equal(l.run('items.length'),1);assert.equal(r.run('items.length'),1);
 console.log('AES-GCM-Transport in zwei getrennten App-Instanzen bestanden: Peer-Bestätigung, beide Richtungen, Abhaken, Bearbeiten, Offline-Reconnect, verspätetes Gerät, Serverausfall und Wiederherstellung alter Verknüpfungen.');
})().catch(e=>{console.error(e);process.exitCode=1});
