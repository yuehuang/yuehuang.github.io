/* 田字格练习生成器 — 纯前端，无后端，不收集任何数据 */
(function () {
  'use strict';

  var CDN = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/';
  var SVGNS = 'http://www.w3.org/2000/svg';
  var MM = 96 / 25.4;                       // 1mm ≈ 3.7795px
  var PAGE_H = 275 * MM;                    // A4 297 - 上下各 11mm 页边
  var DEFAULT_CHARS = '一二三上口耳目手日火田禾六七八十';

  var cfg = {
    chars: DEFAULT_CHARS, perPage: 3, perRow: 7, cell: 24,
    trace: 3, rows: 2, strokes: 1, tips: 1, pinyin: 1, words: 1, title: 1
  };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var el = function (tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  };

  /* ---------------- 配置 <-> URL ---------------- */
  function readURL() {
    var q = new URLSearchParams(location.search);
    if (q.has('chars')) cfg.chars = q.get('chars');
    ['perPage', 'perRow', 'cell', 'trace', 'rows'].forEach(function (k) {
      if (q.has(k)) cfg[k] = Math.max(1, parseInt(q.get(k), 10) || cfg[k]);
    });
    ['strokes', 'tips', 'pinyin', 'words', 'title'].forEach(function (k) {
      if (q.has(k)) cfg[k] = q.get(k) === '0' ? 0 : 1;
    });
  }
  function writeURL() {
    var q = new URLSearchParams();
    q.set('chars', cfg.chars);
    ['perPage', 'perRow', 'cell', 'trace', 'rows', 'strokes', 'tips', 'pinyin', 'words', 'title']
      .forEach(function (k) { q.set(k, cfg[k]); });
    history.replaceState(null, '', location.pathname + '?' + q.toString());
  }

  /* ---------------- 汉字数据 ---------------- */
  var cache = {};
  function loadChar(ch) {
    if (cache[ch]) return Promise.resolve(cache[ch]);
    if (window.HANZI && window.HANZI[ch]) {
      return Promise.resolve(cache[ch] = { s: window.HANZI[ch].s, m: window.HANZI[ch].m, src: 'local' });
    }
    var key = 'hz_' + ch, v = null;
    try { v = localStorage.getItem(key); } catch (e) { }
    if (v) { try { var d = JSON.parse(v); return Promise.resolve(cache[ch] = { s: d.s, m: d.m, src: 'cache' }); } catch (e) { } }
    return fetch(CDN + encodeURIComponent(ch) + '.json')
      .then(function (r) { if (!r.ok) throw new Error('404'); return r.json(); })
      .then(function (d) {
        var o = { s: d.strokes, m: d.medians || [], src: 'cdn' };
        try { localStorage.setItem(key, JSON.stringify(o)); } catch (e) { }
        return cache[ch] = o;
      })
      .catch(function () { return cache[ch] = { s: null, m: [], src: 'fail' }; });
  }

  /* ---------------- SVG 组装 ---------------- */
  var POS = { '左上': '左上', '中上': '上方', '右上': '右上', '左中': '左侧', '中中': '中间', '右中': '右侧', '左下': '左下', '中下': '下方', '右下': '右下' };
  function posName(x, y) {
    var c = x < 341 ? '左' : x < 683 ? '中' : '右';
    var r = y < 341 ? '上' : y < 683 ? '中' : '下';
    return POS[c + r];
  }
  function grid(w) {
    w = w || 22;
    var g = document.createElementNS(SVGNS, 'g');
    var rect = document.createElementNS(SVGNS, 'rect');
    rect.setAttribute('x', w / 2); rect.setAttribute('y', w / 2);
    rect.setAttribute('width', 1024 - w); rect.setAttribute('height', 1024 - w);
    rect.setAttribute('fill', 'none'); rect.setAttribute('stroke', '#e0837f'); rect.setAttribute('stroke-width', w);
    g.appendChild(rect);
    [[512, 0, 512, 1024], [0, 512, 1024, 512]].forEach(function (a) {
      var l = document.createElementNS(SVGNS, 'line');
      l.setAttribute('x1', a[0]); l.setAttribute('y1', a[1]); l.setAttribute('x2', a[2]); l.setAttribute('y2', a[3]);
      l.setAttribute('stroke', '#e8b7b4'); l.setAttribute('stroke-width', w * 0.7);
      l.setAttribute('stroke-dasharray', (w * 2.1) + ' ' + (w * 1.5));
      g.appendChild(l);
    });
    return g;
  }
  function glyph(strokes, fill, upto) {
    var g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('transform', 'translate(0,900) scale(1,-1)');
    var list = (upto ? strokes.slice(0, upto) : strokes);
    list.forEach(function (d, i) {
      var p = document.createElementNS(SVGNS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('fill', upto ? (i === upto - 1 ? '#d0342c' : '#c8c8c8') : fill);
      g.appendChild(p);
    });
    return g;
  }
  function svgCell(data, mode, cls) {
    var s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 1024 1024');
    s.setAttribute('class', 'cell ' + (cls || ''));
    s.appendChild(grid());
    if (data && data.s && mode === 'model') s.appendChild(glyph(data.s, '#1c1c1c'));
    if (data && data.s && mode === 'trace') s.appendChild(glyph(data.s, '#f2adad'));
    return s;
  }
  function autoTip(data) {
    if (!data.m || !data.m.length) return '';
    return data.m.map(function (med, i) {
      var a = med[0], b = med[med.length - 1];
      var from = posName(a[0], 900 - a[1]), to = posName(b[0], 900 - b[1]);
      return '第' + (i + 1) + '笔：从' + from + '起笔，到' + to + '收笔';
    }).join('；');
  }

  /* ---------------- 生成一页 ---------------- */
  function buildBlock(ch, data) {
    var info = (window.LESSON && window.LESSON[ch]) || null;
    var py = (info && info.py) || (window.PINYIN && window.PINYIN[ch]) || '';
    var names = (info && info.strokes) || null;
    var b = el('section', 'block');

    /* 头部 */
    var head = el('div', 'bhead');
    var big = document.createElementNS(SVGNS, 'svg');
    big.setAttribute('viewBox', '0 0 1024 1024'); big.setAttribute('class', 'bglyph');
    if (data.s) big.appendChild(glyph(data.s, '#1c1c1c'));
    head.appendChild(big);

    var bi = el('div', 'binfo');
    var line1 = el('div');
    line1.appendChild(el('span', 'bchar', ch));
    if (cfg.pinyin && py) line1.appendChild(el('span', 'bpy', py));
    bi.appendChild(line1);
    var meta = el('div', 'bmeta');
    if (data.s) {
      meta.appendChild(el('span', '', data.s.length + ' 画'));
      if (names) {
        meta.appendChild(el('span', '', ' · 笔顺：'));
        meta.appendChild(el('span', 'order', names.join(' → ')));
      }
    } else {
      meta.appendChild(el('span', 'warn', '（该字笔画数据未取到，需要联网一次）'));
    }
    if (cfg.words && info && info.words && info.words.length) {
      meta.appendChild(el('span', '', ' · '));
      meta.appendChild(el('span', 'words', '组词：' + info.words.join('、')));
    }
    bi.appendChild(meta);
    head.appendChild(bi);

    if (cfg.strokes && data.s) {
      var strip = el('div', 'strip');
      data.s.forEach(function (_, i) {
        var item = el('div', 'sitem');
        var s = document.createElementNS(SVGNS, 'svg');
        s.setAttribute('viewBox', '0 0 1024 1024');
        s.appendChild(grid(14));
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

    /* 练习行 */
    var traceN = Math.min(cfg.trace, cfg.perRow - 1);
    for (var r = 0; r < cfg.rows; r++) {
      var row = el('div', 'row');
      for (var c = 0; c < cfg.perRow; c++) {
        var mode = 'blank';
        if (r === 0) mode = c === 0 ? 'model' : (c <= traceN ? 'trace' : 'blank');
        else mode = c < traceN ? 'trace' : 'blank';
        row.appendChild(svgCell(data, mode));
      }
      b.appendChild(row);
    }

    /* 占格提示 */
    if (cfg.tips) {
      var tip = info && info.tip ? info.tip : autoTip(data);
      var f = el('div', 'bfoot');
      if (tip) {
        f.appendChild(el('span', 'tipk', '占格：'));
        f.appendChild(document.createTextNode(tip));
        if (!(info && info.tip)) f.appendChild(el('span', 'badge', '自动生成·仅供参考'));
      }
      b.appendChild(f);
    }
    return b;
  }

  /* ---------------- 分页 + 渲染 ---------------- */
  function syncLabels() {
    [['perPage', ''], ['perRow', ''], ['cell', 'mm'], ['trace', ''], ['rows', '']].forEach(function (p) {
      var v = $('#' + p[0] + 'V'); if (v) v.textContent = cfg[p[0]] + p[1];
    });
  }

  function paint(blocks) {
    document.documentElement.style.setProperty('--cell', cfg.cell + 'mm');
    var preview = $('#preview');
    preview.innerHTML = '';
    var measure = el('div', 'sheet measure');
    blocks.forEach(function (b) { measure.appendChild(b); });
    preview.appendChild(measure);

    var heights = blocks.map(function (b) {
      var cs = getComputedStyle(b);
      return b.getBoundingClientRect().height + parseFloat(cs.marginBottom || 0);
    });

    var pages = [], cur = [], used = 0, budget = PAGE_H - 39;   // 39px 留给页脚
    var titleH = cfg.title ? 48 : 0, forced = 0;
    blocks.forEach(function (b, i) {
      var h = heights[i];
      var lim = budget - (pages.length === 0 ? titleH : 0);
      var overH = cur.length && used + h > lim;            // 高度放不下
      var overN = cur.length >= cfg.perPage;               // 超过「每页字数」
      if (cur.length && (overH || overN)) {
        if (overH && !overN) forced++;                     // 想放 N 个但高度不够
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
      if (pg.title && cfg.title) {
        var t = el('div', 'sheettitle');
        t.appendChild(el('h1', '', '田字格写字练习'));
        t.appendChild(el('div', 'sub', '语文一年级上册 · 生字 ' + cfg.chars.length + ' 个 · 第 ' + (pi + 1) + ' / ' + total + ' 页'));
        sheet.appendChild(t);
      }
      pg.items.forEach(function (b) { sheet.appendChild(b); });
      var ft = el('div', 'sheetfoot', '描红 → 临写 → 自查：这一笔是不是压在横中线上？');
      sheet.appendChild(ft);
      wrap.appendChild(sheet);
      preview.appendChild(wrap);
    });
    $('#count').textContent = '共 ' + total + ' 页'
      + (forced ? '（有 ' + forced + ' 页因高度不够少放了 1 个字，可调小格子或减少行数）' : '')
      + ' · 每页 ' + cfg.perPage + ' 字';
    fit();
  }

  function fit() {
    var box = $('#preview');
    var avail = box.clientWidth - 8;
    var s = Math.min(1, avail / (210 * MM));
    document.documentElement.style.setProperty('--fit', s);
  }

  function render() {
    var chars = [];
    cfg.chars.replace(/[^一-龥]/g, '').split('').forEach(function (c) {
      if (chars.indexOf(c) < 0) chars.push(c);
    });
    if (!chars.length) { $('#preview').innerHTML = '<p class="empty">请输入要练的生字</p>'; return; }
    $('#status').textContent = '正在准备字形…';
    Promise.all(chars.map(loadChar)).then(function (list) {
      var data = {};
      chars.forEach(function (c, i) { data[c] = list[i]; });
      var blocks = chars.map(function (c) { return buildBlock(c, data[c]); });
      paint(blocks);
      var fail = chars.filter(function (c) { return !data[c].s; });
      $('#status').textContent = fail.length
        ? '⚠ ' + fail.join('、') + ' 的笔画数据需要联网获取，其余已生成'
        : '已生成 ' + chars.length + ' 个字的练习页';
    });
  }

  /* ---------------- 控件 ---------------- */
  function bind() {
    var map = { perPage: 'perPage', perRow: 'perRow', cell: 'cell', trace: 'trace', rows: 'rows' };
    Object.keys(map).forEach(function (k) {
      var n = $('#' + map[k]);
      n.value = cfg[k];
      n.addEventListener('input', function () { cfg[k] = parseInt(n.value, 10); onChange(); });
    });
    ['strokes', 'tips', 'pinyin', 'words', 'title'].forEach(function (k) {
      var n = $('#' + k);
      n.checked = !!cfg[k];
      n.addEventListener('change', function () { cfg[k] = n.checked ? 1 : 0; onChange(); });
    });
    $('#chars').value = cfg.chars;
    $('#chars').addEventListener('input', function () { cfg.chars = $('#chars').value; onChange(); });
    $('#print').addEventListener('click', function () { window.print(); });
    $('#copy').addEventListener('click', function () {
      var btn = this;
      navigator.clipboard.writeText(location.href).then(function () {
        btn.textContent = '✓ 链接已复制'; setTimeout(function () { btn.textContent = '复制分享链接'; }, 1500);
      }).catch(function () { prompt('复制这个链接：', location.href); });
    });
    window.addEventListener('resize', fit);
  }
  var t = null;
  function onChange() {
    writeURL();
    syncLabels();
    clearTimeout(t);
    t = setTimeout(render, 180);
  }

  readURL();
  bind();
  syncLabels();
  render();
})();
