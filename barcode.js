'use strict';

let barcodeSession = 0;
let barcodeStream;
let barcodeControls;
let barcodeRequest;
let barcodeAccepting = false;
let barcodeCategory = 'Sonstiges';
let scannedBarcode = '';
let barcodeHintTimer;
let barcodeZoomTimer;

function validShoppingBarcode(code) {
  if (!/^(?:\d{8}|\d{12,14})$/.test(code)) return false;
  const digits = [...code].map(Number);
  const check = digits.pop();
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 ? 1 : 3), 0);
  return (10 - sum % 10) % 10 === check;
}

function stopBarcodeCamera() {
  barcodeAccepting = false;
  clearTimeout(barcodeHintTimer);
  clearTimeout(barcodeZoomTimer);
  $('barcode-camera-tools').hidden = true;
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

function shoppingBarcodeReader() {
  const reader = new ZXingBrowser.BrowserMultiFormatReader(undefined, {
    delayBetweenScanAttempts: 200, delayBetweenScanSuccess: 1000
  });
  const formats = ZXingBrowser.BarcodeFormat;
  reader.possibleFormats = [formats.EAN_13, formats.EAN_8, formats.UPC_A, formats.CODE_128, formats.ITF];
  return reader;
}

async function configureBarcodeCamera(track) {
  let capabilities = {};
  try { capabilities = track.getCapabilities?.() || {}; } catch {}
  // Request autofocus only when the selected camera exposes it.
  if (capabilities.focusMode?.includes('continuous')) {
    try { await track.applyConstraints({advanced: [{focusMode: 'continuous'}]}); } catch {}
  }
  const zoom = capabilities.zoom;
  const slider = $('barcode-zoom');
  $('barcode-zoom-label').hidden = !(zoom && zoom.max > zoom.min);
  if (zoom && zoom.max > zoom.min) {
    slider.min = zoom.min;
    slider.max = Math.min(zoom.max, Math.max(zoom.min, 4));
    slider.step = zoom.step || 0.1;
    slider.value = track.getSettings?.().zoom || zoom.min;
  }
}

function changeBarcodeZoom() {
  const track = barcodeStream?.getVideoTracks()[0];
  if (!track) return;
  const zoom = Number($('barcode-zoom').value);
  clearTimeout(barcodeZoomTimer);
  barcodeZoomTimer = setTimeout(async () => {
    if (track !== barcodeStream?.getVideoTracks()[0]) return;
    try { await track.applyConstraints({advanced: [{zoom}]}); } catch {
      $('barcode-status').textContent = 'Der Zoom ist bei dieser Kamera nicht verfügbar. Halte den Artikel etwas weiter entfernt.';
    }
  }, 100);
}

async function startBarcodeCamera() {
  const session = ++barcodeSession;
  barcodeRequest?.abort();
  stopBarcodeCamera();
  $('barcode-result').hidden = true;
  $('barcode-source').hidden = true;
  scannedBarcode = '';
  if (!navigator.mediaDevices?.getUserMedia || !window.ZXingBrowser) {
    $('barcode-status').textContent = 'Die Kamera ist hier nicht verfügbar. Du kannst ein Barcode-Foto auswählen oder die Nummer unten eingeben.';
    return;
  }
  $('barcode-status').textContent = 'Kamera wird gestartet. Bitte Kamerazugriff erlauben.';
  let stream;
  try {
    const selected = $('barcode-camera').value;
    const videoConstraints = {
      width: {ideal: 1920}, height: {ideal: 1080},
      ...(selected ? {deviceId: {exact: selected}} : {facingMode: {ideal: 'environment'}})
    };
    stream = await navigator.mediaDevices.getUserMedia({audio: false, video: videoConstraints});
    if (session !== barcodeSession) {
      stream.getTracks().forEach(track => track.stop());
      return;
    }
    barcodeStream = stream;
    // On multi-camera iPhones the default environment device may be an ultra-wide lens.
    // Prefer the named standard back camera, and keep an explicit camera selector.
    let cameras = [];
    try { cameras = (await navigator.mediaDevices.enumerateDevices()).filter(device => device.kind === 'videoinput'); } catch {}
    if (session !== barcodeSession) return;
    const standardBack = cameras.find(camera => /^(back camera|rückkamera|hintere kamera)$/i.test(camera.label));
    if (!selected && standardBack && standardBack.deviceId !== stream.getVideoTracks()[0].getSettings?.().deviceId) {
      stream.getTracks().forEach(track => track.stop());
      stream = await navigator.mediaDevices.getUserMedia({audio: false, video: {
        ...videoConstraints, deviceId: {exact: standardBack.deviceId}
      }});
      if (session !== barcodeSession) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      barcodeStream = stream;
    }
    const track = stream.getVideoTracks()[0];
    const chooser = $('barcode-camera');
    chooser.replaceChildren();
    cameras.forEach((camera, index) => {
      const option = document.createElement('option');
      option.value = camera.deviceId;
      option.textContent = camera.label || 'Kamera ' + (index + 1);
      chooser.append(option);
    });
    chooser.value = track.getSettings?.().deviceId || selected;
    chooser.disabled = cameras.length < 2;
    await configureBarcodeCamera(track);
    if (session !== barcodeSession) return;
    $('barcode-camera-tools').hidden = false;
    barcodeAccepting = true;
    const video = $('barcode-video');
    video.hidden = false;
    const started = Date.now();
    let attempts = 0;
    $('barcode-status').textContent = 'Kamera aktiv. Halte den ganzen Strichcode waagerecht in die Bildmitte, etwa 15–25 cm entfernt.';
    barcodeHintTimer = setTimeout(() => {
      if (session === barcodeSession && barcodeAccepting) {
        $('barcode-status').textContent = 'Noch kein Barcode erkannt. Halte mehr Abstand, bis die Striche scharf sind. Nutze den Zoom, eine andere Kamera oder „Barcode-Foto aufnehmen“.';
      }
    }, 8000);
    const controls = await shoppingBarcodeReader().decodeFromStream(stream, video, result => {
      if (session !== barcodeSession || !barcodeAccepting) return;
      attempts++;
      if (result) {
        const code = result.getText().trim();
        if (validShoppingBarcode(code)) lookupShoppingBarcode(code);
        else $('barcode-status').textContent = 'Code erkannt, aber keine gültige EAN/UPC-Artikelnummer. Bitte den Produkt-Strichcode erfassen.';
      } else if (attempts === 1 && Date.now() - started < 8000) {
        $('barcode-status').textContent = 'Scanner läuft und prüft das Kamerabild. Ganzen Strichcode waagerecht in der Bildmitte halten.';
      }
    });
    if (session !== barcodeSession || !barcodeAccepting) controls.stop();
    else barcodeControls = controls;
  } catch (error) {
    if (session !== barcodeSession) {
      stream?.getTracks().forEach(track => track.stop());
      return;
    }
    stopBarcodeCamera();
    $('barcode-status').textContent = error.name === 'NotAllowedError'
      ? 'Kamerazugriff wurde nicht erlaubt. Erlaube ihn in den Browser-Einstellungen oder nutze ein Barcode-Foto.'
      : 'Kamera konnte nicht gestartet werden. Wähle eine andere Kamera oder nutze ein Barcode-Foto.';
    $('barcode-camera-tools').hidden = false;
  }
}

async function scanBarcodePhoto(input) {
  const file = input.files?.[0];
  if (!file) return;
  const session = ++barcodeSession;
  barcodeRequest?.abort();
  stopBarcodeCamera();
  $('barcode-result').hidden = true;
  $('barcode-source').hidden = true;
  $('barcode-status').textContent = 'Barcode-Foto wird geprüft …';
  let url;
  try {
    if (!file.size || file.size > 20 * 1024 * 1024) throw new Error('size');
    const image = new Image();
    url = URL.createObjectURL(file);
    image.src = url;
    await image.decode();
    if (session !== barcodeSession) return;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context || !image.naturalWidth || !image.naturalHeight) throw new Error('image');
    const scale = Math.min(1, 2000 / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const reader = shoppingBarcodeReader();
    let result;
    for (const rotated of [false, true]) {
      canvas.width = rotated ? height : width;
      canvas.height = rotated ? width : height;
      if (rotated) {
        context.translate(canvas.width, 0);
        context.rotate(Math.PI / 2);
      }
      context.drawImage(image, 0, 0, width, height);
      try {
        const candidate = reader.decodeFromCanvas(canvas).getText().trim();
        if (validShoppingBarcode(candidate)) { result = candidate; break; }
      } catch {}
    }
    if (session !== barcodeSession) return;
    if (result) await lookupShoppingBarcode(result);
    else $('barcode-status').textContent = 'Im Foto wurde kein gültiger Produktbarcode erkannt. Fotografiere ihn scharf mit etwas weißem Rand.';
  } catch (error) {
    if (session === barcodeSession) {
      $('barcode-status').textContent = error.message === 'size'
        ? 'Bitte ein Foto mit höchstens 20 MB auswählen.'
        : 'Foto konnte nicht gelesen werden. Versuche ein scharfes JPG- oder PNG-Foto.';
    }
  } finally {
    input.value = '';
    if (url) URL.revokeObjectURL(url);
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
