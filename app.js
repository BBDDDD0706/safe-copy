// 모든 처리는 브라우저 안에서만 이루어진다. 네트워크 요청 없음.
const $ = (id) => document.getElementById(id);
const canvas = $('canvas');
const ctx = canvas.getContext('2d');
const MAX_SIDE = 4000;

const state = {
  img: null,        // 원본(필요 시 축소된) 이미지 캔버스
  masks: [],        // {x, y, w, h, mode} 이미지 좌표
  drag: null,       // 드래그 중인 영역
  color: '#d62828',
  maskMode: 'black',
};

$('date').value = new Date().toISOString().slice(0, 10);

// ---------- 이미지 불러오기 ----------
function loadFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    alert('이미지 파일(JPG, PNG, WEBP)만 사용할 수 있어요.');
    return;
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    state.img = c;
    state.masks = [];
    canvas.width = c.width;
    canvas.height = c.height;
    canvas.style.display = 'block';
    $('drop').style.display = 'none';
    render();
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    alert('이 사진은 열 수 없어요. 아이폰 HEIC 사진이라면 JPG로 바꿔서 올려 주세요.');
  };
  img.src = url;
}

$('pick').onclick = () => $('file').click();
$('another').onclick = () => $('file').click();
$('file').onchange = (e) => { loadFile(e.target.files[0]); e.target.value = ''; };

const stage = $('stage');
stage.addEventListener('dragover', (e) => { e.preventDefault(); $('drop').classList.add('over'); });
stage.addEventListener('dragleave', () => $('drop').classList.remove('over'));
stage.addEventListener('drop', (e) => {
  e.preventDefault();
  $('drop').classList.remove('over');
  loadFile(e.dataTransfer.files[0]);
});
document.addEventListener('paste', (e) => {
  const item = [...e.clipboardData.items].find((i) => i.type.startsWith('image/'));
  if (item) loadFile(item.getAsFile());
});

// ---------- 그리기 ----------
function watermarkText() {
  const d = $('date').value.replaceAll('-', '.');
  return [$('purpose').value.trim(), d, $('extra').value.trim()].filter(Boolean).join('  ·  ');
}

function drawMask(m) {
  const { x, y, w, h } = normRect(m);
  if (w < 1 || h < 1) return;
  if (m.mode === 'black') {
    ctx.fillStyle = '#000';
    ctx.fillRect(x, y, w, h);
    return;
  }
  const block = Math.max(10, Math.round(Math.max(canvas.width, canvas.height) / 40));
  const tw = Math.max(1, Math.ceil(w / block));
  const th = Math.max(1, Math.ceil(h / block));
  const tmp = document.createElement('canvas');
  tmp.width = tw;
  tmp.height = th;
  tmp.getContext('2d').drawImage(state.img, x, y, w, h, 0, 0, tw, th);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0, tw, th, x, y, w, h);
  ctx.imageSmoothingEnabled = true;
}

function drawWatermark() {
  const text = watermarkText();
  if (!text) return;
  const W = canvas.width, H = canvas.height;
  const fontSize = Math.max(12, Math.round(Math.max(W, H) * $('size').value / 100));
  const gapY = fontSize * $('density').value * 1.6;
  ctx.save();
  ctx.globalAlpha = +$('opacity').value;
  ctx.fillStyle = state.color;
  ctx.font = `700 ${fontSize}px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`;
  ctx.textBaseline = 'middle';
  const stepX = ctx.measureText(text).width + fontSize * 2;
  const diag = Math.hypot(W, H);
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-Math.PI / 7);
  let row = 0;
  for (let y = -diag / 2; y <= diag / 2; y += gapY, row++) {
    const offset = (row % 2) * stepX / 2;
    for (let x = -diag / 2 - stepX + offset; x <= diag / 2; x += stepX) {
      ctx.fillText(text, x, y);
    }
  }
  ctx.restore();
}

function render() {
  if (!state.img) return;
  ctx.drawImage(state.img, 0, 0);
  state.masks.forEach(drawMask);
  if (state.drag) drawMask(state.drag);
  drawWatermark();
  const has = state.masks.length > 0;
  $('undo').disabled = !has;
  $('clearMasks').disabled = !has;
  for (const id of ['dlJpg', 'dlPng', 'dlPdf', 'another']) $(id).disabled = false;
}

