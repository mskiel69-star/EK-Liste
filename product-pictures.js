'use strict';

// Everyday German grocery names, grouped by the product shown on the package.
// Product forms take precedence over flavour or ingredient names.
const productPictureNames = new Map();
function productPictureWords(value) {
  return String(value || '').normalize('NFKC').toLocaleLowerCase('de')
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .match(/[\p{L}\p{N}]+/gu) || [];
}

function addProductPictures(groups, priority) {
  for (const [picture, names] of groups) {
    for (const name of names.split('|')) {
      const key = productPictureWords(name).join(' ');
      productPictureNames.set(key, {picture, priority});
    }
  }
}

addProductPictures([
  ['🥭', 'mango|mangos|mangoes|flugmango|mangofrucht|mangofrüchte|mangostücke|mangowürfel'],
  ['papaya', 'papaya|papayas|flugpapaya|papayafrucht|papayastücke|papayawürfel'],
  ['🍎', 'apfel|äpfel|tafelapfel|tafeläpfel|braeburn|elstar|jonagold|pink lady|boskoop'],
  ['🍏', 'grüner apfel|grüne äpfel|granny smith'],
  ['🍐', 'birne|birnen|williamsbirne|conference birne|nashi|nashi birne'],
  ['🍌', 'banane|bananen|kochbanane|kochbananen|babybananen'],
  ['🍍', 'ananas|flugananas|babyananas|ananasscheiben|ananasstücke'],
  ['🍊', 'orange|orangen|apfelsine|apfelsinen|blutorange|blutorangen|mandarine|mandarinen|clementine|clementinen|satsuma|grapefruit|pomelo'],
  ['🍋', 'zitrone|zitronen'], ['🍋‍🟩', 'limette|limetten'],
  ['🥝', 'kiwi|kiwis|minikiwi|goldkiwi|kiwi gold'], ['🥥', 'kokosnuss|kokosnüsse|kokosfleisch'],
  ['🍇', 'trauben|weintrauben|weintraube|tafeltrauben|rosinen|sultaninen|korinthen'],
  ['🍉', 'wassermelone|wassermelonen'], ['🍈', 'melone|melonen|honigmelone|galiamelone|cantaloupe|zuckermelone'],
  ['🍑', 'pfirsich|pfirsiche|nektarine|nektarinen|aprikose|aprikosen|marille|marillen'],
  ['plum', 'pflaume|pflaumen|zwetschge|zwetschgen|zwetschken|mirabelle|mirabellen|trockenpflaumen'],
  ['🍒', 'kirsche|kirschen|süßkirschen|sauerkirschen'],
  ['🍓', 'erdbeere|erdbeeren|himbeere|himbeeren|johannisbeere|johannisbeeren|preiselbeeren|cranberries'],
  ['🫐', 'blaubeere|blaubeeren|heidelbeere|heidelbeeren|brombeeren|beeren|beerenmix|waldbeeren'],
  ['fig', 'feige|feigen'], ['🌴', 'dattel|datteln'], ['dragonfruit', 'pitahaya|drachenfrucht'],
  ['passionfruit', 'maracuja|passionsfrucht'], ['tropical', 'physalis|guave|litschi|granatapfel|kaki|sharonfrucht'],
  ['🥑', 'avocado|avocados|hass avocado'], ['🍅', 'tomate|tomaten|cherrytomaten|kirschtomaten|kirschtomate|cocktailtomaten|rispentomaten|datteltomaten|fleischtomaten|romatomaten'],
  ['🥒', 'gurke|gurken|salatgurke|salatgurken|schlangengurke|zucchini'],
  ['🍆', 'aubergine|auberginen'], ['🫑', 'paprika|spitzpaprika|blockpaprika|paprikaschoten'],
  ['🌶️', 'chili|chilischoten|peperoni|jalapeno|jalapeños|habanero'],
  ['🥕', 'karotte|karotten|möhre|möhren|bundmöhren|minimöhren|pastinake|pastinaken|petersilienwurzel'],
  ['🥔', 'kartoffel|kartoffeln|speisekartoffeln|drillinge|pellkartoffeln|salzkartoffeln'], ['🍠', 'süßkartoffel|süßkartoffeln|batate'],
  ['🫜', 'radieschen|rettich|meerrettich|rote bete|rote beete|rüben|steckrübe|knollensellerie'],
  ['🥬', 'salat|kopfsalat|eisbergsalat|feldsalat|romanasalat|rucola|endivie|chicorée|spinat|blattspinat|rahmspinat|mangold|porree|lauch|sellerie|stangensellerie|fenchel|kohl|rotkohl|weißkohl|spitzkohl|chinakohl|pak choi|wirsing|kohlrabi|grünkohl|rosenkohl|sauerkraut|rhabarber|spargel'],
  ['🥦', 'brokkoli|broccoli|blumenkohl|romanesco'], ['🌽', 'mais|zuckermais|maiskolben|gemüsemais'],
  ['🧅', 'zwiebel|zwiebeln|schalotte|schalotten|frühlingszwiebeln|lauchzwiebeln'], ['🧄', 'knoblauch|knoblauchzehen'],
  ['🍄‍🟫', 'pilz|pilze|champignon|champignons|pfifferlinge|steinpilze|shiitake|austernpilze|kräuterseitlinge'],
  ['🫛', 'erbse|erbsen|zuckerschoten|zuckererbsen|edamame|brechbohnen|buschbohnen|grüne bohnen'],
  ['🫘', 'bohne|bohnen|kidneybohnen|weiße bohnen|schwarze bohnen|linsen|berg linsen|berglinsen|tellerlinsen|kichererbsen|sojabohnen|belugalinsen'],
  ['🌿', 'basilikum|petersilie|schnittlauch|dill|koriander|rosmarin|thymian|oregano|minze|salbei|bärlauch|lorbeer|liebstöckel|estragon|kresse|kräuter|suppengrün'],
  ['🫚', 'ingwer|ingwerwurzel|kurkuma|kurkumawurzel'], ['🎃', 'kürbis|hokkaido|butternut|muskatkürbis'],
  ['🥜', 'erdnuss|erdnüsse|mandel|mandeln|cashews|cashewkerne|walnüsse|haselnüsse|pistazien|nussmix|nüsse|pinienkerne|pekannüsse|paranüsse|sonnenblumenkerne|kürbiskerne|chiasamen|leinsamen|sesam'],
  ['🌰', 'maronen|kastanien|esskastanien'],
  ['🫒', 'olive|oliven|kalamata|kapern'], ['🥚', 'ei|eier|hühnereier|wachteleier|bioeier|freilandeier|bodeneier|freiland eier'],
  ['🦐', 'garnele|garnelen|shrimps|scampi|krabben|crevetten'], ['🦪', 'muscheln|austern|miesmuscheln|jakobsmuscheln'],
  ['🐟', 'fisch|lachs|lachsfilet|thunfisch|kabeljau|seelachs|forelle|makrele|hering|sardinen|zander|dorade|scholle|tilapia|pangasius'],
  ['🍗', 'hähnchen|hähnchenbrust|hähnchenfilet|hähnchenschenkel|huhn|hühnerbrust|pute|putenbrust|putenfilet|truthahn|ente|entenbrust|gans'],
  ['🥩', 'fleisch|hack|hackfleisch|rinderhack|schweinehack|rind|rindfleisch|schwein|schweinefleisch|kalb|kalbfleisch|lamm|lammfleisch|steak|rumpsteak|filet|gulasch|geschnetzeltes|schnitzel|kotelett|rouladen|braten']
], 1);

