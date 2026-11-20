'use strict';

// Regional offer results are kept separately from shared shopping-list records.
const regionalOffers = new Map();
let offerCheckTimer;
let offerCheckRunning = false;
let offerCheckError = '';
const offerCacheDuration = 30 * 60 * 1000;

function offerQueryKey(value) {
  return value.normalize('NFKC').toLocaleLowerCase('de').trim().replace(/\s+/g, ' ');
}

function activeOfferPeriod(entry, now) {
  return (entry.validityDates || []).find(period => {
    const from = Date.parse(period.from), to = Date.parse(period.to);
    return Number.isFinite(from) && Number.isFinite(to) && from <= now && now <= to;
  });
}

function matchingRegionalOffers(entries, query, now = Date.now()) {
  const wanted = productPictureWords(query);
  if (!wanted.length) return [];
  const matches = [];
  const seen = new Set();
  for (const entry of entries) {
    const product = entry.product?.name || entry.name || '';
    const words = productPictureWords(product);
    if (!wanted.every(word => words.includes(word))) continue;
    const period = activeOfferPeriod(entry, now);
    const price = entry.price;
    if (!period || typeof price !== 'number' || !Number.isFinite(price) || price <= 0 ||
        !Number.isSafeInteger(entry.id)) continue;
    for (const retailer of entry.advertisers || []) {
      if (typeof retailer.name !== 'string' || !retailer.name.trim()) continue;
      const key = entry.id + ':' + retailer.name;
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push({
        id: entry.id, retailer: retailer.name, product, price,
        description: typeof entry.description === 'string' ? entry.description : '',
        from: period.from, until: period.to,
        loyalty: !!(entry.requiresLoyalityMembership || entry.requiresLoyaltyMembership)
      });
    }
  }
  return matches.sort((a, b) => a.price - b.price || a.retailer.localeCompare(b.retailer, 'de')).slice(0, 3);
}

function updateRegionalOfferBadges() {
  for (const box of document.querySelectorAll('[data-offer-query]')) {
    box.replaceChildren();
    const result = regionalOffers.get(box.dataset.offerQuery);
    const offers = result?.offers.filter(offer => Date.parse(offer.until) >= Date.now()) || [];
    for (const offer of offers) {
      const link = document.createElement('a');
      link.className = 'regional-offer';
      link.href = 'https://www.marktguru.de/offers/' + offer.id + '?zip=24145';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      const date = new Date(offer.until).toLocaleDateString('de-DE', {
        day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin'
      });
      const price = offer.price.toLocaleString('de-DE', {style: 'currency', currency: 'EUR'});
      link.textContent = 'Angebot: ' + offer.retailer + ' · ' + price + ' · bis ' + date +
        (offer.loyalty ? ' · App/Karte' : '') + (!navigator.onLine ? ' · zuletzt geprüft' : '');
      link.title = [offer.product, offer.description, 'Quelle: marktguru, Region 24145',
        'Geprüft: ' + new Date(result.checked).toLocaleString('de-DE')].join(' · ');
      box.append(link);
    }
  }
  const status = document.getElementById('regional-offer-status');
  if (status) {
    const count = [...regionalOffers.values()].filter(result => result.checked).length;
    status.textContent = !navigator.onLine ? 'Offline. In dieser Sitzung geladene, gültige Angebote bleiben sichtbar.' :
      offerCheckRunning ? 'Angebote werden geprüft …' :
      offerCheckError || (count ? 'Angebotsprüfung abgeschlossen. Treffer erscheinen direkt unter den Artikeln.' :
        'Offene Artikel werden automatisch geprüft.');
  }
}

function attachRegionalOffers(info, item, done) {
  if (done) return;
  const box = document.createElement('span');
  box.className = 'regional-offers';
  box.dataset.offerQuery = offerQueryKey(item.title);
  info.append(box);
}

function scheduleRegionalOfferCheck() {
  updateRegionalOfferBadges();
  clearTimeout(offerCheckTimer);
  offerCheckTimer = setTimeout(checkRegionalOffers, 700);
}

async function checkRegionalOffers() {
  if (offerCheckRunning || !navigator.onLine || document.hidden) return;
  offerCheckRunning = true;
  offerCheckError = '';
  updateRegionalOfferBadges();
  try {
    // Serial requests and caching avoid a request on every edit or market switch.
    const queries = [...new Set(items.filter(item => !item.done).map(item => offerQueryKey(item.title)))];
    for (const query of queries) {
      const previous = regionalOffers.get(query);
      if (previous && Date.now() - previous.attempt < (previous.failed ? 10 * 60 * 1000 : offerCacheDuration)) continue;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const params = new URLSearchParams({as: 'web', q: query, zipCode: '24145', limit: '100', offset: '0'});
        const response = await fetch('https://api.marktguru.de/api/v1/offers/search?' + params, {
          // Public browser client identifiers, verified on marktguru.de's unauthenticated
          // homepage on 2026-11-20. These are published by the provider in its web
          // boot configuration (apiKey/clientKey), not a user's account credentials.
          headers: {
            'x-apikey': '8Kk+pmbf7TgJ9nVj2cXeA7P5zBGv8iuutVVMRfOfvNE=',
            'x-clientkey': 'WU/RH+PMGDi+gkZer3WbMelt6zcYHSTytNB7VpTia90=',
            Accept: 'application/json'
          },
          signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer'
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        if (!Array.isArray(data.results)) throw new Error('Ungültige Antwort');
        regionalOffers.set(query, {offers: matchingRegionalOffers(data.results, query),
          checked: Date.now(), attempt: Date.now(), failed: false});
      } catch {
        regionalOffers.set(query, {...previous, offers: previous?.offers || [], attempt: Date.now(), failed: true});
        offerCheckError = 'Angebotsprüfung derzeit nicht erreichbar. Bitte später erneut versuchen.';
        break;
      } finally {
        clearTimeout(timeout);
      }
      updateRegionalOfferBadges();
    }
  } finally {
    offerCheckRunning = false;
    updateRegionalOfferBadges();
    if (!offerCheckError && items.some(item => !item.done && !regionalOffers.has(offerQueryKey(item.title)))) {
      scheduleRegionalOfferCheck();
    }
  }
}

window.addEventListener('online', scheduleRegionalOfferCheck);
window.addEventListener('offline', updateRegionalOfferBadges);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) scheduleRegionalOfferCheck();
});
setInterval(() => {
  if (!document.hidden) scheduleRegionalOfferCheck();
}, offerCacheDuration);
