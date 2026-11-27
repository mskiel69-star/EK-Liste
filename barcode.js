'use strict';

let barcodeSession = 0;
let barcodeStream;
let barcodeControls;
let barcodeRequest;
let barcodeAccepting = false;
let barcodeCategory = 'Sonstiges';
let scannedBarcode = '';

function validShoppingBarcode(code) {
  if (!/^(?:\d{8}|\d{12,14})$/.test(code)) return false;
  const digits = [...code].map(Number);
  const check = digits.pop();
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 ? 1 : 3), 0);
  return (10 - sum % 10) % 10 === check;
}

function stopBarcodeCamera() {
  barcodeAccepting = false;
  barcodeControls?.stop();
  barcodeControls = undefined;
  barcodeStream?.getTracks().forEach(track => track.stop());
  barcodeStream = undefined;
  const video = $('barcode-video');
  video.pause();
  video.srcObject = null;
  video.hidden = true;
}

function closeBarcodeScanner() {
  barcodeSession++;
  barcodeRequest?.abort();
  stopBarcodeCamera();
  $('barcode-modal').style.display = 'none';
}

function openBarcodeScanner() {
  $('manual-input').blur();
  stopVoice();
  $('barcode-code').value = '';
  $('barcode-title').value = '';
  $('barcode-note').value = '';
  $('barcode-result').hidden = true;
  $('barcode-source').hidden = true;
  scannedBarcode = '';
  $('barcode-modal').style.display = 'flex';
  $('barcode-heading').focus();
  startBarcodeCamera();
}

async function startBarcodeCamera() {
  const session = ++barcodeSession;
  barcodeRequest?.abort();
  stopBarcodeCamera();
  $('barcode-result').hidden = true;
  $('barcode-source').hidden = true;
  scannedBarcode = '';
  if (!navigator.mediaDevices?.getUserMedia || !window.ZXingBrowser) {
    $('barcode-status').textContent = 'Die Kamera ist hier nicht verfügbar. Du kannst die Barcode-Nummer unten eingeben.';
    return;
  }
  $('barcode-status').textContent = 'Kamera wird gestartet. Bitte Kamerazugriff erlauben.';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false, video: {facingMode: {ideal: 'environment'}, width: {ideal: 1280}, height: {ideal: 720}}
    });
    if (session !== barcodeSession) {
      stream.getTracks().forEach(track => track.stop());
      return;
    }
    barcodeStream = stream;
    barcodeAccepting = true;
    const video = $('barcode-video');
    video.hidden = false;
    $('barcode-status').textContent = 'Halte den gesamten Strichcode ruhig und gut beleuchtet in die Kamera.';
    const reader = new ZXingBrowser.BrowserMultiFormatOneDReader(undefined, {
      delayBetweenScanAttempts: 250, delayBetweenScanSuccess: 1000
    });
    const controls = await reader.decodeFromStream(stream, video, result => {
      if (session !== barcodeSession || !barcodeAccepting || !result) return;
      const code = result.getText().trim();
      if (validShoppingBarcode(code)) lookupShoppingBarcode(code);
    });
    if (session !== barcodeSession || !barcodeAccepting) controls.stop();
    else barcodeControls = controls;
  } catch (error) {
    if (session !== barcodeSession) return;
    stopBarcodeCamera();
    $('barcode-status').textContent = error.name === 'NotAllowedError'
      ? 'Kamerazugriff wurde nicht erlaubt. Erlaube ihn in den Browser-Einstellungen oder gib den Barcode unten ein.'
      : 'Kamera konnte nicht gestartet werden. Du kannst die Barcode-Nummer unten eingeben.';
  }
}