function normRect(m) {
  return {
    x: Math.round(Math.min(m.x, m.x + m.w)),
    y: Math.round(Math.min(m.y, m.y + m.h)),
    w: Math.round(Math.abs(m.w)),
    h: Math.round(Math.abs(m.h)),
  };
}

// ---------- 드래그로 가리기 ----------
function toImage(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * canvas.width / r.width,
    y: (e.clientY - r.top) * canvas.height / r.height,
  };
}
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  const p = toImage(e);
  state.drag = { x: p.x, y: p.y, w: 0, h: 0, mode: state.maskMode };
});
canvas.addEventListener('pointermove', (e) => {
  if (!state.drag) return;
  const p = toImage(e);
  state.drag.w = p.x - state.drag.x;
  state.drag.h = p.y - state.drag.y;
  render();
});
canvas.addEventListener('pointerup', () => {
  if (!state.drag) return;
  const r = normRect(state.drag);
  if (r.w > 3 && r.h > 3) state.masks.push({ ...r, mode: state.drag.mode });
  state.drag = null;
  render();
});

$('undo').onclick = () => { state.masks.pop(); render(); };
$('clearMasks').onclick = () => { state.masks = []; render(); };

// ---------- 설정 ----------
for (const id of ['purpose', 'date', 'extra', 'size', 'opacity', 'density']) {
  $(id).addEventListener('input', render);
}
document.querySelectorAll('[data-purpose]').forEach((b) => {
  b.onclick = () => { $('purpose').value = b.dataset.purpose; render(); };
});
function toggleGroup(attr, key) {
  const buttons = document.querySelectorAll(`[${attr}]`);
  buttons.forEach((b) => {
    b.onclick = () => {
      buttons.forEach((x) => x.classList.toggle('on', x === b));
      state[key] = b.getAttribute(attr);
      render();
    };
  });
}
toggleGroup('data-color', 'color');
toggleGroup('data-mask', 'maskMode');

// ---------- 저장 ----------
function fileName(ext) {
  const safe = `사본_${$('purpose').value}_${$('date').value}`.replace(/[\\/:*?"<>|\s]+/g, '_');
  return `${safe}.${ext}`;
}
function save(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$('dlJpg').onclick = () => canvas.toBlob((b) => save(b, fileName('jpg')), 'image/jpeg', 0.92);
$('dlPng').onclick = () => canvas.toBlob((b) => save(b, fileName('png')), 'image/png');
$('dlPdf').onclick = () => canvas.toBlob(async (b) => {
  const jpeg = new Uint8Array(await b.arrayBuffer());
  save(makePdf(jpeg, canvas.width, canvas.height), fileName('pdf'));
}, 'image/jpeg', 0.92);

// JPEG 한 장을 A4 한가운데에 넣은 PDF를 직접 만든다 (외부 라이브러리 없음).
function makePdf(jpeg, iw, ih) {
  const landscape = iw > ih;
  const PW = landscape ? 841.89 : 595.28;
  const PH = landscape ? 595.28 : 841.89;
  const margin = 28;
  const s = Math.min((PW - margin * 2) / iw, (PH - margin * 2) / ih);
  const dw = iw * s, dh = ih * s;
  const dx = (PW - dw) / 2, dy = (PH - dh) / 2;
  const content = `q ${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${dx.toFixed(2)} ${dy.toFixed(2)} cm /Im0 Do Q`;

  const enc = new TextEncoder();
  const parts = [];
  const offsets = [];
  let len = 0;
  const push = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };

  push('%PDF-1.4\n');
  const obj = (body) => { offsets.push(len); push(`${offsets.length} 0 obj\n${body}\nendobj\n`); };
  obj('<< /Type /Catalog /Pages 2 0 R >>');
  obj('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  offsets.push(len);
  push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${iw} /Height ${ih} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
  push(jpeg);
  push('\nendstream\nendobj\n');
  obj(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);

  const xref = len;
  push(`xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`);
  push(offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join(''));
  push(`trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts, { type: 'application/pdf' });
}
