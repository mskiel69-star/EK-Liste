const assert=require('node:assert/strict'),{device}=require('./test-sync.cjs');
const a=device(),b=device();function copy(from,to){to.context.incoming=JSON.parse(from.run('JSON.stringify(records)'));to.run('merge(incoming)')}
a.run(`parseAndAdd('Milch und Milch')`);assert.equal(a.run('items.length'),1);
a.run(`parseAndAdd('MILCH bei Aldi');parseAndAdd('Milch bei Famila')`);assert.equal(a.run('items.length'),1);assert.equal(a.run('items[0].targetStore'),'Famila');
a.run(`parseAndAdd('Milch laktosefrei und Milch fettarm')`);assert.equal(a.run('items.length'),3);
a.run(`parseAndAdd('Milch LAKTOSEFREI')`);assert.equal(a.run('items.length'),3);
// Existing duplicates are repaired, including whitespace and Unicode-normalized descriptions.
a.run(`put('i:old-duplicate',{...clone(items[1]),id:'old-duplicate',title:' MILCH ',note:'  LAKTOSEFREI  '});materialize()`);assert.equal(a.run('items.length'),3);assert.equal(a.run(`Object.values(records).filter(r=>r.data&&r.data.title&&itemKey(r.data)===itemKey({title:'Milch',note:'laktosefrei'})).length`),1);
// Two isolated devices add the same article independently while offline.
b.run(`parseAndAdd('Milch laktosefrei')`);copy(a,b);copy(b,a);assert.equal(a.run('items.length'),3);assert.equal(b.run('items.length'),3);
assert.equal(a.run(`items.find(i=>identityText(i.note)==='laktosefrei').id`),b.run(`items.find(i=>identityText(i.note)==='laktosefrei').id`));
// Matching completed variants must be suggested; active ones must not be suggested.
a.run(`for(const i of items){i.done=!!i.note;i.completedAt=i.done?Date.now():null}broadcastState()`);
assert.equal(a.run(`completedSuggestions('mi').length`),2);assert.equal(a.run(`completedSuggestions('LAKTO').length`),1);assert.equal(a.run(`completedSuggestions('').length`),0);assert.equal(a.run(`completedSuggestions('Brot').length`),0);
a.run(`const variant=items.find(i=>identityText(i.note)==='laktosefrei');const variantId=variant.id;parseAndAdd('Milch laktosefrei')`);assert.equal(a.run('items.length'),3);assert.equal(a.run(`items.find(i=>i.id===variantId).done`),false);
// Editing one variant into another must not leave a duplicate.
a.run(`items.find(i=>identityText(i.note)==='fettarm').note='laktosefrei';broadcastState()`);assert.equal(a.run('items.length'),2);copy(a,b);assert.equal(b.run('items.length'),2);
// A duplicate tombstone must prevent an old offline snapshot from restoring it.
a.run(`const snapshot=clone(records);put('i:stale-duplicate',{id:'stale-duplicate',title:'Milch',note:'',category:'Kühlregal',done:false});materialize();const repaired=clone(records);merge(snapshot)`);assert.equal(a.run('items.length'),2);
console.log('Dubletten und Vorschläge bestanden: Eingabe, Märkte, verschiedene Zusätze, bestehende und parallele Offline-Dubletten, stabile IDs auf beiden Geräten, erledigte Varianten, Reaktivierung und Bearbeitungskollisionen.');
