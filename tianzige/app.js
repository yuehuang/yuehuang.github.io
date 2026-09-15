/* 田字格 / 米字格 字帖生成器 — 纯前端，无后端，不收集任何数据 */
(function () {
  'use strict';

  var CDN = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/';
  var SVGNS = 'http://www.w3.org/2000/svg';
  var MM = 96 / 25.4;
  var PAPER = { A4: { w: 210, h: 297, css: 'A4' }, A5: { w: 148, h: 210, css: 'A5' } };
  var DEFAULT_CHARS = '一二三上口耳目手日火田禾六七八十';

  var PRESETS = {
    /* 每字一行：范字 + 2 格描红 + 空格，一个字只练一行（省纸，当前默认） */
    one:  { autoPage: 1, label: '每字一行', perPage: 6, trace: 2, rows: 1, numbers: 0, pinyin: 1, strokes: 1, words: 1 },
    /* 描红练习：范字 + 3 格描红 × 2 行（刚起步、手还生的时候） */
    mo:   { autoPage: 1, label: '描红练习', perPage: 3, trace: 3, rows: 2, numbers: 0, pinyin: 1, strokes: 1, words: 1 },
    /* 笔顺分解：范字上标 ①②③，右侧笔顺条逐笔拆开 */
    bi:   { autoPage: 1, label: '笔顺分解', perPage: 3, trace: 0, rows: 2, numbers: 1, pinyin: 1, strokes: 1, words: 0 }
  };

  var cfg = {
    chars: DEFAULT_CHARS, preset: 'one', grid: 'tian', paper: 'A4', orient: 'portrait',
    perPage: 6, perRow: 10, cell: 15, gap: 1.6, trace: 2, rows: 1,
    numbers: 0, strokes: 1, pinyin: 1, words: 1, idioms: 1, autoPage: 1, autoCell: 0, strokeTrace: 0,
    headText: '写字练习', footText: '描红 → 临写 → 自查：这一笔是不是压在横中线上？'
  };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var el = function (tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  };
  var svgTag = function (t) { return document.createElementNS(SVGNS, t); };

  /* ---------------- 配置 <-> URL ---------------- */
  var NUMK = ['perPage', 'perRow', 'cell', 'trace', 'rows'], BOOLK = ['numbers', 'strokes', 'pinyin', 'words', 'idioms', 'autoPage', 'autoCell', 'strokeTrace'];
  function readURL() {
    var q = new URLSearchParams(location.search);
    if (q.has('chars')) cfg.chars = q.get('chars');
    if (q.has('preset') && PRESETS[q.get('preset')]) { cfg.preset = q.get('preset'); Object.assign(cfg, PRESETS[cfg.preset]); }
    if (q.has('grid')) cfg.grid = q.get('grid') === 'mi' ? 'mi' : 'tian';
    if (q.has('paper')) cfg.paper = PAPER[q.get('paper')] ? q.get('paper') : 'A4';
    if (q.has('orient')) cfg.orient = q.get('orient') === 'landscape' ? 'landscape' : 'portrait';
    if (q.has('gap')) cfg.gap = parseFloat(q.get('gap')) || cfg.gap;
    if (q.has('head')) cfg.headText = q.get('head');
    if (q.has('foot')) cfg.footText = q.get('foot');
    NUMK.forEach(function (k) {                      /* 注意：0 是合法值（描红 0 格），不能用 || */
      if (!q.has(k)) return;
      var v = parseInt(q.get(k), 10);
      if (!isNaN(v)) cfg[k] = Math.max(0, v);
    });
    BOOLK.forEach(function (k) { if (q.has(k)) cfg[k] = q.get(k) === '0' ? 0 : 1; });
  }
  function writeURL() {
    var q = new URLSearchParams();
    q.set('chars', cfg.chars); q.set('preset', cfg.preset); q.set('grid', cfg.grid);
    q.set('paper', cfg.paper); q.set('orient', cfg.orient); q.set('gap', cfg.gap);
    q.set('head', cfg.headText); q.set('foot', cfg.footText);
    NUMK.concat(BOOLK).forEach(function (k) { q.set(k, cfg[k]); });
    history.replaceState(null, '', location.pathname + '?' + q.toString());
  }
  function paperInfo() {
    var p = PAPER[cfg.paper];
    var w = cfg.orient === 'landscape' ? p.h : p.w;
    var h = cfg.orient === 'landscape' ? p.w : p.h;
    return { w: w, h: h, cw: w - 24, ch: h - 22 };     // 页边 12mm / 11mm
  }

  /* ---------------- 汉字数据 ---------------- */
  var cache = {};
  function loadChar(ch) {
    if (cache[ch]) return Promise.resolve(cache[ch]);
    if (window.HANZI && window.HANZI[ch]) return Promise.resolve(cache[ch] = { s: window.HANZI[ch].s, m: window.HANZI[ch].m });
    var key = 'hz_' + ch, v = null;
    try { v = localStorage.getItem(key); } catch (e) { }
    if (v) { try { var d = JSON.parse(v); return Promise.resolve(cache[ch] = { s: d.s, m: d.m }); } catch (e) { } }
    return fetch(CDN + encodeURIComponent(ch) + '.json')
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) {
        var o = { s: d.strokes, m: d.medians || [] };
        try { localStorage.setItem(key, JSON.stringify(o)); } catch (e) { }
        return cache[ch] = o;
      })
      .catch(function () { return cache[ch] = { s: null, m: [] }; });
  }

  /* ---------------- 格子 / 字形 ---------------- */
  var POS = { '左上': '左上', '中上': '上方', '右上': '右上', '左中': '左侧', '中中': '中间', '右中': '右侧', '左下': '左下', '中下': '下方', '右下': '右下' };
  function posName(x, y) {
    return POS[(x < 341 ? '左' : x < 683 ? '中' : '右') + (y < 341 ? '上' : y < 683 ? '中' : '下')];
  }
  function grid(w, mi) {
    w = w || 22;
    var g = svgTag('g');
    var rect = svgTag('rect');
    rect.setAttribute('x', w / 2); rect.setAttribute('y', w / 2);
    rect.setAttribute('width', 1024 - w); rect.setAttribute('height', 1024 - w);
    rect.setAttribute('fill', 'none'); rect.setAttribute('stroke', '#e0837f'); rect.setAttribute('stroke-width', w);
    g.appendChild(rect);
    var lines = [[512, 0, 512, 1024], [0, 512, 1024, 512]];
    if (mi) lines.push([0, 0, 1024, 1024], [1024, 0, 0, 1024]);     // 米字格：加两条对角线
    lines.forEach(function (a) {
      var l = svgTag('line');
      l.setAttribute('x1', a[0]); l.setAttribute('y1', a[1]); l.setAttribute('x2', a[2]); l.setAttribute('y2', a[3]);
      l.setAttribute('stroke', '#e8b7b4'); l.setAttribute('stroke-width', w * 0.7);
      l.setAttribute('stroke-dasharray', (w * 2.1) + ' ' + (w * 1.5));
      g.appendChild(l);
    });
    return g;
  }
  function glyph(strokes, fill, upto) {
    var g = svgTag('g');
    g.setAttribute('transform', 'translate(0,900) scale(1,-1)');
    (upto ? strokes.slice(0, upto) : strokes).forEach(function (d, i) {
      var p = svgTag('path');
      p.setAttribute('d', d);
      p.setAttribute('fill', upto ? (i === upto - 1 ? '#d0342c' : '#c8c8c8') : fill);
      g.appendChild(p);
    });
    return g;
  }
  /* 笔顺描红：第 step 格画前 step 笔，最新一笔深、之前的浅 */
  function glyphStep(strokes, step) {
    var g = svgTag('g');
    g.setAttribute('transform', 'translate(0,900) scale(1,-1)');
    strokes.slice(0, step).forEach(function (d, i) {
      var p = svgTag('path');
      p.setAttribute('d', d);
      p.setAttribute('fill', i === step - 1 ? '#f2adad' : '#f8dcdc');
      g.appendChild(p);
    });
    return g;
  }

  /* 笔画标号：空心圆圈 + 浅色数字 —— 不填充，不遮住笔画本体 */
  function numberLayer(medians) {
    var g = svgTag('g');
    (medians || []).forEach(function (med, i) {
      if (!med || !med.length) return;
      var x = med[0][0], y = 900 - med[0][1];
      var c = svgTag('circle');
      c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 98);
      c.setAttribute('fill', 'none');
      c.setAttribute('stroke', '#f0bdbd');
      c.setAttribute('stroke-width', '26');
      g.appendChild(c);
      var t = svgTag('text');
      t.setAttribute('x', x); t.setAttribute('y', y + 4);
      t.setAttribute('fill', '#d98b8b');
      t.setAttribute('stroke', '#ffffff');        // 白描边让数字压在笔画上也看得清（不是填充，不遮字）
      t.setAttribute('stroke-width', '22');
      t.setAttribute('paint-order', 'stroke');
      t.setAttribute('font-size', '132');
      t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'central');
      t.setAttribute('font-family', '-apple-system,sans-serif'); t.setAttribute('font-weight', '600');
      t.textContent = i + 1;
      g.appendChild(t);
    });
    return g;
  }

  function svgCell(data, mode, step) {
    var s = svgTag('svg');
    s.setAttribute('viewBox', '0 0 1024 1024');
    s.setAttribute('class', 'cell');
    s.appendChild(grid(cfg.grid === 'mi' ? 18 : 22, cfg.grid === 'mi'));
    if (data && data.s) {
      if (mode === 'model') {
        s.appendChild(glyph(data.s, '#1c1c1c'));
        if (cfg.numbers) s.appendChild(numberLayer(data.m));
      } else if (mode === 'trace') s.appendChild(glyph(data.s, '#f2adad'));
      else if (mode === 'step') s.appendChild(glyphStep(data.s, step));
    }
    return s;
  }
  /* ---------------- 单字块 ---------------- */
  function buildBlock(ch, data) {
    var info = (window.LESSON && window.LESSON[ch]) || null;
    var py = (info && info.py) || (window.PINYIN && window.PINYIN[ch]) || '';
    var names = (info && info.strokes) || null;
    var b = el('section', 'block');

    var head = el('div', 'bhead');
    var bi = el('div', 'binfo');
    var line1 = el('div');
    line1.appendChild(el('span', 'bchar', ch));
    if (cfg.pinyin && py) line1.appendChild(el('span', 'bpy', py));
    bi.appendChild(line1);

    var meta = el('div', 'bmeta');
    if (data.s) meta.appendChild(el('span', '', data.s.length + ' 画'));
    else meta.appendChild(el('span', 'warn', '（该字笔画数据未取到，需要联网一次）'));
    if (cfg.words && info && info.words && info.words.length) {
      meta.appendChild(el('span', '', ' · '));
      meta.appendChild(el('span', 'words', '组词：' + info.words.join('、')));
    }
    if (cfg.idioms && info && info.idioms && info.idioms.length) {
      meta.appendChild(el('span', '', ' · '));
      meta.appendChild(el('span', 'idioms', '成语：' + info.idioms.join('、')));
    }
    bi.appendChild(meta);
    head.appendChild(bi);

    if (cfg.strokes && data.s) {
      var strip = el('div', 'strip');
      data.s.forEach(function (_, i) {
        var item = el('div', 'sitem');
        var s = svgTag('svg');
        s.setAttribute('viewBox', '0 0 1024 1024');
        s.appendChild(grid(14, false));
        s.appendChild(glyph(data.s, null, i + 1));
        item.appendChild(s);
        var lb = el('div', 'lb');
        lb.appendChild(el('b', '', String(i + 1)));
        lb.appendChild(document.createTextNode(' ' + (names ? names[i] : '')));
        item.appendChild(lb);
        strip.appendChild(item);
      });
      head.appendChild(strip);
    }
    b.appendChild(head);

    var nStrokes = data.s ? data.s.length : 0;
    var stepMode = cfg.strokeTrace && nStrokes > 1;
    var traceN = stepMode ? Math.min(nStrokes, cfg.perRow) : Math.min(cfg.trace, cfg.perRow - 1);
    for (var r = 0; r < cfg.rows; r++) {
      var row = el('div', 'row');
      for (var c = 0; c < cfg.perRow; c++) {
        var mode = 'blank', step = 0;
        if (r === 0) {
          if (stepMode) { if (c < traceN) { mode = 'step'; step = c + 1; } }
          else if (c === 0) mode = 'model';
          else if (c <= traceN) mode = 'trace';
        }
        row.appendChild(svgCell(data, mode, step));   /* 第二行起一律空格，不再出现描红 */
      }
      b.appendChild(row);
    }

    return b;
  }

  /* ---------------- 分页 + 渲染 ---------------- */
  function cellMM(p) {
    p = p || paperInfo();
    if (!cfg.autoCell) return cfg.cell;
    var n = Math.max(1, cfg.perRow);
    return Math.max(8, (p.cw - (n - 1) * cfg.gap) / n);
  }
  function applyVars() {
    var p = paperInfo();
    var root = document.documentElement.style;
    root.setProperty('--cell', cellMM(p).toFixed(2) + 'mm');
    root.setProperty('--gap', cfg.gap + 'mm');
    root.setProperty('--strip', Math.max(7, Math.min(12, Math.round(cellMM(p) * 0.4))) + 'mm');
    root.setProperty('--pw', p.w + 'mm');
    root.setProperty('--ph', p.h + 'mm');
    var st = $('#pagestyle') || (function () { var e = document.createElement('style'); e.id = 'pagestyle'; document.head.appendChild(e); return e; })();
    st.textContent = '@page{size:' + PAPER[cfg.paper].css + ' ' + cfg.orient + ';margin:11mm 12mm}';
  }
  function syncLabels() {
    [['perPage', ''], ['perRow', ''], ['cell', 'mm'], ['gap', 'mm'], ['trace', ''], ['rows', '']].forEach(function (p) {
      var v = $('#' + p[0] + 'V'); if (v) v.textContent = cfg[p[0]] + p[1];
      var n = $('#' + p[0]);
      if (n && +n.value !== +cfg[p[0]]) n.value = cfg[p[0]];    // 自动调整后同步滑块位置
      if (n && p[0] === 'perPage') { n.disabled = !!cfg.autoPage; n.style.opacity = cfg.autoPage ? .45 : 1; }
      if (n && p[0] === 'trace') { n.disabled = !!cfg.strokeTrace; n.style.opacity = cfg.strokeTrace ? .45 : 1; }
    });
    var tv = $('#traceV'); if (tv) tv.textContent = cfg.strokeTrace ? '按笔顺' : cfg.trace;   /* 放在循环之后，别被覆盖 */
    $$('.seg[data-grid]').forEach(function (x) { x.classList.toggle('on', x.dataset.grid === cfg.grid); });
    $$('.preset').forEach(function (x) { x.classList.toggle('on', x.dataset.preset === cfg.preset); });
    $$('input[type=checkbox]').forEach(function (n) { if (n.id in cfg) n.checked = !!cfg[n.id]; });
    var p = paperInfo();
    var maxRow = cfg.autoCell ? 16 : Math.max(1, Math.floor((p.cw + cfg.gap) / (cfg.cell + cfg.gap)));
    $('#hintRow').textContent = cfg.autoCell
      ? '格子自动铺满：每格 ' + cellMM(p).toFixed(1) + 'mm（' + (cfg.perRow) + ' 格/行）'
      : (maxRow < 16 ? (cfg.paper + (cfg.orient === 'landscape' ? ' 横向' : ' 纵向') + ' 每行最多 ' + maxRow + ' 格') : '');
    var cn = $('#cell');
    if (cn) { cn.disabled = !!cfg.autoCell; cn.style.opacity = cfg.autoCell ? .45 : 1; }
    var cv = $('#cellV'); if (cv) cv.textContent = cfg.autoCell ? ('自动 ' + cellMM(p).toFixed(1) + 'mm') : (cfg.cell + 'mm');
  }
  function paint(blocks) {
    applyVars();
    var preview = $('#preview');
    preview.innerHTML = '';
    var measure = el('div', 'sheet measure');
    blocks.forEach(function (b) { measure.appendChild(b); });
    preview.appendChild(measure);

    var heights = blocks.map(function (b) {
      return b.getBoundingClientRect().height + parseFloat(getComputedStyle(b).marginBottom || 0);
    });
    var p = paperInfo();
    var budget = (p.ch - 10) * MM;                 // 再留 10mm 给页脚
    var titleH = 48;
    /* 纸张/格子变化后，「每页字数」自动收敛到放得下的最大值，而不是抛一堆警告 */
    var autoNote = '';
    if (heights.length) {
      var sample = heights.slice(0, Math.min(6, heights.length));
      var refH = Math.max.apply(null, sample) || 1;              // 用前几个字里最高的，避免低估
      var canFit = Math.max(1, Math.floor((budget - titleH) / refH));
      if (cfg.autoPage) {
        if (cfg.perPage !== canFit) { cfg.perPage = canFit; writeURL(); }
      } else if (cfg.perPage > canFit) {
        cfg.perPage = canFit; autoNote = '（已按纸张自动调到 ' + canFit + '）'; writeURL();
      }
    }
    var pages = [], cur = [], used = 0, forced = 0;
    blocks.forEach(function (b, i) {
      var h = heights[i];
      var lim = budget - (pages.length === 0 ? titleH : 0);
      var overH = cur.length && used + h > lim, overN = !cfg.autoPage && cur.length >= cfg.perPage;
      if (cur.length && (overH || overN)) {
        if (overH && !overN && !cfg.autoPage) forced++;
        pages.push({ items: cur, title: pages.length === 0 }); cur = []; used = 0;
      }
      cur.push(b); used += h;
    });
    if (cur.length) pages.push({ items: cur, title: pages.length === 0 });

    preview.innerHTML = '';
    var total = pages.length;
    pages.forEach(function (pg, pi) {
      var wrap = el('div', 'sheet-wrap');
      var sheet = el('div', 'sheet');
      if (true) {
        var t = el('div', 'sheettitle');
        t.appendChild(el('h1', '', cfg.headText || '写字练习'));
        t.appendChild(el('div', 'sub', '生字 ' + cfg.chars.replace(/[^一-龥]/g, '').length + ' 个 · '
          + (cfg.grid === 'mi' ? '米字格' : '田字格') + ' · ' + cfg.paper
          + (cfg.orient === 'landscape' ? ' 横向' : ' 纵向') + ' · 第 ' + (pi + 1) + ' / ' + total + ' 页'));
        sheet.appendChild(t);
      }
      pg.items.forEach(function (b) { sheet.appendChild(b); });
      if (cfg.footText) sheet.appendChild(el('div', 'sheetfoot', cfg.footText));
      wrap.appendChild(sheet);
      preview.appendChild(wrap);
    });
    var perPageTxt = cfg.perPage + ' 字';
    if (cfg.autoPage && pages.length) {
      var a1 = pages[0].items.length, a2 = pages.length > 1 ? pages[1].items.length : a1;
      perPageTxt = (a1 === a2 ? a1 : a1 + '~' + a2) + ' 字';
    }
    $('#count').textContent = '共 ' + total + ' 页 · 每页 ' + perPageTxt + (cfg.autoPage ? '（自动铺满）' : '') + autoNote
      + (forced ? '（有 ' + forced + ' 页高度不够，建议调小格子或减少行数）' : '');
    fit();
  }
  function fit() {
    var box = $('#preview');
    var s = Math.min(1, (box.clientWidth - 8) / (paperInfo().w * MM));
    document.documentElement.style.setProperty('--fit', s);
  }

  function render() {
    var chars = [];
    cfg.chars.replace(/[^一-龥]/g, '').split('').forEach(function (c) { if (chars.indexOf(c) < 0) chars.push(c); });
    var p = paperInfo();
    var maxRow = Math.max(3, Math.floor((p.cw + cfg.gap) / (cfg.cell + cfg.gap)));
    if (cfg.perRow > maxRow) cfg.perRow = maxRow;
    var n = $ ('#perRow'); if (n) { n.max = Math.min(16, Math.max(1, maxRow)); if (+n.value > maxRow) n.value = maxRow; }
    if (!chars.length) { $('#preview').innerHTML = '<p class="empty">请输入要练的生字</p>'; $('#count').textContent = ''; return; }
    $('#status').textContent = '正在准备字形…';
    Promise.all(chars.map(loadChar)).then(function (list) {
      var data = {};
      chars.forEach(function (c, i) { data[c] = list[i]; });
      paint(chars.map(function (c) { return buildBlock(c, data[c]); }));
      var fail = chars.filter(function (c) { return !data[c].s; });
      $('#status').textContent = fail.length ? '⚠ ' + fail.join('、') + ' 需要联网获取笔画数据'
        : '已生成 ' + chars.length + ' 个字';
      syncLabels();
    });
  }

  /* ---------------- 控件 ---------------- */
  function applyPreset(id, rerender) {
    cfg.preset = id;
    Object.assign(cfg, PRESETS[id]);
    if (rerender !== false) { onChange(); }
  }
  function bind() {
    [['perPage', 'perPage'], ['perRow', 'perRow'], ['cell', 'cell'], ['gap', 'gap'], ['trace', 'trace'], ['rows', 'rows']]
      .forEach(function (kv) {
        var n = $('#' + kv[1]);
        n.value = cfg[kv[0]];
        n.addEventListener('input', function () { cfg[kv[0]] = parseInt(n.value, 10); if (cfg.preset !== 'custom') cfg.preset = 'custom'; onChange(); });
      });
    BOOLK.forEach(function (k) {
      var n = $('#' + k); if (!n) return;
      n.checked = !!cfg[k];
      n.addEventListener('change', function () { cfg[k] = n.checked ? 1 : 0; cfg.preset = 'custom'; onChange(); });
    });
    $$('.preset').forEach(function (b) { b.addEventListener('click', function () { applyPreset(b.dataset.preset); }); });
    $$('.seg[data-grid]').forEach(function (b) { b.addEventListener('click', function () { cfg.grid = b.dataset.grid; onChange(); }); });
    $('#paper').value = cfg.paper;
    $('#paper').addEventListener('change', function () { cfg.paper = this.value; onChange(); });
    $('#orient').value = cfg.orient;
    $('#orient').addEventListener('change', function () { cfg.orient = this.value; onChange(); });
    $('#chars').value = cfg.chars;
    $('#chars').addEventListener('input', function () { cfg.chars = $('#chars').value; onChange(); });
    $('#headText').value = cfg.headText;
    $('#headText').addEventListener('input', function () { cfg.headText = this.value; onChange(); });
    $('#footText').value = cfg.footText;
    $('#footText').addEventListener('input', function () { cfg.footText = this.value; onChange(); });
    $('#print').addEventListener('click', function () { window.print(); });
    $('#copy').addEventListener('click', function () {
      var btn = this;
      (navigator.clipboard ? navigator.clipboard.writeText(location.href) : Promise.reject())
        .then(function () { btn.textContent = '✓ 已复制'; setTimeout(function () { btn.textContent = '复制分享链接'; }, 1500); })
        .catch(function () { prompt('复制这个链接：', location.href); });
    });
    window.addEventListener('resize', fit);
  }
  var timer = null;
  function onChange() { writeURL(); syncLabels(); clearTimeout(timer); timer = setTimeout(render, 160); }

  readURL();
  bind();
  syncLabels();
  render();
})();