addProductPictures([
  ['🧀', 'käse|käsescheiben|käse scheiben|käsescheibe|scheibenkäse|scheiben käse|käseaufschnitt|käsewürfel|käsewürfelchen|reibekäse|geriebener käse|käsestück|gouda|goudascheiben|emmentaler|emmentalerscheiben|edamer|tilsiter|cheddar|maasdamer|butterkäse|bergkäse|schnittkäse|hartkäse|weichkäse|schmelzkäse|frischkäse|körniger frischkäse|hüttenkäse|feta|schafskäse|ziegenkäse|hirtenkäse|mozzarella|büffelmozzarella|burrata|parmesan|parmigiano reggiano|grana padano|pecorino|camembert|brie|gorgonzola|ricotta|mascarpone|halloumi|raclettekäse|gratinkäse'],
  ['🧈', 'butter|salzbutter|kräuterbutter|süßrahmbutter|sauerrahmbutter|butterschmalz|margarine|ghee'],
  ['🥛', 'milch|vollmilch|frischmilch|h milch|haltbare milch|sahne|schlagsahne|schmand|saure sahne|crème fraîche|creme fraiche|kondensmilch|kaffeesahne|buttermilch|kefir|hafermilch|haferdrink|hafer drink|sojamilch|sojadrink|mandelmilch|mandeldrink|reismilch|reisdrink|kokosmilch|kokosdrink'],
  ['🥣', 'joghurt|jogurt|naturjoghurt|fruchtjoghurt|griechischer joghurt|skyr|quark|magerquark|sahnequark|pudding|milchreis|haferflocken|dinkelflocken|müsli|granola|porridge|cornflakes|overnight oats'],
  ['🍞', 'brot|roggenbrot|weizenbrot|dinkelbrot|vollkornbrot|mischbrot|sauerteigbrot|toast|toastbrot|sandwichtoast|knäckebrot|pumpernickel|ciabatta|zwieback|paniermehl|semmelbrösel'],
  ['🥖', 'brötchen|semmel|semmeln|schrippe|schrippen|baguette|aufbackbrötchen|vollkornbrötchen|sandwichbrötchen'],
  ['🥐', 'croissant|croissants|hörnchen'], ['🥨', 'brezel|brezeln|laugenbrezel|laugengebäck|laugenstange'], ['🥯', 'bagel|bagels'],
  ['🫓', 'fladenbrot|pita|naan|tortilla|tortillas|wrap|wraps'],
  ['🍝', 'nudeln|spaghetti|pasta|penne|fusilli|farfalle|tagliatelle|linguine|bandnudeln|eiernudeln|linsennudeln|vollkornnudeln|lasagneplatten|spätzle|gnocchi'],
  ['🥟', 'ravioli|tortellini|maultaschen|teigtaschen|pelmeni|gyoza|frühlingsrollen|kartoffelknödel|klöße|kartoffelklöße|semmelknödel'],
  ['🍚', 'reis|basmatireis|jasminreis|naturreis|vollkornreis|risottoreis|sushireis|couscous|bulgur|quinoa|hirse|buchweizen|dinkel|graupen'],
  ['🌾', 'mehl|weizenmehl|roggenmehl|dinkelmehl|vollkornmehl|weizenvollkornmehl|speisestärke|maisstärke|kartoffelstärke|grieß|hartweizengrieß|backpulver|natron|trockenhefe|hefe'],
  ['🍯', 'honig|blütenhonig|waldhonig|ahornsirup|agavendicksaft|dattelsirup|sirup'],
  ['🫙', 'marmelade|konfitüre|gelee|fruchtaufstrich|brotaufstrich|aufstrich|erdnussbutter|nussmus|mandelmus|nutella|nuss nougat creme|hummus|pesto|chutney|remoulade|mayonnaise|mayo|senf|ketchup|tomatenketchup|tomatenmark|tomaten mark|tomatenpüree|passierte tomaten|passata|salsa|dressing|sojasauce|sojasoße|grillsauce|grillsoße|sauce|soße'],
  ['🥫', 'konserve|konserven|dosentomaten|dosenmais|dosenlinsen|dosenbohnen|baked beans|tomaten in der dose'],
  ['🫝', 'gewürzgurken|gewürzgurke|essiggurken|cornichons|saure gurken'],
  ['🫒', 'öl|olivenöl|rapsöl|sonnenblumenöl|leinöl|sesamöl|kokosöl|essig|balsamico|apfelessig|wein essig|weinessig'],
  ['🧂', 'salz|meersalz|jodsalz|pfeffer|gewürz|gewürze|paprikapulver|currypulver|zimt|muskat|muskatnuss|kreuzkümmel|kümmel|vanille|vanilleschote|zucker|brauner zucker|puderzucker|vanillezucker|brühe|gemüsebrühe|brühwürfel'],
  ['🥓', 'schinken|kochschinken|rohschinken|schinkenwürfel|schinkenscheiben|speck|bacon|speckwürfel|schwarzwälder schinken'],
  ['🌭', 'wurst|wurstaufschnitt|salami|salamischeiben|bratwurst|bockwurst|wiener|würstchen|mettenden|fleischwurst|leberwurst|mortadella|lyoner|putenaufschnitt|aufschnitt'],
  ['🧆', 'falafel|tofu|räuchertofu|tempeh|seitan|vegetarische frikadellen'],
  ['🍔', 'burger|hamburger|cheeseburger|burgerpatty|burgerpatties'], ['🍕', 'pizza|tiefkühlpizza|pizzateig'],
  ['🍟', 'pommes|pommes frites|kroketten|wedges|kartoffelspalten|chips|kartoffelchips'],
  ['🍲', 'suppe|linsensuppe|tomatensuppe|gemüsesuppe|eintopf|linseneintopf'], ['🥗', 'fertigsalat|kartoffelsalat|nudelsalat|krautsalat|obstsalat'],
  ['🍣', 'sushi|maki|nigiri'], ['🥪', 'sandwich|sandwiches|panini'],
  ['🍫', 'schokolade|bitterschokolade|vollmilchschokolade|zartbitterschokolade|kuvertüre|pralinen|schokoriegel|kakao'],
  ['🍪', 'keks|kekse|cookies|gebäck|butterkekse|spekulatius|lebkuchen'],
  ['🍬', 'bonbon|bonbons|gummibärchen|fruchtgummi|lakritz|kaubonbons|kaugummi|süßigkeiten'],
  ['🍿', 'popcorn'], ['🧇', 'waffel|waffeln|reiswaffeln|maiswaffeln'], ['🥞', 'pfannkuchen|pancakes|crêpes|crepes'],
  ['🍰', 'kuchen|torte|käsekuchen|marmorkuchen|obstkuchen|apfelkuchen|tiramisu'], ['🧁', 'muffin|muffins|cupcakes'], ['🍩', 'donut|donuts|berliner|krapfen'],
  ['🍨', 'eis|speiseeis|eiscreme|vanilleeis|schokoladeneis|sorbet|wassereis'],
  ['💧', 'wasser|mineralwasser|sprudel|tafelwasser|stilles wasser'], ['🧃', 'saft|fruchtsaft|nektar|fruchtnektar|direktsaft|smoothie|mangosaft|mangonektar|papayasaft'],
  ['🥤', 'cola|limonade|brause|eistee|energydrink|energy drink|schorle|tonic water|ginger ale'],
  ['☕', 'kaffee|kaffeebohnen|kaffeepulver|kaffeekapseln|espresso|cappuccino|instantkaffee'], ['🍵', 'tee|schwarztee|grüntee|kräutertee|früchtetee|teebeutel|matcha'],
  ['🍺', 'bier|pils|weizenbier|radler|alkoholfreies bier'], ['🍷', 'wein|rotwein|weißwein|roséwein'], ['🍾', 'sekt|prosecco|champagner|schaumwein'], ['🥃', 'whisky|whiskey|rum|gin|wodka|vodka|likör'],
  ['🧻', 'toilettenpapier|klopapier|küchenrolle|küchenpapier|taschentücher|papierhandtücher|servietten'],
  ['🧴', 'shampoo|haarschampoo|duschgel|duschbad|bodylotion|creme|handcreme|sonnencreme|sonnenschutz|deo|deodorant|rasiergel'],
  ['🧼', 'seife|handseife|flüssigseife|kernseife'], ['🪥', 'zahnbürste|zahnpasta|zahncreme|zahnseide|mundspülung'],
  ['🧺', 'waschmittel|vollwaschmittel|colorwaschmittel|weichspüler|waschpulver|waschpods'],
  ['🧽', 'spülmittel|spüli|schwamm|spülschwamm|spültabs|geschirrspültabs|klarspüler|geschirrspülsalz'],
  ['🫧', 'reiniger|allzweckreiniger|glasreiniger|badreiniger|wc reiniger|toilettenreiniger|entkalker'],
  ['🗑️', 'müllbeutel|mülltüten|abfallbeutel|müllsäcke'], ['🧽', 'putzlappen|mikrofasertuch|putztücher|scheuerschwamm'],
  ['📦', 'alufolie|frischhaltefolie|backpapier|gefrierbeutel|brotbeutel|vorratsdose'],
  ['🍼', 'babymilch|säuglingsmilch|babybrei'], ['🧷', 'windel|windeln|feuchttücher'],
  ['🐕', 'hundefutter|hundeleckerli|hundekekse'], ['🐈', 'katzenfutter|katzenstreu|katzenleckerlis'],
  ['🔋', 'batterie|batterien|akkus|knopfzelle'], ['💡', 'glühbirne|led lampe|leuchtmittel'], ['🕯️', 'kerze|kerzen|teelicht|teelichter']
], 2);

