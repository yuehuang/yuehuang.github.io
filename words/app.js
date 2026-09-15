/* 英语单词卡 · 背 + 默写（纯前端，不收集数据） */
(function () {
  'use strict';
  var MM = 96 / 25.4, SVGNS = 'http://www.w3.org/2000/svg';
  var PAGE_H = 273 * MM;                    // A4 去掉上下页边
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var el = function (t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };

  var cfg = {
    words: '', mode: 'card', cols: 2, rows: 3,
    ipa: 1, pos: 1, syl: 1, zh: 1, en: 1, cn: 1,  // 卡片显示项
    hintZh: 1, hintIpa: 1, hintBlank: 1,        // 默写纸提示
    shuffle: 0, headText: '英语单词卡', footText: '',
    qdir: 'en2zh'                             // 出题方向：en2zh 看英文想中文 / zh2en 看中文想英文
  };
  var WK = 'words_wrong_v1';                  // 生词本（存本机浏览器）
  var BOOLK = ['ipa', 'pos', 'syl', 'zh', 'en', 'cn', 'hintZh', 'hintIpa', 'hintBlank', 'shuffle'];
  var NUMK = ['cols', 'rows'];

  function readURL() {
    var q = new URLSearchParams(location.search);
    if (q.has('words')) cfg.words = q.get('words');
    if (q.has('mode')) cfg.mode = q.get('mode');
    if (q.has('qdir')) cfg.qdir = q.get('qdir');
    NUMK.forEach(function (k) { if (q.has(k)) { var v = parseInt(q.get(k), 10); if (!isNaN(v)) cfg[k] = v; } });
    BOOLK.forEach(function (k) { if (q.has(k)) cfg[k] = q.get(k) === '0' ? 0 : 1; });
    if (q.has('head')) cfg.headText = q.get('head');
    if (q.has('foot')) cfg.footText = q.get('foot');
  }
  function writeURL() {
    var q = new URLSearchParams();
    q.set('words', cfg.words); q.set('mode', cfg.mode); q.set('qdir', cfg.qdir);
    NUMK.concat(BOOLK).forEach(function (k) { q.set(k, cfg[k]); });
    q.set('head', cfg.headText); q.set('foot', cfg.footText);
    history.replaceState(null, '', location.pathname + '?' + q.toString());
  }

  /* ---------- 查词：内置示例词表 → 离线词典 → 联网补音标 ---------- */
  var netCache = {};
  function lookup(w) {
    var k = w.toLowerCase();
    if (window.UNIT1 && window.UNIT1[k]) {
      var u = window.UNIT1[k];
      return Promise.resolve({ w: w, ipa: u.ipa, pos: u.pos || '', syl: u.syl, zh: u.zh, en: u.en, cn: u.cn, src: 'unit' });
    }
    var e = window.ENZH && window.ENZH[k];
    if (e) return Promise.resolve({ w: w, ipa: e[0], pos: e[1] || '', syl: '', zh: e[2] || '', en: '', cn: '', src: 'dict' });
    if (netCache[k]) return Promise.resolve(netCache[k]);
    return fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(k))
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) {
        var p = (d[0].phonetics || []).filter(function (x) { return x.text; })[0];
        var o = { w: w, ipa: (p && p.text) || '', pos: '', syl: '', zh: '', en: '', cn: '', src: 'net' };
        netCache[k] = o; return o;
      })
      .catch(function () { var o = { w: w, ipa: '', pos: '', syl: '', zh: '', en: '', cn: '', src: 'none' }; netCache[k] = o; return o; });
  }
  function parseWords() {
    var out = [];
    cfg.words.split(/[\n,，、;；\t]+/).forEach(function (x) {
      x = x.trim().replace(/[^A-Za-z' \-]/g, '').trim();
      if (!x) return;
      x.split(/\s+/).forEach(function (w) {
        if (w && out.indexOf(w) < 0) out.push(w);
      });
    });
    if (cfg.shuffle) for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)); var t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  /* ---------- 生词本（本机 localStorage，不上传）---------- */
  function wrongList() { try { return JSON.parse(localStorage.getItem(WK) || '[]'); } catch (e) { return []; } }
  function setWrong(arr) { try { localStorage.setItem(WK, JSON.stringify(arr)); } catch (e) { } updateWrongUI(); }
  function addWrong(w) { var a = wrongList(); if (a.indexOf(w) < 0) { a.push(w); setWrong(a); } }
  function updateWrongUI() {
    var n = wrongList().length;
    var c = $('#wrongCount'); if (c) c.textContent = n ? ('生词本：' + n + ' 个') : '生词本：空';
  }

  /* ---------- 练习模式（抽认卡，答错自动进生词本）---------- */
  var quiz = { list: [], i: 0, right: 0, wrong: [], revealed: false };
  function startQuiz(items) {
    quiz = { list: items.slice(), i: 0, right: 0, wrong: [], revealed: false };
    drawQuiz();
  }
  function drawQuiz() {
    var stage = $('#preview'); stage.innerHTML = '';
    var box = el('div', 'quiz');
    if (!quiz.list.length) { box.appendChild(el('p', 'empty', '没有要练的词，先在上面填词表')); stage.appendChild(box); return; }

    if (quiz.i >= quiz.list.length) {                       // 一轮结束
      var done = el('div', 'qdone');
      done.appendChild(el('h2', '', '这一轮结束'));
      done.appendChild(el('p', 'qstat', '认识 ' + quiz.right + ' 个 · 生词 ' + quiz.wrong.length + ' 个'
        + (quiz.wrong.length ? '：' + quiz.wrong.join('、') : '')));
      if (quiz.wrong.length) {
        var b1 = el('button', 'btn primary', '只练这 ' + quiz.wrong.length + ' 个生词');
        b1.addEventListener('click', function () { startQuiz(quiz.wrong.map(function (w) { return { w: w }; })); });
        var b2 = el('button', 'btn', '把生词做成默写纸');
        b2.addEventListener('click', function () {
          cfg.words = quiz.wrong.join('\n'); cfg.mode = 'dictate';
          $('#words').value = cfg.words; syncLabels(); onChange();
        });
        done.appendChild(el('div', 'qbtns')).appendChild(b1);
        var bb = done.querySelector('.qbtns'); bb.appendChild(b2);
      }
      var b3 = el('button', 'btn', '再练一遍全部');
      b3.addEventListener('click', function () { startQuiz(quiz.list); });
      done.appendChild(el('div', 'qbtns')).appendChild(b3);
      box.appendChild(done);
      box.appendChild(el('p', 'qhint', '答错的词已经自动记进「生词本」了，下次可以一键只练它们。'));
      stage.appendChild(box); fit(); return;
    }

    var it = quiz.list[quiz.i];
    box.appendChild(el('div', 'qprog', '第 ' + (quiz.i + 1) + ' / ' + quiz.list.length + ' 个'
      + '　·　认识 ' + quiz.right + ' · 生词 ' + quiz.wrong.length));

    var en2zh = cfg.qdir === 'en2zh';
    var prompt = el('div', 'qprompt');
    if (en2zh) {
      prompt.appendChild(writingBlock(it.w, 21));         // 看英文：单词压在四线三格上
    } else {
      prompt.appendChild(el('div', 'qtext', it.zh || it.w));   // 看中文：只给中文
      prompt.appendChild(writingBlock('', 21));                // 下面留空的四线三格，让孩子写
    }
    box.appendChild(prompt);

    if (quiz.revealed) {
      var ans = el('div', 'qans on');
      if (!en2zh) ans.appendChild(writingBlock(it.w, 21));     // 中→英：答案给带线的单词
      var qi = el('div', 'wiparow');
      if (it.ipa) qi.appendChild(el('span', 'qipa', '/' + it.ipa.replace(/^\/|\/$/g, '') + '/'));
      qi.appendChild(spkBtn(it.w));                       // 喇叭跟着音标（中→英时不会提前泄题）
      ans.appendChild(qi);
      var l3 = el('div', 'qpos');
      if (it.pos) l3.appendChild(el('span', 'posTag', it.pos));
      if (it.zh) l3.appendChild(el('span', 'qzh', it.zh));
      if (l3.childNodes.length) ans.appendChild(l3);
      if (it.syl) ans.appendChild(el('div', 'qsyl', it.syl.replace(/·/g, ' · ')));
      if (it.en) ans.appendChild(el('div', 'qen', it.en));
      if (it.cn) ans.appendChild(el('div', 'qcn', it.cn));
      box.appendChild(ans);
    } else {
      box.appendChild(el('div', 'qmask', '想好了吗？点下面「看答案」'));
    }

    var btns = el('div', 'qbtns');
    if (!quiz.revealed) {
      var bs = el('button', 'btn primary', '看答案');
      bs.addEventListener('click', function () { quiz.revealed = true; drawQuiz(); });
      btns.appendChild(bs);
    }
    var bno = el('button', 'btn', '❌ 不会');
    bno.addEventListener('click', function () { quiz.wrong.push(it.w); addWrong(it.w); quiz.i++; quiz.revealed = false; drawQuiz(); });
    var byes = el('button', 'btn ok', '✅ 认识');
    byes.addEventListener('click', function () { quiz.right++; quiz.i++; quiz.revealed = false; drawQuiz(); });
    btns.appendChild(bno); btns.appendChild(byes);
    box.appendChild(btns);
    box.appendChild(el('p', 'qhint', '家长拿手机点就行；答错的自动进生词本。'));
    stage.appendChild(box); fit();
  }

  /* ---------- 朗读（屏幕用，不打印）---------- */
  var audioCache = {};
  function speak(w) {
    var k = w.toLowerCase();
    if (audioCache[k] === undefined && navigator.onLine !== false) {
      audioCache[k] = null;
      fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(k))
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          var a = d && (d[0].phonetics || []).filter(function (x) { return x.audio; })[0];
          if (a) audioCache[k] = a.audio;
        }).catch(function () { });
    }
    if (audioCache[k]) { try { new Audio(audioCache[k]).play(); return; } catch (e) { } }
    speakTTS(w);
  }
  function speakTTS(w) {
    if (!('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(w);
      u.lang = 'en-US'; u.rate = 0.8;
      var v = (speechSynthesis.getVoices() || []).filter(function (x) { return /^en/i.test(x.lang); })[0];
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) { }
  }
  function spkBtn(w) {
    var b = el('button', 'spk no-print', '🔊');
    b.title = '朗读 ' + w;
    b.addEventListener('click', function (e) { e.stopPropagation(); speak(w); });
    return b;
  }

  /* ---------- 四线三格 + 单词（英文书写参考线）---------- */
  var NS = 'http://www.w3.org/2000/svg';
  function writingBlock(word, fs) {
    /* 关键：线距由字号反推 —— 中间一格的净空 = 字体 x-height（Times ≈ 0.447 em），
       这样 a/c/e/m/n/o… 的头顶正好贴第 2 条线，底坐在第 3 条线（基线）上。 */
    var XR = 0.460;   // Times New Roman 实测 x-height/em（用 canvas 量的）
    fs = fs || 21;
    var W = 100, sp = fs * XR, top = sp * 0.75, H = top + 3 * sp + sp * 0.35;
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    s.setAttribute('class', 'wlines');
    var st = [
      { w: 1.2, c: '#8ea4bc', dash: '' },          // ① 顶线：粗
      { w: 0.6, c: '#cbd6e2', dash: '' },          // ② x-height 线：细（字母头顶贴这条）
      { w: 0.7, c: '#e0a458', dash: '3.4 2.6' },   // ③ 基线：细 · 虚线 · 暖橙
      { w: 1.2, c: '#8ea4bc', dash: '' }           // ④ 底线：粗
    ];
    st.forEach(function (k, i) {
      var y = top + i * sp, l = document.createElementNS(NS, 'line');
      l.setAttribute('x1', 3); l.setAttribute('x2', W - 3);
      l.setAttribute('y1', y); l.setAttribute('y2', y);
      l.setAttribute('stroke', k.c); l.setAttribute('stroke-width', k.w);
      if (k.dash) l.setAttribute('stroke-dasharray', k.dash);
      s.appendChild(l);
    });
    if (word) {
      var t = document.createElementNS(NS, 'text');
      t.setAttribute('x', W / 2);
      t.setAttribute('y', top + 2 * sp);               // 基线压在第 3 条线上
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('font-size', fs.toFixed(2));
      t.setAttribute('font-family', '"Times New Roman",Times,Georgia,serif');
      t.setAttribute('fill', '#1c1c1c');
      t.textContent = word;
      s.appendChild(t);
    }
    return s;
  }
  var writingH = function (fs) { var sp = fs * 0.460; return (sp * 0.75 + 3 * sp + sp * 0.35) / 100; };  // 高度/宽度比

  /* ---------- 三种输出 ---------- */
  function cardItem(it, fs) {
    var c = el('div', 'wcard');
    c.appendChild(writingBlock(it.w, fs));             // ① 单词 + 四线三格（全篇统一字号）
    var ipaRow = el('div', 'wiparow');                 // ② 音标（喇叭就放它右边）
    if (cfg.ipa && it.ipa) ipaRow.appendChild(el('span', 'wipa', '/' + it.ipa.replace(/^\/|\/$/g, '') + '/'));
    ipaRow.appendChild(spkBtn(it.w));
    c.appendChild(ipaRow);
    var l3 = el('div', 'wpos');
    if (cfg.pos && it.pos) l3.appendChild(el('span', 'posTag', it.pos));
    if (cfg.zh && it.zh) l3.appendChild(el('span', 'wzh', it.zh));
    if (l3.childNodes.length) c.appendChild(l3);
    if (cfg.syl && it.syl) c.appendChild(el('div', 'wsylBig', it.syl.replace(/·/g, ' · ')));  // ④ 音节
    if (cfg.en && it.en) c.appendChild(el('div', 'wen', it.en));  // ⑤ 例句
    if (cfg.cn && it.cn) c.appendChild(el('div', 'wcn', it.cn));
    if (it.src === 'net') c.appendChild(el('div', 'wtip', '音标来自联网'));
    if (it.src === 'none') c.appendChild(el('div', 'wtip', '词典未收录'));
    return c;
  }
  function dictItem(it, i) {
    var b = el('div', 'ditem');
    var head = el('div', 'dhead');
    head.appendChild(el('span', 'dno', String(i + 1)));
    if (cfg.hintZh && it.zh) head.appendChild(el('span', 'dzh', it.zh));
    if (cfg.hintIpa && it.ipa) head.appendChild(el('span', 'dipa', '/' + it.ipa.replace(/^\/|\/$/g, '') + '/'));
    head.appendChild(spkBtn(it.w));
    b.appendChild(head);
    if (it.en) {
      var s = el('div', 'dsen');
      if (cfg.hintBlank && it.en.toLowerCase().indexOf(it.w.toLowerCase()) >= 0) {
        var re = new RegExp('(' + it.w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'i');
        it.en.split(re).forEach(function (p) {
          if (re.test(p) && p.toLowerCase() === it.w.toLowerCase()) s.appendChild(el('u', 'blank', '　　　　'));
          else s.appendChild(document.createTextNode(p));
        });
        if (it.cn) s.appendChild(el('span', 'dcn', '（' + it.cn + '）'));
      } else {
        s.appendChild(document.createTextNode(it.en));
        if (it.cn) s.appendChild(el('span', 'dcn', '（' + it.cn + '）'));
      }
      b.appendChild(s);
    }
    b.appendChild(writingBlock('', 12));   // 默写纸：格子按一页 6 个词定高
    return b;
  }
  function listRow(it, i) {
    var t = el('tr');
    t.appendChild(el('td', 'c', String(i + 1)));
    t.appendChild(el('td', 'zh', it.zh || ''));
    t.appendChild(el('td', 'en', it.w));
    t.appendChild(el('td', 'ipa', it.ipa ? '/' + it.ipa.replace(/^\/|\/$/g, '') + '/' : ''));
    t.appendChild(el('td', 'sp', ''));
    return t;
  }

  function render() {
    var words = parseWords();
    var stage = $('#preview');
    if (!words.length) { stage.innerHTML = '<p class="empty">请在上面填词表</p>'; $('#count').textContent = ''; return; }
    $('#status').textContent = '正在查词…';
    Promise.all(words.map(lookup)).then(function (items) {
      if (cfg.mode === 'quiz') { $('#status').textContent = items.length + ' 个词'; $('#count').textContent = '练习模式（不打印）'; startQuiz(items); return; }
      var pages = [], sheet = null, addSheet = function () {
        sheet = el('div', 'sheet');
        var t = el('div', 'sheettitle');
        t.appendChild(el('h1', '', cfg.headText || '英语单词卡'));
        t.appendChild(el('div', 'sub', '共 ' + items.length + ' 词 · 第 ' + (pages.length + 1) + ' 页 · '
          + ({ card: '单词卡', dictate: '默写纸', list: '听写表' })[cfg.mode]));
        sheet.appendChild(t); pages.push(sheet);
      };
      if (cfg.mode === 'card') {
        /* 统一字号：按最长单词算，全篇一致 */
        var maxLen = Math.max.apply(null, items.map(function (x) { return x.w.length; }));
        var fsUni = Math.min(24, (100 - 12) / (maxLen * 0.5));

        /* 用自动高度先量一遍，拿到卡片真实内容高度（不再靠猜） */
        var probe = el('div', 'wgrid probe');
        probe.style.gridTemplateColumns = 'repeat(' + cfg.cols + ',1fr)';
        items.forEach(function (it) { probe.appendChild(cardItem(it, fsUni)); });
        document.body.appendChild(probe);
        var contentH = 0;
        Array.prototype.forEach.call(probe.children, function (c) {
          contentH = Math.max(contentH, c.getBoundingClientRect().height);
        });
        document.body.removeChild(probe);

        var gapPx = 3 * MM, availPx = (275 - 26 - 8) * MM;      // 页面可用高度
        var rowsFit = Math.max(1, Math.floor((availPx + gapPx) / (contentH + gapPx)));
        var rowNote = '';
        if (cfg.rows > rowsFit) {
          cfg.rows = rowsFit; rowNote = '（行数已按卡片实际高度自动收到 ' + rowsFit + ' 行）';
          var rs = $('#rows'); if (rs) { rs.value = rowsFit; }
        }
        /* 卡片高度：不低于内容高度；行数少时均分整页，卡片更舒展 */
        var cardH = Math.max(contentH, (availPx - (cfg.rows - 1) * gapPx) / cfg.rows);
        var perPage = cfg.cols * cfg.rows;
        for (var i = 0; i < items.length; i++) {
          if (i % perPage === 0) addSheet();
          var grid = sheet.querySelector('.wgrid');
          if (!grid) {
            grid = el('div', 'wgrid');
            grid.style.gridTemplateColumns = 'repeat(' + cfg.cols + ',1fr)';
            grid.style.gap = '3mm';
            grid.style.setProperty('--cardh', cardH.toFixed(1) + 'px');
            sheet.appendChild(grid);
          }
          grid.appendChild(cardItem(items[i], fsUni));
        }
        if (rowNote) setTimeout(function () { }, 0);
        $('#rowNote') && ($('#rowNote').textContent = rowNote);
      } else if (cfg.mode === 'dictate') {
        var perD = 6;
        items.forEach(function (it, i) {
          if (i % perD === 0) addSheet();
          sheet.appendChild(dictItem(it, i));
        });
      } else {
        var perL = 16;
        items.forEach(function (it, i) {
          if (i % perL === 0) {
            addSheet();
            var tb = el('table', 'wtable');
            var thead = el('thead'); var tr = el('tr');
            ['#', '中文（家长念）', 'English（答案）', '音标', '孩子写'].forEach(function (h) { tr.appendChild(el('th', '', h)); });
            thead.appendChild(tr); tb.appendChild(thead);
            tb.appendChild(el('tbody')); sheet.appendChild(tb);
            sheet._tb = tb.querySelector('tbody');
          }
          sheet._tb.appendChild(listRow(it, i));
        });
      }
      var wrap = stage;
      wrap.innerHTML = '';
      pages.forEach(function (p) { var w = el('div', 'sheet-wrap'); w.appendChild(p); wrap.appendChild(w); });
      if (cfg.footText) pages.forEach(function (p) { p.appendChild(el('div', 'sheetfoot', cfg.footText)); });
      $('#count').textContent = '共 ' + pages.length + ' 页 · ' + items.length + ' 个词' + (typeof rowNote !== 'undefined' ? rowNote : '');
      var miss = items.filter(function (x) { return x.src === 'none' || x.src === 'net'; }).length;
      $('#status').textContent = miss ? ('已生成 ' + items.length + ' 个词（' + miss + ' 个不在离线词典，已联网补/待补）') : ('已生成 ' + items.length + ' 个词');
      fit();
    });
  }
  function fit() {
    var s = Math.min(1, ($('#preview').clientWidth - 8) / (210 * MM));
    document.documentElement.style.setProperty('--fit', s);
  }

  /* ---------- 控件 ---------- */
  function syncLabels() {
    NUMK.forEach(function (k) { var v = $('#' + k + 'V'); if (v) v.textContent = cfg[k]; });
    $$('.seg[data-mode]').forEach(function (b) { b.classList.toggle('on', b.dataset.mode === cfg.mode); });
    updateWrongUI();
    $$('input[type=checkbox]').forEach(function (n) { if (n.id in cfg) n.checked = !!cfg[n.id]; });
    document.body.dataset.mode = cfg.mode;
  }
  function bind() {
    var ta = $('#words');
    ta.value = cfg.words;
    ta.addEventListener('input', function () { cfg.words = this.value; onChange(); });
    $$('.seg[data-mode]').forEach(function (b) { b.addEventListener('click', function () { cfg.mode = b.dataset.mode; onChange(); }); });
    NUMK.forEach(function (k) { var n = $('#' + k); n.value = cfg[k]; n.addEventListener('input', function () { cfg[k] = parseInt(this.value, 10); onChange(); }); });
    BOOLK.forEach(function (k) { var n = $('#' + k); if (!n) return; n.checked = !!cfg[k]; n.addEventListener('change', function () { cfg[k] = this.checked ? 1 : 0; onChange(); }); });
    $('#headText').value = cfg.headText;
    $('#headText').addEventListener('input', function () { cfg.headText = this.value; onChange(); });
    $('#footText').value = cfg.footText;
    $('#footText').addEventListener('input', function () { cfg.footText = this.value; onChange(); });
    $('#demo').addEventListener('click', function () { cfg.words = DEMO; $('#words').value = DEMO; onChange(); });
    $('#shuffleNow').addEventListener('click', function () { var w = parseWords(); cfg.shuffle = 0; $('#shuffle').checked = false;
      for (var i = w.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = w[i]; w[i] = w[j]; w[j] = t; }
      cfg.words = w.join('\n'); $('#words').value = cfg.words; onChange(); });
    var qd = $('#qdir');
    qd.value = cfg.qdir;
    qd.addEventListener('change', function () { cfg.qdir = this.value; onChange(); });
    $('#wrongPractice').addEventListener('click', function () {
      var a = wrongList(); if (!a.length) return alert('生词本还是空的：先用「练习」模式过一遍，答错的词会自动进来。');
      cfg.words = a.join('\n'); cfg.mode = 'quiz'; $('#words').value = cfg.words; syncLabels(); onChange();
    });
    $('#wrongCopy').addEventListener('click', function () {
      var a = wrongList(); if (!a.length) return alert('生词本是空的');
      (navigator.clipboard ? navigator.clipboard.writeText(a.join('\n')) : Promise.reject())
        .then(function () { alert('已复制 ' + a.length + ' 个生词'); }).catch(function () { prompt('生词本：', a.join('\n')); });
    });
    $('#wrongClear').addEventListener('click', function () {
      if (confirm('清空生词本？')) setWrong([]);
    });
    $('#print').addEventListener('click', function () { window.print(); });
    var panel = $('.panel'), bd = $('#backdrop');
    function closePanel() { panel.classList.remove('open'); bd.classList.remove('on'); }
    $('#togglePanel').addEventListener('click', function () {
      panel.classList.toggle('open'); bd.classList.toggle('on');
    });
    bd.addEventListener('click', closePanel);
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });
    $('#copy').addEventListener('click', function () { var b = this;
      (navigator.clipboard ? navigator.clipboard.writeText(location.href) : Promise.reject())
        .then(function () { b.textContent = '✓ 已复制'; setTimeout(function () { b.textContent = '复制分享链接'; }, 1500); })
        .catch(function () { prompt('复制这个链接：', location.href); }); });
    window.addEventListener('resize', fit);
  }
  var DEMO = (window.UNIT1 ? Object.keys(window.UNIT1) : ['family', 'mother', 'father']).join('\n');
  var t = null;
  function onChange() {
    try { localStorage.setItem('words_last', cfg.words); } catch (e) { }
    writeURL(); syncLabels(); clearTimeout(t); t = setTimeout(render, 150);
  }

  readURL();
  if (!cfg.words) { try { cfg.words = localStorage.getItem('words_last') || ''; } catch (e) { } }
  if (!cfg.words) cfg.words = DEMO;
  bind(); syncLabels(); render();
})();
