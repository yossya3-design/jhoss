/* Lector de correos para el visor del menú DPO: Outlook (.msg) y .eml.
   window.FxCorreo.parse(arrayBuffer, ext) -> { subject, from, to, cc, date, html, text, atts:[{name, mime, data:Uint8Array, cid, size}] } */
(function () {
  "use strict";
  var td16 = new TextDecoder("utf-16le"), td1252 = new TextDecoder("windows-1252"), td8 = new TextDecoder("utf-8");

  /* ---------- archivo compuesto (CFB) ---------- */
  function cfb(buf) {
    var u = new Uint8Array(buf), dv = new DataView(buf);
    if (dv.getUint32(0, true) !== 0xE011CFD0) throw new Error("no es un .msg");
    var ss = 1 << dv.getUint16(30, true), mss = 1 << dv.getUint16(32, true);
    var cutoff = dv.getUint32(56, true), dir0 = dv.getUint32(48, true), mfat0 = dv.getUint32(60, true), nmfat = dv.getUint32(64, true);
    var difat0 = dv.getUint32(68, true), ndifat = dv.getUint32(72, true), nfat = dv.getUint32(44, true);
    var off = function (s) { return (s + 1) * ss; };
    var fatSecs = [];
    for (var i = 0; i < 109 && fatSecs.length < nfat; i++) fatSecs.push(dv.getUint32(76 + i * 4, true));
    for (var d = difat0, n = 0; n < ndifat && d < 0xFFFFFFFA && fatSecs.length < nfat; n++) {
      for (var j = 0; j < ss / 4 - 1 && fatSecs.length < nfat; j++) fatSecs.push(dv.getUint32(off(d) + j * 4, true));
      d = dv.getUint32(off(d) + ss - 4, true);
    }
    var per = ss / 4, fat = new Uint32Array(fatSecs.length * per);
    fatSecs.forEach(function (s, k) { for (var q = 0; q < per; q++) fat[k * per + q] = dv.getUint32(off(s) + q * 4, true); });
    function chain(s, t) { var o = [], guard = 0; while (s < 0xFFFFFFFA && guard++ < 2e6) { o.push(s); s = t[s]; } return o; }
    function readBig(s, size) {
      var out = new Uint8Array(size), p = 0;
      chain(s, fat).forEach(function (x) { if (p >= size) return; var l = Math.min(ss, size - p); out.set(u.subarray(off(x), off(x) + l), p); p += l; });
      return out;
    }
    var dirBytes = (function () { var c = chain(dir0, fat), o = new Uint8Array(c.length * ss); c.forEach(function (x, k) { o.set(u.subarray(off(x), off(x) + ss), k * ss); }); return o; })();
    var ddv = new DataView(dirBytes.buffer), ents = [];
    for (var e = 0; e * 128 < dirBytes.length; e++) {
      var b = e * 128, nl = ddv.getUint16(b + 64, true);
      ents.push({ name: nl > 2 ? td16.decode(dirBytes.subarray(b, b + nl - 2)) : "", type: dirBytes[b + 66], l: ddv.getUint32(b + 68, true), r: ddv.getUint32(b + 72, true), c: ddv.getUint32(b + 76, true), start: ddv.getUint32(b + 116, true), size: ddv.getUint32(b + 120, true) });
    }
    var root = ents[0], mini = root.start < 0xFFFFFFFA ? readBig(root.start, root.size) : new Uint8Array(0);
    var mfat = new Uint32Array(0);
    if (nmfat && mfat0 < 0xFFFFFFFA) { var mf = readBig(mfat0, nmfat * ss), mdv = new DataView(mf.buffer); mfat = new Uint32Array(mf.length / 4); for (var z = 0; z < mfat.length; z++) mfat[z] = mdv.getUint32(z * 4, true); }
    function data(en) {
      if (en.size < cutoff) { var out = new Uint8Array(en.size), p = 0; chain(en.start, mfat).forEach(function (x) { if (p >= en.size) return; var l = Math.min(mss, en.size - p); out.set(mini.subarray(x * mss, x * mss + l), p); p += l; }); return out; }
      return readBig(en.start, en.size);
    }
    function children(en) {
      var o = {}, st = [en.c], seen = {};
      while (st.length) { var k = st.pop(); if (k >= 0xFFFFFFFA || seen[k] || !ents[k]) continue; seen[k] = 1; var x = ents[k]; o[x.name] = x; st.push(x.l, x.r); }
      return o;
    }
    return { root: root, children: children, data: data };
  }

  /* ---------- propiedades MAPI ---------- */
  function props(f, st, top) {
    var kids = f.children(st), P = {};
    Object.keys(kids).forEach(function (n) {
      var m = /^__substg1\.0_([0-9A-F]{4})([0-9A-F]{4})$/i.exec(n); if (!m || kids[n].type !== 2) return;
      var id = m[1].toUpperCase(), t = m[2].toUpperCase(), b = f.data(kids[n]);
      P[id] = t === "001F" ? td16.decode(b).replace(/\0+$/, "") : t === "001E" ? td1252.decode(b).replace(/\0+$/, "") : b;
    });
    var pv = kids["__properties_version1.0"];
    if (pv) {
      var b = f.data(pv), dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
      for (var o = top ? 32 : 8; o + 16 <= b.length; o += 16) {
        var type = dv.getUint16(o, true), id = ("000" + dv.getUint16(o + 2, true).toString(16).toUpperCase()).slice(-4);
        if (type === 0x40) { var lo = dv.getUint32(o + 8, true), hi = dv.getUint32(o + 12, true), ms = (hi * 4294967296 + lo) / 1e4 - 11644473600000; if (ms > 0) P[id] = new Date(ms); }
        else if (type === 3 || type === 0xB) P[id] = dv.getInt32(o + 8, true);
      }
    }
    return { P: P, kids: kids };
  }

  /* ---------- RTF comprimido (LZFu) ---------- */
  var PRE = "{\\rtf1\\ansi\\mac\\deff0\\deftab720{\\fonttbl;}{\\f0\\fnil \\froman \\fswiss \\fmodern \\fscript \\fdecor MS Sans SerifSymbolArialTimes New RomanCourier{\\colortbl\\red0\\green0\\blue0\r\n\\par \\pard\\plain\\f0\\fs20\\b\\i\\u\\tab\\tx";
  function lzfu(b) {
    var dv = new DataView(b.buffer, b.byteOffset, b.byteLength), comp = dv.getUint32(0, true), raw = dv.getUint32(4, true), magic = dv.getUint32(8, true);
    if (magic === 0x414C454D) return b.subarray(16, 16 + raw);
    var dict = new Uint8Array(4096), w = 0, out = [], end = Math.min(b.length, comp + 4);
    for (; w < PRE.length; w++) dict[w] = PRE.charCodeAt(w);
    var p = 16;
    while (p < end && out.length < raw) {
      var flags = b[p++];
      for (var bit = 0; bit < 8 && p < end && out.length < raw; bit++) {
        if (flags & (1 << bit)) {
          var ref = (b[p] << 8) | b[p + 1]; p += 2;
          var at = ref >> 4, len = (ref & 15) + 2;
          if (at === w) return new Uint8Array(out);
          for (var k = 0; k < len; k++) { var c = dict[(at + k) & 4095]; out.push(c); dict[w] = c; w = (w + 1) & 4095; }
        } else { var c2 = b[p++]; out.push(c2); dict[w] = c2; w = (w + 1) & 4095; }
      }
    }
    return new Uint8Array(out);
  }

  /* ---------- HTML encapsulado en RTF (\fromhtml) ---------- */
  function rtfHtml(bytes) {
    var s = td1252.decode(bytes);
    if (!/\\fromhtml1/.test(s.slice(0, 400))) return null;
    var out = "", i = 0, n = s.length, st = [{ skip: false, ht: false, uc: 1 }], cur = st[0], htmlrtf = false, pend = [];
    function flush() { if (pend.length) { out += td1252.decode(new Uint8Array(pend)); pend = []; } }
    function emit(t) { if (cur.skip || (htmlrtf && !cur.ht)) return; flush(); out += t; }
    function emitByte(v) { if (cur.skip || (htmlrtf && !cur.ht)) return; pend.push(v); }
    while (i < n) {
      var ch = s[i];
      if (ch === "{") { flush(); cur = { skip: cur.skip, ht: cur.ht, uc: cur.uc, first: true }; st.push(cur); i++; continue; }
      if (ch === "}") { flush(); st.pop(); cur = st[st.length - 1] || { skip: false, ht: false, uc: 1 }; i++; continue; }
      if (ch === "\\") {
        var nx = s[i + 1];
        if (nx === "\\" || nx === "{" || nx === "}") { emit(nx); i += 2; cur.first = false; continue; }
        if (nx === "'") { emitByte(parseInt(s.substr(i + 2, 2), 16)); i += 4; cur.first = false; continue; }
        if (nx === "*") { cur.star = true; i += 2; continue; }
        if (nx === "~") { emit(" "); i += 2; continue; }
        if (nx === "\r" || nx === "\n") { i += 2; continue; }
        var m = /^\\([a-zA-Z]+)(-?\d+)? ?/.exec(s.slice(i, i + 40));
        if (!m) { i += 2; continue; }
        i += m[0].length;
        var w = m[1], v = m[2] == null ? null : +m[2], wasFirst = cur.first; cur.first = false;
        if (w === "htmltag") { cur.ht = true; cur.skip = false; continue; }
        if (w === "htmlrtf") { htmlrtf = v !== 0; continue; }
        if (wasFirst && (cur.star || /^(fonttbl|colortbl|stylesheet|info|pict|object|themedata|colorschememapping|latentstyles|datastore|xmlnstbl|listtable|listoverridetable|rsidtbl|generator|mmathPr)$/.test(w))) { cur.skip = true; continue; }
        if (w === "par" || w === "line") { emit("\r\n"); continue; }
        if (w === "tab") { emit("\t"); continue; }
        if (w === "lquote") { emit("‘"); continue; } if (w === "rquote") { emit("’"); continue; }
        if (w === "ldblquote") { emit("“"); continue; } if (w === "rdblquote") { emit("”"); continue; }
        if (w === "bullet") { emit("•"); continue; } if (w === "endash") { emit("–"); continue; } if (w === "emdash") { emit("—"); continue; }
        if (w === "uc") { cur.uc = v || 0; continue; }
        if (w === "u") { emit(String.fromCharCode(v < 0 ? v + 65536 : v)); for (var k = 0; k < cur.uc && i < n; k++) { if (s[i] === "\\" && s[i + 1] === "'") i += 4; else if (s[i] === "\\" || s[i] === "{" || s[i] === "}") break; else i++; } continue; }
        continue;
      }
      if (ch === "\r" || ch === "\n") { i++; continue; }
      cur.first = false; emitByte(s.charCodeAt(i) & 255); i++;
    }
    flush();
    return out;
  }

  /* ---------- .msg ---------- */
  function parseMsg(buf) {
    var f = cfb(buf), top = props(f, f.root, true), P = top.P;
    var r = { subject: P["0037"] || P["0E1D"] || "", from: P["0C1A"] || P["0042"] || "", fromMail: P["5D01"] || P["0C1F"] || P["0065"] || "", to: P["0E04"] || "", cc: P["0E03"] || "", date: P["0E06"] || P["0039"] || null, text: typeof P["1000"] === "string" ? P["1000"] : "", html: "", atts: [] };
    if (!/@/.test(r.fromMail)) r.fromMail = "";
    var h = P["1013"]; if (h) r.html = typeof h === "string" ? h : td8.decode(h);
    if (!r.html && P["1009"] && P["1009"].length > 16) { try { r.html = rtfHtml(lzfu(P["1009"])) || ""; } catch (e) { } }
    Object.keys(top.kids).forEach(function (n) {
      if (!/^__attach_version1\.0_/.test(n)) return;
      var a = props(f, top.kids[n], false).P, data = a["3701"];
      if (!(data instanceof Uint8Array)) return;
      r.atts.push({ name: a["3707"] || a["3704"] || a["3001"] || "adjunto", mime: a["370E"] || "", cid: (a["3712"] || "").replace(/^<|>$/g, ""), data: data, size: data.length, hidden: a["7FFE"] === 1 });
    });
    return r;
  }

  /* ---------- .eml ---------- */
  function qp(s) { return s.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/gi, function (_, h) { return String.fromCharCode(parseInt(h, 16)); }); }
  function bytesOf(bin) { var u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i) & 255; return u; }
  function decTxt(u, cs) { try { return new TextDecoder(cs || "utf-8").decode(u); } catch (e) { return td8.decode(u); } }
  function words(s) { return (s || "").replace(/=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi, function (_, cs, e, t) { var bin = e.toUpperCase() === "B" ? atob(t) : qp(t.replace(/_/g, " ")); return decTxt(bytesOf(bin), cs); }).replace(/\?=\s+=\?/g, ""); }
  function head(txt) {
    var i = txt.search(/\r?\n\r?\n/), hs = i < 0 ? txt : txt.slice(0, i), body = i < 0 ? "" : txt.slice(i).replace(/^\r?\n\r?\n/, ""), H = {};
    hs.replace(/\r?\n[ \t]+/g, " ").split(/\r?\n/).forEach(function (l) { var m = /^([^:]+):\s*(.*)$/.exec(l); if (m) H[m[1].toLowerCase()] = m[2]; });
    return { H: H, body: body };
  }
  function part(txt, r) {
    var p = head(txt), ct = p.H["content-type"] || "text/plain", enc = (p.H["content-transfer-encoding"] || "").toLowerCase();
    var bm = /boundary="?([^";]+)"?/i.exec(ct);
    if (/^multipart\//i.test(ct) && bm) { p.body.split("--" + bm[1]).slice(1).forEach(function (x) { if (!/^--/.test(x)) part(x.replace(/^\r?\n/, ""), r); }); return; }
    var bin = enc === "base64" ? atob(p.body.replace(/\s+/g, "")) : enc === "quoted-printable" ? qp(p.body) : p.body, u = bytesOf(bin);
    var cs = (/charset="?([^";]+)"?/i.exec(ct) || [])[1], disp = p.H["content-disposition"] || "", fn = (/(?:file)?name\*?="?([^";]+)"?/i.exec(disp) || /name="?([^";]+)"?/i.exec(ct) || [])[1];
    var mime = ct.split(";")[0].trim().toLowerCase();
    if (!fn && mime === "text/html" && !r.html) r.html = decTxt(u, cs);
    else if (!fn && mime === "text/plain" && !r.text) r.text = decTxt(u, cs);
    else r.atts.push({ name: words(fn || "adjunto"), mime: mime, cid: (p.H["content-id"] || "").replace(/^<|>$/g, ""), data: u, size: u.length });
  }
  function parseEml(buf) {
    var txt = td1252.decode(new Uint8Array(buf)), p = head(txt), H = p.H, r = { subject: words(H.subject), from: words(H.from), fromMail: "", to: words(H.to), cc: words(H.cc), date: H.date ? new Date(H.date) : null, html: "", text: "", atts: [] };
    part(txt, r);
    return r;
  }

  window.FxCorreo = { parse: function (buf, ext) { return ext === "eml" ? parseEml(buf) : parseMsg(buf); } };
})();