// Recognise the product at the end of common compounds without matching arbitrary substrings.
const productPictureCompounds = [
  ['🧀', /kaese(?:scheiben?|stuecke?|wuerfel(?:chen)?|raspel|aufschnitt)?$/],
  ['🫙', /(?:marmelade|konfituere|chutney|pesto|ketchup|dressing|aufstrich|sauce|sosse|tomatenmark)$/],
  ['🥣', /(?:joghurt|jogurt|quark|skyr|pudding|flocken|muesli|porridge)$/],
  ['🍯', /(?:sirup|dicksaft)$/],
  ['🧃', /(?:fruchtsaft|saft|nektar|smoothie)$/],
  ['🥤', /(?:schorle|limonade|eistee)$/],
  ['🥛', /(?:milch|sahne|haferdrink|sojadrink|mandeldrink|reisdrink)$/],
  ['🧈', /(?:butter|margarine|butterschmalz)$/],
  ['🍰', /(?:kuchen|torte)$/],
  ['🍨', /(?:speiseeis|eiscreme|sorbet)$/],
  ['🍪', /(?:kekse?|cookies)$/],
  ['🍝', /(?:nudeln?|spaghetti)$/],
  ['🥖', /(?:broetchen|baguette)$/],
  ['🍞', /(?:brot|toast)$/],
  ['🌾', /(?:vollkornmehl|mehl|speisestaerke)$/],
  ['🥓', /(?:schinken(?:wuerfel|scheiben?)?|speck(?:wuerfel)?)$/],
  ['🌭', /(?:wurst(?:aufschnitt|scheiben?)?|salami(?:scheiben?)?)$/],
  ['🍗', /(?:haehnchen|puten)(?:(?:brust|filet|schenkel)(?:streifen|stuecke)?|streifen)$/],
  ['🐟', /(?:lachs|forellen|kabeljau|seelachs|herings)(?:filet|filets|stuecke|streifen)$/],
  ['🥩', /(?:hackfleisch|steaks?|schnitzel|gulasch)$/],
  ['🥣', /(?:hafer|dinkel|reis)flocken$/],
  ['🍲', /(?:suppe|eintopf)$/],
  ['🥘', /(?:gratin|auflauf|lasagne)$/],
  ['🥗', /salat$/],
  ['🧴', /(?:shampoo|duschgel|handcreme|sonnencreme)$/],
  ['🧺', /(?:waschmittel|waschpulver)$/],
  ['🧻', /(?:toilettenpapier|klopapier|kuechenpapier)$/],
  ['🥭', /^(?:bio|tk|tiefkuehl)?mango(?:s|es|stuecke|scheiben?|wuerfel|pueree|haelften)?$/],
  ['papaya', /^(?:bio|tk|tiefkuehl)?papaya(?:s|stuecke|scheiben?|wuerfel|pueree|haelften)?$/]
];