async function lookupShoppingBarcode(value) {
  const code = String(value).replace(/\s+/g, '');
  if (!validShoppingBarcode(code)) {
    $('barcode-status').textContent = 'Bitte eine gültige EAN- oder UPC-Nummer mit Prüfziffer eingeben.';
    return;
  }
  const session = ++barcodeSession;
  barcodeRequest?.abort();
  stopBarcodeCamera();
  scannedBarcode = code;
  $('barcode-code').value = code;
  $('barcode-title').value = '';
  $('barcode-note').value = '';
  $('barcode-result').hidden = true;
  $('barcode-source').hidden = true;
  barcodeCategory = 'Sonstiges';
  const known = items.find(item => item.barcode === code);
  if (known) {
    $('barcode-title').value = known.title;
    $('barcode-note').value = known.note || '';
    barcodeCategory = known.category;
    $('barcode-result').hidden = false;
    $('barcode-status').textContent = 'Artikel aus deiner Liste erkannt. Prüfe die Angaben und übernimm ihn.';
    return;
  }
  $('barcode-status').textContent = 'Barcode ' + code + ' erkannt. Produkt wird gesucht …';
  const controller = new AbortController();
  barcodeRequest = controller;
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    if (!navigator.onLine) throw new Error('offline');
    const fields = 'code,product_name_de,product_name,brands,quantity';
    const response = await fetch('https://world.openfoodfacts.org/api/v2/product/' + code +
      '.json?fields=' + fields, {signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer'});
    if (!response.ok) throw new Error('lookup');
    const data = await response.json();
    if (session !== barcodeSession) return;
    const product = data.status === 1 ? data.product : null;
    const name = typeof product?.product_name_de === 'string' && product.product_name_de.trim()
      ? product.product_name_de : product?.product_name;
    if (typeof name !== 'string' || !name.trim()) throw new Error('unknown');
    $('barcode-title').value = name.trim().slice(0, 200);
    const extras = [product.brands, product.quantity].filter(value => typeof value === 'string' && value.trim());
    $('barcode-note').value = extras.join(' · ').slice(0, 200);
    barcodeCategory = categoryForTitle(name);
    const source = $('barcode-source');
    source.href = 'https://world.openfoodfacts.org/product/' + code;
    source.hidden = false;
    $('barcode-status').textContent = 'Produkt gefunden. Prüfe Name und Zusatz, bevor du es hinzufügst.';
  } catch (error) {
    if (session !== barcodeSession) return;
    $('barcode-status').textContent = error.message === 'unknown'
      ? 'Dieser Barcode ist noch nicht bekannt. Trage den Artikelnamen ein.'
      : 'Produktdaten gerade nicht abrufbar. Trage den Artikelnamen selbst ein oder versuche es später erneut.';
  } finally {
    clearTimeout(timeout);
    if (session === barcodeSession) {
      barcodeRequest = undefined;
      $('barcode-result').hidden = false;
    }
  }
}

function addScannedArticle(event) {
  event.preventDefault();
  const title = $('barcode-title').value.trim();
  if (!title || title.length > 200 || !validShoppingBarcode(scannedBarcode)) return;
  const note = $('barcode-note').value.trim();
  if (note.length > 200) return;
  const candidate = {title, note};
  const key = itemKey(candidate);
  const existing = items.find(item => itemKey(item) === key);
  const wasOpen = existing && !existing.done;
  if (existing) {
    pending.delete(existing.id);
    existing.done = false;
    existing.completedAt = null;
    existing.barcode = scannedBarcode;
  } else {
    const category = categoryForTitle(title);
    items.push({...candidate, id: uuid(), barcode: scannedBarcode, done: false, completedAt: null,
      category: category === 'Sonstiges' ? barcodeCategory : category, targetStore: null});
  }
  const saved = broadcastState();
  render();
  if (!saved) {
    $('barcode-status').textContent = 'Speichern fehlgeschlagen. Bitte erneut versuchen.';
    return;
  }
  closeBarcodeScanner();
  showEntryFeedback((wasOpen ? 'Bereits auf der Liste: ' : 'Auf die Liste gesetzt: ') + title);
}

// Closing via backdrop, Escape or backgrounding must release the camera too.
new MutationObserver(() => {
  if ($('barcode-modal').style.display !== 'flex') {
    barcodeSession++;
    barcodeRequest?.abort();
    stopBarcodeCamera();
  }
}).observe($('barcode-modal'), {attributes: true, attributeFilter: ['style']});
window.addEventListener('pagehide', closeBarcodeScanner);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && $('barcode-modal').style.display === 'flex') closeBarcodeScanner();
});