function productPictureFor(title) {
  const words = productPictureWords(title);
  const exact = productPictureNames.get(words.join(' '));
  if (exact) return exact.picture;

  const qualifier = words.findIndex(word => ['mit', 'ohne', 'fuer', 'zum', 'zur', 'zu', 'oder'].includes(word));
  const endOfProduct = qualifier > 0 ? qualifier : words.length;
  let best = null;
  let bestScore = -1;
  for (let start = 0; start < endOfProduct; start++) {
    for (let end = start + 1; end <= Math.min(start + 4, endOfProduct); end++) {
      const phrase = words.slice(start, end).join(' ');
      let match = productPictureNames.get(phrase);
      if (!match && end === start + 1) {
        const compound = productPictureCompounds.find(([, pattern]) => pattern.test(phrase));
        if (compound) {
          const picture = compound[0];
          match = {picture, priority: picture === '🥭' || picture === 'papaya' ? 1 : 2};
        } else {
          const base = phrase.replace(/^(?:bio|tiefkuehl|tk|mini|baby)/, '');
          const stem = base.replace(/(?:scheiben?|wuerfel|stuecke?|haelften|raspel)$/, '');
          match = productPictureNames.get(base) || productPictureNames.get(stem);
        }
      }
      if (!match) continue;
      const score = match.priority * 10000 + (end - start) * 1000 + phrase.length * 10 + start;
      if (score > bestScore) {
        best = match.picture;
        bestScore = score;
      }
    }
  }
  return best;
}

const productPictureDrawings = {
  fig: '<path d="M25 5c1 10 14 12 18 23 6 17-15 24-28 16C2 35 8 24 16 17c5-4 5-10 9-12Z" fill="#765086"/><path d="M26 12c2 8 13 11 14 21 1 11-13 15-22 9-10-7-6-15 1-22Z" fill="#f2a297"/><path d="M26 20c3 5 9 7 10 13 1 7-10 10-15 5-6-5-2-10 5-18Z" fill="#b04e6d"/><g fill="#ffd4a6"><circle cx="26" cy="28" r="1.5"/><circle cx="29" cy="34" r="1.5"/><circle cx="23" cy="35" r="1.5"/></g>',
  dragonfruit: '<path d="M21 8c10-5 22 4 24 15 4 12-4 23-17 24S5 37 6 25C6 17 13 10 21 8Z" fill="#df477e"/><path d="M13 15 8 6l13 4m16 3 7-7-1 16M6 29l-5 7 12-2m25 5 9-3-5 9" fill="#72a14a"/><ellipse cx="25" cy="28" rx="13" ry="15" fill="#fff0ea"/><g fill="#44363c"><circle cx="21" cy="21" r="1.4"/><circle cx="30" cy="23" r="1.4"/><circle cx="24" cy="28" r="1.4"/><circle cx="18" cy="32" r="1.4"/><circle cx="30" cy="34" r="1.4"/><circle cx="24" cy="38" r="1.4"/></g>',
  passionfruit: '<circle cx="24" cy="25" r="21" fill="#754a83"/><circle cx="24" cy="25" r="17" fill="#ffe4a0"/><circle cx="24" cy="25" r="13" fill="#f4ae3b"/><g fill="#674837"><ellipse cx="19" cy="18" rx="2" ry="3"/><ellipse cx="28" cy="17" rx="2" ry="3"/><ellipse cx="23" cy="25" rx="2" ry="3"/><ellipse cx="16" cy="27" rx="2" ry="3"/><ellipse cx="31" cy="27" rx="2" ry="3"/><ellipse cx="24" cy="33" rx="2" ry="3"/></g>',
  tropical: '<path d="M26 12c1-6 7-9 14-7-1 6-7 10-14 7Z" fill="#6c9e49"/><path d="M25 13c11 0 19 6 19 17 0 9-7 16-19 16S6 39 6 30c0-11 8-17 19-17Z" fill="#e98b51"/><path d="M13 28c1-5 4-8 8-9" fill="none" stroke="#ffb98b" stroke-width="3" stroke-linecap="round"/>',
  papaya: '<path d="M15 42C4 34 10 15 22 7c8-6 18-3 22 4 6 10 0 24-10 31-6 4-13 5-19 0Z" fill="#5d933f"/><path d="M17 39c-8-6-4-20 6-28 6-5 14-4 18 2 5 8 0 20-9 26-6 4-11 4-15 0Z" fill="#ff9b38"/><ellipse cx="26" cy="26" rx="7" ry="12" transform="rotate(35 26 26)" fill="#ffcb69"/><g fill="#48302b"><circle cx="27" cy="19" r="2"/><circle cx="31" cy="23" r="2"/><circle cx="25" cy="24" r="2"/><circle cx="28" cy="28" r="2"/><circle cx="21" cy="29" r="2"/><circle cx="24" cy="33" r="2"/></g>',
  plum: '<path d="M25 12c0-7 5-9 10-9" fill="none" stroke="#548347" stroke-width="3" stroke-linecap="round"/><path d="M26 11c4-7 11-7 17-5-3 7-10 10-17 5Z" fill="#83a954"/><path d="M26 12c9-6 20 1 20 13 0 13-9 22-21 22C12 47 4 37 5 25c1-11 11-18 21-13Z" fill="#734598"/><path d="M14 20c2-3 5-5 8-5" fill="none" stroke="#b684d0" stroke-width="3" stroke-linecap="round"/>'
};
