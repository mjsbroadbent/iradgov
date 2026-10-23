/* Office of the Governor of the ISEZ: portal script. Header, footer, language, and the data-driven pages.
   Content files: /data/press.json, /data/documents.json, /data/addresses.json. Exchange rate: Bank of Irad daily feed. */
(function () {
  "use strict";
  var I = window.GOV_I18N;
  var LANGS = ["en", "ir", "ru"];
  var RATE_FEED = "https://iradone.com/data/today.json";
  var RATE_FALLBACK = 8.4;
  var SERVICES = "https://e-irad.org/";

  var LANG = "en";
  try { var saved = localStorage.getItem("iradgov_lang"); if (LANGS.indexOf(saved) >= 0) LANG = saved; } catch (e) {}
  var qs = new URLSearchParams(location.search);
  if (LANGS.indexOf(qs.get("lang")) >= 0) LANG = qs.get("lang");

  var PAGE = document.body.getAttribute("data-page") || "";
  var cache = {};
  var origHTML = new WeakMap();

  /* ---------- helpers ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fill(s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] != null ? v[k] : m; }); }
  function t(k, v) { var d = I.ui[LANG] || {}; var s = d[k] != null ? d[k] : I.ui.en[k]; return s == null ? k : (v ? fill(s, v) : s); }
  function tri(o) { if (o == null) return ""; if (typeof o === "string") return o; return o[LANG] || o.en || ""; }
  function hasLang(o) { return o && typeof o === "object" && o[LANG] != null && o[LANG] !== ""; }
  function ymd(s) { var p = String(s).split("-"); return { y: +p[0], m: +p[1], d: +p[2] }; }
  function fmtDate(s, short) {
    var p = ymd(s), M = I.ui[LANG].months;
    if (LANG === "ru") return p.d + " " + M[p.m - 1] + (short ? "" : " " + p.y);
    if (LANG === "ir") return p.d + "-" + M[p.m - 1] + (short ? "" : " " + p.y);
    return p.d + " " + M[p.m - 1] + (short ? "" : " " + p.y);
  }
  function numDate(s) { var p = ymd(s); return (p.d < 10 ? "0" : "") + p.d + "-" + (p.m < 10 ? "0" : "") + p.m + "-" + p.y; }
  function iradNow() { var n = new Date(); return new Date(n.getTime() + n.getTimezoneOffset() * 60000 + 6 * 3600000); }
  function iradToday() { var d = iradNow(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function getJSON(url) {
    if (!cache[url]) cache[url] = fetch(url, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
    return cache[url];
  }
  function fmtNum(x, dp) {
    var s = Number(x).toFixed(dp == null ? 2 : dp);
    if (LANG === "ru" || LANG === "ir") s = s.replace(".", ",");
    return s;
  }

  /* ---------- icons ---------- */
  var IC = {
    services: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="18" height="14" rx="1.5"/><path d="M7 21h10M12 18v3M7 9h6M7 13h10"/></svg>',
    press: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 5h13v14H6a2 2 0 0 1-2-2z"/><path d="M17 8h3v9a2 2 0 0 1-2 2"/><path d="M7 9h7M7 12h7M7 15h4"/></svg>',
    decree: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h7M9 16h7"/></svg>',
    cal: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3.5" y="5" width="17" height="15" rx="1"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    flag: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M5 21V4M5 4h13l-2.5 4L18 12H5"/></svg>',
    mail: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3.5 6 8.5 7 8.5-7"/></svg>',
    map: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
    org: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 21h18M5 21V10M19 21V10M9 21v-6h6v6M2 10l10-6 10 6"/></svg>'
  };

  /* ---------- chrome ---------- */
  /* main menu: [key, href] or a group { g: key, items: [[key, href], ...] } (a drop-down; a list of its own in the phone menu) */
  var NAV = [
    ["home", "/"], ["governor", "/governor.html"], ["firstlady", "/first-lady.html"], ["ltgov", "/lieutenant-governor.html"], ["zharkyn", "/zharkyn.html"],
    { g: "gov", items: [["admin", "/administration.html"], ["regions", "/regions.html"]] },
    ["press", "/press.html"], ["decrees", "/decrees.html"],
    { g: "state", items: [["symbols", "/symbols.html"], ["flag", "/flag-status.html"], ["holidays", "/holidays.html"]] },
    ["contact", "/contact.html"]
  ];
  var NAVPAGE = { release: "press" };
  var EXTRA = {};
  var CARET = '<svg class="caret" viewBox="0 0 10 6" width="10" height="6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  function navLabel(k) { var s = (I.ui[LANG] || {})["navS_" + k]; return s != null ? s : t("nav_" + k); }
  function navItem(n, cur) { return '<li><a href="' + n[1] + '"' + (n[0] === cur ? ' aria-current="page"' : "") + ">" + esc(navLabel(n[0])) + "</a></li>"; }
  function navHTML(cur) {
    return NAV.map(function (n) {
      if (!n.g) return navItem(n, cur);
      var here = n.items.some(function (x) { return x[0] === cur; });
      return '<li class="dd' + (here ? " here" : "") + '"><button type="button" class="dd-btn" aria-expanded="false" aria-controls="dd-' + n.g + '">' + esc(t("navG_" + n.g)) + CARET + "</button>" +
        '<ul class="sub" id="dd-' + n.g + '">' + n.items.map(function (x) { return navItem(x, cur); }).join("") + "</ul></li>";
    }).join("");
  }
  function closeDD(except) { $$(".nav .dd.open").forEach(function (d) { if (d !== except) { d.classList.remove("open"); $(".dd-btn", d).setAttribute("aria-expanded", "false"); } }); }
  var ddBound = false;
  function bindDD(top) {
    $$(".dd-btn", top).forEach(function (b) {
      b.addEventListener("click", function (e) {
        var d = b.parentNode, open = !d.classList.contains("open");
        closeDD(d); d.classList.toggle("open", open); b.setAttribute("aria-expanded", open); e.stopPropagation();
      });
    });
    if (ddBound) return; ddBound = true;
    document.addEventListener("click", function (e) { if (!e.target.closest || !e.target.closest(".nav .dd")) closeDD(); });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var d = $(".nav .dd.open"); if (!d) return;
      closeDD(); $(".dd-btn", d).focus();
    });
  }

  function chrome() {
    var top = $("#top"), bottom = $("#bottom");
    if (top) {
      var cur = NAVPAGE[PAGE] || PAGE;
      top.innerHTML =
        '<a class="skip" href="#main">' + esc(t("skip")) + '</a>' +
        '<div class="util"><div class="wrap"><div class="left"><span>' + esc(t("utilGov")) + '</span><span class="clock" id="clock"></span></div>' +
        '<div class="right"><a class="flagst" id="flagSt" href="/flag-status.html">' + flagPict(false) + '<span class="fs-k">' + esc(t("hdrFlag")) + '</span><span class="fs-v"></span></a>' +
        '<div class="langs" role="group" aria-label="' + esc(t("langLabel")) + '">' +
        LANGS.map(function (l) { return '<button type="button" data-lang="' + l + '" aria-pressed="' + (l === LANG) + '" lang="' + I.htmlLang[l] + '">' + esc(I.langs[l]) + "</button>"; }).join("") +
        "</div></div></div></div>" +
        '<div class="mast"><div class="wrap"><a class="home-link" href="/"><img class="emb" src="/assets/state-emblem-160.png" alt="' + esc(t("embAlt")) + '" width="76" height="76">' +
        '<div class="ttl"><div class="k">' + esc(t("mastK")) + '</div><div class="n">' + esc(t("mastN")) + '</div><div class="s">' + esc(t("mastS")) + "</div></div></a>" +
        '<a class="eirad" href="' + SERVICES + '">' + t("eiradBtn") + "</a></div></div>" +
        '<nav class="nav" aria-label="' + esc(t("navLabel")) + '"><div class="wrap"><button class="burger" type="button" aria-expanded="false"><span class="bars"></span>' + esc(t("menu")) + "</button><ul class=\"menu\">" + navHTML(cur) +
        "</ul></div></nav><div class=\"orn\" aria-hidden=\"true\"></div>";
      $(".burger", top).addEventListener("click", function () {
        var nav = $(".nav", top), open = !nav.classList.contains("open");
        nav.classList.toggle("open", open); this.setAttribute("aria-expanded", open);
      });
      bindDD(top);
      $$("[data-lang]", top).forEach(function (b) {
        b.addEventListener("click", function () { setLang(b.getAttribute("data-lang")); });
      });
      tick();
      flagHeader();
    }
    if (bottom) {
      bottom.innerHTML =
        '<footer class="foot"><div class="wrap"><div class="cols">' +
        '<div><div class="femb"><img src="/assets/emblem.svg" alt="" width="42" height="42"><strong style="color:#fff">' + esc(t("mastN")) + "</strong></div>" +
        '<address class="addrbox" style="font-style:normal">' + t("footAddr") + "</address>" +
        '<a class="tulpar-ch" href="https://tulparapp.com/app/#sub=iradgov" rel="noopener"><img src="/assets/tulpar.svg" alt="" width="22" height="22"><span>' + esc(t("footTulpar")) + "<small>@iradgov</small></span></a></div>" +
        "<div><h4>" + esc(t("footGov")) + "</h4><ul>" +
        ["governor", "firstlady", "ltgov", "admin", "regions", "decrees"].map(function (k) { return '<li><a href="' + navHref(k) + '">' + esc(t("nav_" + k)) + "</a></li>"; }).join("") +
        "</ul></div>" +
        "<div><h4>" + esc(t("footMore")) + '</h4><ul><li><a href="' + SERVICES + '">' + esc(t("footServices")) + "</a></li>" + '<li><a href="https://bank.iradgov.org/">' + esc(t("footBank")) + '</a></li><li><a href="https://archives.iradgov.org/">' + esc(t("footArch")) + "</a></li>" +
        ["press", "holidays", "flag", "symbols", "zharkyn", "contact"].map(function (k) { return '<li><a href="' + navHref(k) + '">' + esc(t("nav_" + k)) + "</a></li>"; }).join("") +
        "</ul></div></div>" +
        '<div class="fine"><span>' + esc(t("footCopy", { y: iradNow().getFullYear() })) + "</span><span>" + esc(t("footTime")) + "</span></div></div></footer>";
    }
  }
  function navHref(k) {
    if (EXTRA[k]) return EXTRA[k];
    for (var i = 0; i < NAV.length; i++) {
      if (NAV[i][0] === k) return NAV[i][1];
      if (NAV[i].g) for (var j = 0; j < NAV[i].items.length; j++) if (NAV[i].items[j][0] === k) return NAV[i].items[j][1];
    }
    return "/";
  }
  /* flag status in the utility bar: a flag on its staff, lowered on half-mast days (data/flag.json, cached) */
  function flagPict(half) {
    var y = half ? 7.5 : 2;
    return '<svg class="fs-ic" viewBox="0 0 16 18" width="16" height="18" aria-hidden="true"><path d="M2.5 2.2V17.6" stroke="#d9dde4" stroke-width="1.3"/><circle cx="2.5" cy="1.5" r="1.3" fill="#e9c46a"/>' +
      '<rect x="3.4" y="' + y + '" width="11.4" height="7" fill="#c8202c" stroke="#fff6d5" stroke-width=".7"/><circle cx="9.1" cy="' + (y + 3.5) + '" r="1.3" fill="#fff6d5"/><path d="M.6 17.6h4" stroke="#d9dde4" stroke-width="1.3"/></svg>';
  }
  function flagHeader() {
    getJSON("/data/flag.json").then(function (data) {
      var el = $("#flagSt"); if (!el) return;
      var half = flagState(data, iradToday()).half, v = t(half ? "hdrHalf" : "hdrFull");
      el.innerHTML = flagPict(half) + '<span class="fs-k">' + esc(t("hdrFlag")) + ':</span><span class="fs-v">' + esc(v) + "</span>";
      el.classList.toggle("is-half", half);
      el.setAttribute("aria-label", t("hdrFlag") + ": " + v);
    }).catch(function () {});
  }
  var tickTimer;
  function tick() {
    var el = $("#clock"); if (!el) return;
    var d = iradNow();
    el.textContent = t("clock", { d: fmtDate(iradToday()), t: pad(d.getHours()) + ":" + pad(d.getMinutes()) });
    clearTimeout(tickTimer); tickTimer = setTimeout(tick, 30000);
  }

  /* ---------- static text ---------- */
  function staticText() {
    var P = (I.pages && I.pages[LANG]) || {};
    $$("[data-i18n]").forEach(function (el) {
      if (!origHTML.has(el)) origHTML.set(el, el.innerHTML);
      var k = el.getAttribute("data-i18n");
      el.innerHTML = LANG === "en" || P[k] == null ? origHTML.get(el) : P[k];
    });
    $$("[data-i18n-alt]").forEach(function (el) {
      if (!el.hasAttribute("data-alt-en")) el.setAttribute("data-alt-en", el.getAttribute("alt") || "");
      var k = el.getAttribute("data-i18n-alt");
      el.setAttribute("alt", LANG === "en" || P[k] == null ? el.getAttribute("data-alt-en") : P[k]);
    });
    document.documentElement.lang = I.htmlLang[LANG];
    var tk = document.body.getAttribute("data-title");
    if (tk) document.title = (t("title_" + tk) && t("title_" + tk) !== "title_" + tk ? t("title_" + tk) + " | " : "") + t("siteName");
  }

  function setLang(l) {
    if (LANGS.indexOf(l) < 0 || l === LANG) return;
    LANG = l;
    try { localStorage.setItem("iradgov_lang", l); } catch (e) {}
    var u = new URL(location.href);
    if (u.searchParams.has("lang")) { u.searchParams.delete("lang"); history.replaceState(null, "", u.pathname + (u.search || "") + u.hash); }
    render();
  }

  /* ---------- shared renderers ---------- */
  function typeTag(type) { return '<span class="tag' + (type === "statement" ? " gold" : type === "district" ? " grey" : "") + '">' + esc(t("type_" + type)) + "</span>"; }
  function releaseItem(r) {
    return "<li><div class=\"meta\"><time datetime=\"" + r.date + "\">" + esc(fmtDate(r.date)) + "</time>" + typeTag(r.type) + "<span>" + esc(tri(r.source)) + "</span></div>" +
      '<div class="t"><a href="/release.html?id=' + encodeURIComponent(r.id) + '">' + esc(tri(r.title)) + "</a></div>" +
      '<p class="s">' + esc(tri(r.summary)) + "</p></li>";
  }
  function sortByDate(a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }
  function failBox(el) { el.innerHTML = '<p class="muted">' + esc(t("loadFail")) + "</p>"; }

  function rateWidget(el) {
    if (!el) return;
    var draw = function (usd, rows, date, live) {
      var h = '<h2>' + esc(t("rateH")) + '</h2><div class="big"><span class="v">' + fmtNum(usd) + '</span><span class="u">' + esc(t("rateUnit")) + "</span></div>";
      if (rows && rows.length) {
        h += "<table><tbody>" + rows.filter(function (r) { return r.code !== "USD"; }).map(function (r) {
          return "<tr><td>" + (r.units > 1 ? r.units + " " : "") + esc(r.code) + " <span class=\"muted small\">" + esc(t("cur_" + r.code) !== "cur_" + r.code ? t("cur_" + r.code) : "") + '</span></td><td class="num">' + fmtNum(r.som, r.som < 1 ? 3 : 2) + "</td></tr>";
        }).join("") + "</tbody></table>";
      }
      h += '<p class="src">' + esc(live && date ? t("rateAsOf", { d: fmtDate(date) }) : t("ratePeg")) + "</p>";
      el.innerHTML = h;
    };
    draw(RATE_FALLBACK, null, null, false);
    var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 6000);
    getRates(ctl).then(function (d) {
      clearTimeout(timer);
      var off = d && d.rates && d.rates.official;
      var usd = off && typeof off.usd === "number" ? off.usd : (d && d.rates && typeof d.rates.peg === "number" ? d.rates.peg : null);
      var rows = off && Array.isArray(off.rows) ? off.rows : (d && d.rates && Array.isArray(d.rates.official) ? d.rates.official : null);
      if (usd) draw(usd, rows, d.date, true);
    }).catch(function () { clearTimeout(timer); });
  }
  var ratePromise;
  function getRates(ctl) {
    if (!ratePromise) ratePromise = fetch(RATE_FEED, { cache: "no-cache", signal: ctl ? ctl.signal : undefined, credentials: "omit" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
    return ratePromise;
  }

  /* ---------- pages ---------- */
  var pages = {};

  pages.home = function () {
    getJSON("/data/press.json").then(function (d) {
      var all = (d.releases || []).slice().sort(sortByDate);
      var lg = all.filter(function (r) { return r.type === "lg"; });
      var f = lg[0];
      var feat = $("#feature");
      if (f && feat) {
        var p = ymd(f.date);
        feat.innerHTML = '<div class="datebox"><div><div class="d">' + p.d + '</div><div class="m">' + esc(I.ui[LANG].months[p.m - 1]) + " " + p.y + '</div></div><img class="emb" src="/assets/emblem.svg" alt=""></div>' +
          '<div class="body"><span class="tag">' + esc(t("ltgovActivity")) + '</span><h3><a href="/release.html?id=' + encodeURIComponent(f.id) + '">' + esc(tri(f.title)) + "</a></h3><p>" + esc(tri(f.summary)) + '</p><p class="small">' +
          lg.slice(1, 4).map(function (r) { return '<a href="/release.html?id=' + encodeURIComponent(r.id) + '">' + esc(tri(r.title)) + "</a> <span class=\"muted\">(" + esc(fmtDate(r.date, true)) + ")</span>"; }).join("<br>") + "</p></div>";
      }
      var list = $("#latest");
      if (list) list.innerHTML = '<ul class="plist">' + all.filter(function (r) { return r !== f; }).slice(0, 6).map(releaseItem).join("") + "</ul>";
    }).catch(function () { failBox($("#latest")); });
    getJSON("/data/documents.json").then(function (d) {
      var el = $("#notices"); if (!el) return;
      var items = (d.documents || []).filter(function (x) { return x.home; }).sort(sortByDate).slice(0, 4);
      el.innerHTML = items.map(function (x) {
        return '<div class="notice"><div class="meta">' + esc(numDate(x.date)) + " · " + esc(tri(x.issuer)) + '</div><div class="t"><a href="/decrees.html#' + esc(x.id) + '">' + esc(tri(x.title)) + "</a></div><p>" + esc(tri(x.summary)) + "</p></div>";
      }).join("");
    }).catch(function () { failBox($("#notices")); });
    getJSON("/data/addresses.json").then(function (d) {
      var el = $("#lastaddr"); if (!el) return;
      var a = (d.addresses || []).slice().sort(sortByDate)[0];
      if (!a) return;
      el.innerHTML = '<h2>' + esc(t("govAddrH")) + '</h2><p class="small muted">' + esc(fmtDate(a.date)) + '</p><p><strong>' + esc(tri(a.title)) + "</strong></p><p class=\"small\">" + esc(tri(a.summary)) + '</p><p class="small"><a href="/governor.html#addresses">' + esc(t("allAddr")) + "</a></p>";
    }).catch(function () {});
  };

  pages.press = function () {
    var el = $("#presslist"), fl = $("#pressfilters");
    getJSON("/data/press.json").then(function (d) {
      var all = (d.releases || []).slice().sort(sortByDate);
      var types = ["all"].concat(["lg", "governor", "gov", "ministry", "statement", "district"].filter(function (ty) { return all.some(function (r) { return r.type === ty; }); }));
      var cur = fl.getAttribute("data-cur") || "all";
      fl.innerHTML = types.map(function (ty) { return '<button type="button" data-ty="' + ty + '" aria-pressed="' + (ty === cur) + '">' + esc(ty === "all" ? t("filterAll") : t("type_" + ty)) + "</button>"; }).join("");
      $$("button", fl).forEach(function (b) { b.addEventListener("click", function () { fl.setAttribute("data-cur", b.getAttribute("data-ty")); pages.press(); }); });
      var shown = all.filter(function (r) { return cur === "all" || r.type === cur; });
      var byYear = {};
      shown.forEach(function (r) { var y = r.date.slice(0, 4); (byYear[y] = byYear[y] || []).push(r); });
      el.innerHTML = Object.keys(byYear).sort().reverse().map(function (y) {
        return '<div class="sect-h"><h2>' + y + '</h2><span class="muted small">' + esc(t("nReleases", { n: byYear[y].length })) + '</span></div><ul class="plist">' + byYear[y].map(releaseItem).join("") + "</ul>";
      }).join("") || '<p class="muted">' + esc(t("noneFound")) + "</p>";
    }).catch(function () { failBox(el); });
  };

  pages.release = function () {
    var el = $("#release"), id = new URLSearchParams(location.search).get("id");
    getJSON("/data/press.json").then(function (d) {
      var all = (d.releases || []).slice().sort(sortByDate);
      var i = -1;
      for (var k = 0; k < all.length; k++) if (all[k].id === id) i = k;
      if (i < 0) { el.innerHTML = '<div class="release"><h1>' + esc(t("relMissingH")) + "</h1><p>" + esc(t("relMissing")) + '</p><p><a href="/press.html">' + esc(t("backPress")) + "</a></p></div>"; document.title = t("relMissingH") + " | " + t("siteName"); return; }
      var r = all[i];
      var body = r.body || {}, paras = hasLang(body) ? body[LANG] : (body.en || []);
      var note = LANG !== "en" && !hasLang(body) && (body.en || []).length ? '<div class="trnote">' + esc(t("trNote")) + "</div>" : "";
      var docs = "";
      el.innerHTML = '<div class="release"><div class="crumbs"><a href="/">' + esc(t("nav_home")) + '</a> › <a href="/press.html">' + esc(t("nav_press")) + "</a></div>" +
        '<div class="meta"><time datetime="' + r.date + '">' + esc(fmtDate(r.date)) + "</time>" + typeTag(r.type) + "<span>" + esc(tri(r.source)) + "</span></div>" +
        "<h1>" + esc(tri(r.title)) + '</h1><p class="lead">' + esc(tri(r.summary)) + "</p>" + note +
        '<div class="body">' + paras.map(function (p) { return "<p>" + p + "</p>"; }).join("") + "</div>" +
        (r.related && r.related.length ? '<p class="small"><strong>' + esc(t("relatedDocs")) + ":</strong> " + r.related.map(function (x) { return '<a href="/decrees.html#' + esc(x) + '">' + esc(x) + "</a>"; }).join(", ") + "</p>" : "") + docs +
        '<div class="contact">' + t("pressContact") + "</div>" +
        '<div class="pager"><span>' + (all[i + 1] ? '‹ <a href="/release.html?id=' + encodeURIComponent(all[i + 1].id) + '">' + esc(tri(all[i + 1].title)) + "</a>" : "") + "</span><span style=\"text-align:right\">" + (all[i - 1] ? '<a href="/release.html?id=' + encodeURIComponent(all[i - 1].id) + '">' + esc(tri(all[i - 1].title)) + "</a> ›" : "") + "</span></div></div>";
      document.title = tri(r.title) + " | " + t("siteName");
      var md = document.querySelector('meta[name="description"]'); if (md) md.setAttribute("content", tri(r.summary));
    }).catch(function () { failBox(el); });
  };

  pages.decrees = function () {
    var el = $("#doclist"), fl = $("#docfilters");
    getJSON("/data/documents.json").then(function (d) {
      var all = (d.documents || []).slice().sort(sortByDate);
      var kinds = ["all", "directive", "decree", "bank", "draft", "notice"].filter(function (k) { return k === "all" || all.some(function (x) { return x.kind === k; }); });
      var cur = fl.getAttribute("data-cur") || "all";
      fl.innerHTML = kinds.map(function (k) { return '<button type="button" data-k="' + k + '" aria-pressed="' + (k === cur) + '">' + esc(k === "all" ? t("filterAll") : t("kind_" + k)) + "</button>"; }).join("");
      $$("button", fl).forEach(function (b) { b.addEventListener("click", function () { fl.setAttribute("data-cur", b.getAttribute("data-k")); pages.decrees(); }); });
      el.innerHTML = all.filter(function (x) { return cur === "all" || x.kind === cur; }).map(function (x) {
        var txt = x.text || {}, paras = hasLang(txt) ? txt[LANG] : (txt.en || []);
        var note = LANG !== "en" && !hasLang(txt) && (txt.en || []).length ? '<div class="trnote">' + esc(t("trNoteDoc")) + "</div>" : "";
        return '<article class="doc" id="' + esc(x.id) + '"><header><div class="no">' + esc(tri(x.number) || t("kind_" + x.kind)) + " · " + esc(numDate(x.date)) + "</div><h3>" + esc(tri(x.title)) + '</h3><div class="small muted">' + esc(tri(x.issuer)) + (x.status ? " · " + esc(tri(x.status)) : "") + "</div></header>" +
          '<div class="body"><p>' + esc(tri(x.summary)) + "</p>" +
          (paras.length ? "<details" + (location.hash === "#" + x.id ? " open" : "") + "><summary>" + esc(t("fullText")) + "</summary>" + note + paras.map(function (p) { return /^<(ol|ul|p|h4)/.test(p) ? p : "<p>" + p + "</p>"; }).join("") + (x.signed ? '<div class="sig">' + tri(x.signed) + "</div>" : "") + "</details>" : "") +
          "</div></article>";
      }).join("") || '<p class="muted">' + esc(t("noneFound")) + "</p>";
      if (location.hash && !pages.decrees.scrolled) { var tgt = document.getElementById(location.hash.slice(1)); if (tgt) { tgt.scrollIntoView(); pages.decrees.scrolled = true; } }
    }).catch(function () { failBox(el); });
  };

  pages.governor = function () {
    var el = $("#addrlist");
    getJSON("/data/addresses.json").then(function (d) {
      var all = (d.addresses || []).slice().sort(sortByDate);
      el.innerHTML = all.map(function (a, i) {
        var tx = a.text || {}, paras = hasLang(tx) ? tx[LANG] : (tx.en || []);
        var note = LANG !== "en" && !hasLang(tx) && (tx.en || []).length ? '<p class="trnote">' + esc(t("trNoteAddr")) + "</p>" : "";
        return '<details class="addr"' + (i === 0 ? " open" : "") + ' id="addr-' + esc(a.date) + '"><summary><span class="d">' + esc(fmtDate(a.date)) + '</span><span class="t">' + esc(tri(a.title)) + '</span><span class="x"><span class="o">' + esc(t("showText")) + '</span><span class="c">' + esc(t("hideText")) + "</span></span></summary>" +
          '<div class="tx"><p><em>' + esc(tri(a.summary)) + "</em></p>" + note + paras.map(function (p) { return "<p>" + p + "</p>"; }).join("") + '<p class="note">' + esc(tri(a.note) || t("addrNote")) + "</p></div></details>";
      }).join("");
    }).catch(function () { failBox(el); });
  };

  pages.ltgov = function () {
    var el = $("#lgactivity");
    getJSON("/data/press.json").then(function (d) {
      var lg = (d.releases || []).filter(function (r) { return r.type === "lg"; }).sort(sortByDate).slice(0, 8);
      el.innerHTML = '<ul class="plist">' + lg.map(releaseItem).join("") + "</ul>";
    }).catch(function () { failBox(el); });
  };

  /* holidays: Holidays and Commemorative Days Act 1993 (rev. 2008). Weekend holidays move to the next working day. */
  function easter(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(y, mo - 1, da));
  }
  function iso(dt) { return dt.getUTCFullYear() + "-" + pad(dt.getUTCMonth() + 1) + "-" + pad(dt.getUTCDate()); }
  function holidaysFor(y) {
    var em = easter(y); em.setUTCDate(em.getUTCDate() + 1);
    var list = [["01-01", "newyear"], ["03-08", "women"], ["03-11", "iradday"], ["03-21", "nooruz"], [iso(em).slice(5), "easter"], ["08-15", "losttribes"], ["08-24", "janyl"], ["12-25", "christmas"], ["12-26", "boxing"]];
    var taken = {};
    var out = list.map(function (h) { var d = new Date(y + "-" + h[0] + "T00:00:00Z"); taken[iso(d)] = true; return { key: h[1], date: iso(d), wd: d.getUTCDay() }; });
    out.forEach(function (h) {
      if (h.wd === 0 || h.wd === 6) {
        var d = new Date(h.date + "T00:00:00Z");
        do { d.setUTCDate(d.getUTCDate() + 1); } while (d.getUTCDay() === 0 || d.getUTCDay() === 6 || taken[iso(d)]);
        taken[iso(d)] = true; h.observed = iso(d);
      }
    });
    return out;
  }
  pages.holidays = function () {
    var el = $("#hol"), today = iradToday(), y = +today.slice(0, 4);
    var nextFound = false;
    el.innerHTML = [y, y + 1].map(function (yy) {
      return '<div class="sect-h"><h2>' + esc(t("holYear", { y: yy })) + '</h2></div><div class="tbl-wrap"><table class="data"><thead><tr><th>' + esc(t("holDate")) + "</th><th>" + esc(t("holName")) + "</th><th>" + esc(t("holDay")) + "</th><th>" + esc(t("holObserved")) + "</th></tr></thead><tbody>" +
        holidaysFor(yy).map(function (h) {
          var eff = h.observed || h.date, cls = eff < today ? "past" : "";
          if (!cls && !nextFound) { cls = "next"; nextFound = true; }
          return '<tr class="' + cls + '"><td class="num">' + esc(fmtDate(h.date)) + "</td><td><strong>" + esc(t("hol_" + h.key)) + '</strong><br><span class="small muted">' + esc(t("holn_" + h.key)) + "</span></td><td>" + esc(I.ui[LANG].days[h.wd]) + "</td><td>" + (h.observed ? esc(t("holMoved", { d: fmtDate(h.observed) })) : "—") + "</td></tr>";
        }).join("") + "</tbody></table></div>";
    }).join("");
  };


  /* flag status: data/flag.json (standing half-mast days + the Governor's proclamations) */
  var FT = {
    en: { h1: "Flag status", full: "Full staff", half: "Half-mast",
      todayFull: "The national flag is flown at <b>full staff</b> today.",
      todayHalf: "The national flag is flown at <b>half-mast</b> today.",
      until: "Until sunset on {d}.", reasonK: "Reason", scopeK: "Where", refK: "Authority",
      nextK: "Next half-mast day", standingH: "Half-mast every year", ordersH: "Proclamations", dates: "Dates", why: "Occasion",
      protoH: "Flying the national flag",
      proto: "<p>The national flag is flown under the State Symbols Act 1993. It flies daily on Government House, the Mejlis, district and city administrations, courts and Gendarmerie posts, and on schools during the school year. Citizens, businesses and organisations are encouraged to fly it on public holidays.</p><p>On half-mast days the flag is first raised briskly to the top of the staff, then lowered slowly to half the height of the staff, and before it is taken down at sunset it is raised again to the top. Where the flag cannot be lowered, a black ribbon is tied to the top of the staff. No other flag may fly higher than the national flag, and flags flown beside it are lowered with it.</p><p>Half-mast days are set by the Holidays and Commemorative Days Act and by proclamation of the Governor. Proclamations are announced by the Office of the Governor's press service and read on IradOne.</p>",
      contactH: "Questions", contact: "Protocol Department, Office of the Governor, Government House, Central Square, Talas. +996-39-2-21-10-12. <a href=\"mailto:info@iradgov.org\">info@iradgov.org</a>",
      staffAlt: "The national flag on its staff" },
    ir: { h1: "Tuunun abalı", full: "Tolugu menen", half: "Jarım machtada",
      todayFull: "Bügün mamlekettik tuu <b>tolugu menen</b> kötörülgön.",
      todayHalf: "Bügün mamlekettik tuu <b>jarım machtada</b>.",
      until: "{d} kün batkanga cheyin.", reasonK: "Sebebi", scopeK: "Kayda", refK: "Negiz",
      nextK: "Kiyinki jarım machta künü", standingH: "Jıl sayın jarım machtada", ordersH: "Bildirüülör", dates: "Kündör", why: "Sebep",
      protoH: "Mamlekettik tuunu kötörüü",
      proto: "<p>Mamlekettik tuu 1993-jılkı Mamlekettik simvoldor jönündögü mıyzam boyuncha kötörülöt. Al kün sayın Ökmöt üyündö, Mejliste, aymak jana shaar administratsiyalarında, sottordo, Jandarm posttorunda, okuu jılında mektepterde jelbireyt. Jarandar, ishkanalar jana uyumdar mayram künderi tuu kötörüügö chakırılat.</p><p>Jarım machta künderi tuu adegende machtanın uchuna tez kötörülöt, andan kiyin jay jarımına cheyin tüshürülöt; kün batkanda alınar aldında kayra uchuna kötörülöt. Tuunu tüshürüügö mümkün bolboso, machtanın uchuna kara lenta baylanat. Mamlekettik tuudan biyik bashka tuu kötörülböyt; anın janındagı tuular da kosho tüshürülöt.</p><p>Jarım machta künderin Mayram jana eskerüü künderi jönündögü mıyzam jana Gubernatordun bildirüüsü belgileyt. Bildirüülördü Gubernatordun apparatının press-kızmatı jarıyalayt, IradOne okuyt.</p>",
      contactH: "Suroolor", contact: "Protokol bölümü, Gubernatordun apparatı, Ökmöt üyü, Borborduk ayant, Talas. +996-39-2-21-10-12. <a href=\"mailto:info@iradgov.org\">info@iradgov.org</a>",
      staffAlt: "Machtadagı mamlekettik tuu" },
    ru: { h1: "Положение флага", full: "Поднят полностью", half: "Приспущен",
      todayFull: "Сегодня государственный флаг <b>поднят полностью</b>.",
      todayHalf: "Сегодня государственный флаг <b>приспущен</b>.",
      until: "До заката {d}.", reasonK: "Повод", scopeK: "Где", refK: "Основание",
      nextK: "Ближайший день приспущенного флага", standingH: "Ежегодно приспускается", ordersH: "Распоряжения", dates: "Даты", why: "Повод",
      protoH: "Использование государственного флага",
      proto: "<p>Государственный флаг поднимается в соответствии с Законом о государственных символах 1993 года. Он ежедневно поднят над Домом правительства, Меджлисом, районными и городскими администрациями, судами и постами жандармерии, а в учебный год — над школами. Гражданам, предприятиям и организациям рекомендуется поднимать флаг в праздничные дни.</p><p>В дни траура флаг сначала быстро поднимают до верха флагштока, затем медленно опускают до середины; перед спуском на закате его снова поднимают до верха. Если флаг нельзя приспустить, к верхушке флагштока привязывают чёрную ленту. Никакой другой флаг не может находиться выше государственного; флаги рядом с ним приспускаются вместе с ним.</p><p>Дни приспущенного флага устанавливаются Законом о праздничных и памятных днях и распоряжениями губернатора. Распоряжения объявляет пресс-служба Аппарата губернатора, их зачитывают на IradOne.</p>",
      contactH: "Вопросы", contact: "Протокольный отдел, Аппарат губернатора, Дом правительства, Центральная площадь, Талас. +996-39-2-21-10-12. <a href=\"mailto:info@iradgov.org\">info@iradgov.org</a>",
      staffAlt: "Государственный флаг на флагштоке" }
  };
  function ft(k, v) { var d = FT[LANG] || FT.en; var s = d[k] != null ? d[k] : FT.en[k]; return v ? fill(s, v) : s; }
  function flagState(data, day) {
    var y = day.slice(0, 4), md = day.slice(5);
    var order = (data.orders || []).filter(function (o) { return o.from <= day && day <= o.to; })[0];
    if (order) return { half: true, order: order, until: order.to };
    var st = (data.standing || []).filter(function (s) { return s.md === md; })[0];
    if (st) return { half: true, standing: st, until: day };
    return { half: false };
  }
  function nextHalf(data, day) {
    var y = +day.slice(0, 4), c = [];
    (data.standing || []).forEach(function (s) { [y, y + 1].forEach(function (yy) { var d = yy + "-" + s.md; if (d > day) c.push({ date: d, s: s }); }); });
    (data.orders || []).forEach(function (o) { if (o.from > day) c.push({ date: o.from, o: o }); });
    c.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    return c[0];
  }
  pages.flag = function () {
    var el = $("#flagPage"); if (!el) return;
    $("#flagCrumb").textContent = ft("h1");
    getJSON("/data/flag.json").then(function (data) {
      var day = iradToday(), st = flagState(data, day), nx = nextHalf(data, day);
      var info = "";
      if (st.half) {
        var src = st.order || st.standing;
        info = '<p class="flag-until">' + esc(ft("until", { d: fmtDate(st.until) })) + "</p>" +
          '<dl class="flag-dl"><dt>' + esc(ft("reasonK")) + "</dt><dd>" + esc(tri(st.order ? src.reason : src.name)) + (st.standing ? " " + esc(tri(src.note)) : "") + "</dd>" +
          (st.order ? "<dt>" + esc(ft("scopeK")) + "</dt><dd>" + esc(tri(src.scope)) + "</dd><dt>" + esc(ft("refK")) + "</dt><dd>" + esc(src.ref) + "</dd>" : "") + "</dl>";
      } else if (nx) {
        info = '<p class="flag-next"><span class="muted">' + esc(ft("nextK")) + ":</span> <b>" + esc(fmtDate(nx.date)) + "</b>, " + esc(tri(nx.s ? nx.s.name : nx.o.reason)) + "</p>";
      }
      el.innerHTML =
        '<h1 class="page-h1">' + esc(ft("h1")) + "</h1>" +
        '<section class="flag-now card ' + (st.half ? "is-half" : "is-full") + '">' +
          '<div class="flag-pole" role="img" aria-label="' + esc(ft("staffAlt")) + ": " + esc(ft(st.half ? "half" : "full")) + '"><span class="staff"></span><img class="cloth" src="/assets/flag.svg" alt=""></div>' +
          '<div class="flag-txt"><div class="flag-k">' + esc(fmtDate(day)) + '</div><div class="flag-state">' + esc(ft(st.half ? "half" : "full")) + "</div>" +
          "<p>" + ft(st.half ? "todayHalf" : "todayFull") + "</p>" + info + "</div></section>" +
        '<div class="sect-h"><h2>' + esc(ft("standingH")) + '</h2></div><div class="tbl-wrap"><table class="data flag-tbl"><thead><tr><th>' + esc(ft("dates")) + "</th><th>" + esc(ft("why")) + "</th></tr></thead><tbody>" +
          (data.standing || []).map(function (s) { var y = day.slice(0, 4); return '<tr><td class="num">' + esc(fmtDate(y + "-" + s.md, true)) + "</td><td><strong>" + esc(tri(s.name)) + '</strong><br><span class="small muted">' + esc(tri(s.note)) + "</span></td></tr>"; }).join("") +
        "</tbody></table></div>" +
        '<div class="sect-h"><h2>' + esc(ft("ordersH")) + '</h2></div><div class="tbl-wrap"><table class="data flag-tbl"><thead><tr><th>' + esc(ft("dates")) + "</th><th>" + esc(ft("why")) + "</th></tr></thead><tbody>" +
          (data.orders || []).slice().sort(function (a, b) { return a.from < b.from ? 1 : -1; }).map(function (o) {
            var d = o.from === o.to ? fmtDate(o.from) : fmtDate(o.from) + " – " + fmtDate(o.to);
            return '<tr class="' + (o.to < day ? "past" : "") + '"><td class="num">' + esc(d) + "</td><td>" + esc(tri(o.reason)) + '<br><span class="small muted">' + esc(tri(o.scope)) + " · " + esc(o.ref) + "</span></td></tr>";
          }).join("") +
        "</tbody></table></div>" +
        '<div class="grid g-2" style="margin-top:24px"><div class="card"><h3>' + esc(ft("protoH")) + "</h3>" + ft("proto") + '</div><div class="card"><h3>' + esc(ft("contactH")) + "</h3><p>" + ft("contact") + "</p></div></div>";
    }).catch(function () { failBox(el); });
  };

  /* Zharkyn, the Governor's horse: data/zharkyn.json (yearly appearances, news) */
  function lastSatApr(y) { var d = new Date(Date.UTC(y, 3, 30)); while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() - 1); return iso(d); }
  function appDate(a, y) { return a.rule === "lastSatApr" ? lastSatApr(y) : y + "-" + a.md; }
  function daysBetween(a, b) { return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000); }
  pages.zharkyn = function () {
    var apps = $("#zhApps"), news = $("#zhNews"), nx = $("#zhNext");
    getJSON("/data/zharkyn.json").then(function (d) {
      var today = iradToday(), y = +today.slice(0, 4), next = null;
      (d.appearances || []).forEach(function (a) {
        var dt = appDate(a, y); if (dt < today) dt = appDate(a, y + 1);
        if (!next || dt < next.date) next = { date: dt, a: a };
      });
      if (next && nx) {
        var n = daysBetween(today, next.date);
        nx.innerHTML = '<div class="k">' + esc(t("zhNextK")) + '</div><div class="d">' + esc(fmtDate(next.date)) + ' <span class="muted">(' + esc(n === 0 ? t("zhTodayW") : n === 1 ? t("zhTomorrow") : t("zhInDays", { n: n })) + ")</span></div>" +
          "<div><strong>" + esc(tri(next.a.name)) + "</strong> · " + esc(tri(next.a.place)) + "</div>";
      }
      apps.classList.remove("loading");
      apps.innerHTML = '<ul class="zh-apps">' + (d.appearances || []).map(function (a) {
        var when = a.rule === "lastSatApr" ? t("zhLastSat") : t("zhYearly", { d: fmtDate(y + "-" + a.md, true) });
        return '<li><div class="when">' + esc(when) + "</div><div><strong>" + esc(tri(a.name)) + '</strong><br><span class="small">' + esc(tri(a.place)) + "</span><br>" + esc(tri(a.what)) + "</div></li>";
      }).join("") + "</ul>";
      news.classList.remove("loading");
      news.innerHTML = '<ul class="plist">' + (d.news || []).slice().sort(sortByDate).map(function (x) {
        var when = x.date.length === 4 ? x.date : fmtDate(x.date);
        return '<li><div class="meta"><time datetime="' + esc(x.date) + '">' + esc(when) + "</time><span>" + esc(tri(x.src)) + '</span></div><p class="s" style="margin:0">' + esc(tri(x.text)) + "</p></li>";
      }).join("") + "</ul>";
    }).catch(function () { failBox(apps); failBox(news); });
  };

  /* The First Lady: data/first-lady.json (yearly events of the Children's Fund, dated events with amounts) */
  var SOM_USD = 8.4;
  function fmtInt(n) { var s = String(Math.round(n)), sep = LANG === "en" ? "," : " "; return s.replace(/\B(?=(\d{3})+(?!\d))/g, sep); }
  function money(som) { return t("flMoney", { s: fmtInt(som), u: fmtInt(Math.round(som / SOM_USD / 10) * 10) }); }
  function nthSat(y, m, n) { var d = new Date(Date.UTC(y, m - 1, 1)); while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() + 1); d.setUTCDate(d.getUTCDate() + 7 * (n - 1)); return iso(d); }
  function lastSat(y, m) { var d = new Date(Date.UTC(y, m, 0)); while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() - 1); return iso(d); }
  function recDate(r, y) { return r.rule === "secondSatOct" ? nthSat(y, 10, 2) : r.rule === "lastSatDec" ? lastSat(y, 12) : y + "-" + r.md; }
  function recEnd(r, y) { return r.to ? y + "-" + r.to : recDate(r, y); }
  function recNext(r, today) { var y = +today.slice(0, 4); return recEnd(r, y) < today ? recDate(r, y + 1) : recDate(r, y); }
  function recWhen(r) { return r.rule ? t("flRule_" + r.rule) : r.to ? fmtDate("2000-" + r.md, true) + "–" + fmtDate("2000-" + r.to, true) : fmtDate("2000-" + r.md, true); }
  function evDates(e) { return e.to ? fmtDate(e.date, e.date.slice(0, 4) === e.to.slice(0, 4)) + " – " + fmtDate(e.to) : fmtDate(e.date); }
  pages.firstlady = function () {
    var up = $("#flUp"), past = $("#flPast"), ann = $("#flAnnual"), nx = $("#flNext");
    getJSON("/data/first-lady.json").then(function (d) {
      var today = iradToday(), R = {};
      (d.recurring || []).forEach(function (r) { R[r.id] = r; });
      var all = (d.events || []).map(function (e) {
        var r = R[e.rec] || {};
        return { e: e, r: r, name: e.name || r.name, place: e.place || r.place, end: e.to || e.date };
      });
      var item = function (x, upcoming) {
        var e = x.e, amt = e.som != null ? '<span class="fl-amt"><span class="muted">' + esc(t(e.amt === "given" ? "flGiven" : "flRaised")) + ":</span> <b>" + esc(money(e.som)) + "</b></span>" : "";
        var aid = e.for ? '<span><span class="muted">' + esc(t("flFor")) + ":</span> " + esc(tri(e.for)) + "</span>" : "";
        return '<li class="fl-ev' + (upcoming ? " up" : "") + '"><div class="meta"><time datetime="' + esc(e.date) + '">' + esc(evDates(e)) + "</time>" +
          (x.r.id ? '<span class="tag gold">' + esc(t("flAnnualTag")) + "</span>" : "") + "<span>" + esc(tri(x.place)) + "</span></div>" +
          '<div class="t">' + esc(tri(x.name)) + "</div>" +
          (aid || amt ? '<div class="fl-line">' + aid + amt + "</div>" : "") +
          (e.report ? '<p class="s">' + esc(tri(e.report)) + "</p>" : upcoming && x.r.what ? '<p class="s">' + esc(tri(x.r.what)) + "</p>" : "") + "</li>";
      };
      var ups = all.filter(function (x) { return x.end >= today; }).sort(function (a, b) { return a.e.date < b.e.date ? -1 : 1; });
      var olds = all.filter(function (x) { return x.end < today; }).sort(function (a, b) { return a.e.date < b.e.date ? 1 : -1; });
      if (nx) {
        var n0 = ups[0];
        if (n0) {
          var on = n0.e.date <= today, n = daysBetween(today, n0.e.date);
          nx.innerHTML = '<div class="k">' + esc(t("flNextK")) + '</div><div class="d">' + esc(evDates(n0.e)) + ' <span class="muted">(' + esc(on ? t("flNow") : n === 1 ? t("zhTomorrow") : t("zhInDays", { n: n })) + ")</span></div>" +
            "<div><strong>" + esc(tri(n0.name)) + "</strong> · " + esc(tri(n0.place)) + "</div>";
        } else nx.style.display = "none";
      }
      up.classList.remove("loading");
      up.innerHTML = ups.length ? '<ul class="plist fl-list">' + ups.map(function (x) { return item(x, true); }).join("") + "</ul>" : '<p class="muted">' + esc(t("flNone")) + "</p>";
      var byYear = {};
      olds.forEach(function (x) { var y = x.e.date.slice(0, 4); (byYear[y] = byYear[y] || []).push(x); });
      past.classList.remove("loading");
      past.innerHTML = Object.keys(byYear).sort().reverse().map(function (y) {
        var tot = byYear[y].reduce(function (s, x) { return s + (x.e.som || 0); }, 0);
        return '<details class="fl-year"' + (y === Object.keys(byYear).sort().reverse()[0] ? " open" : "") + "><summary><span class=\"y\">" + y + '</span><span class="muted small">' + esc(t("flYearSum", { n: byYear[y].length, s: money(tot) })) + "</span></summary>" +
          '<ul class="plist fl-list">' + byYear[y].map(function (x) { return item(x, false); }).join("") + "</ul></details>";
      }).join("");
      ann.classList.remove("loading");
      ann.innerHTML = '<div class="tbl-wrap"><table class="data fl-tbl"><thead><tr><th>' + esc(t("flWhenH")) + "</th><th>" + esc(t("flEventH")) + "</th><th>" + esc(t("flNextH")) + "</th></tr></thead><tbody>" +
        (d.recurring || []).map(function (r) {
          return "<tr><td>" + esc(recWhen(r)) + "</td><td><strong>" + esc(tri(r.name)) + '</strong><br><span class="small">' + esc(tri(r.place)) + '</span><br><span class="small muted">' + esc(tri(r.what)) + '</span></td><td class="num">' + esc(fmtDate(recNext(r, today))) + "</td></tr>";
        }).join("") + "</tbody></table></div>";
    }).catch(function () { failBox(up); failBox(past); failBox(ann); });
  };

  function render() {
    chrome();
    staticText();
    var fn = pages[PAGE]; if (fn) fn();
    $$("[data-rate]").forEach(function (el) { rateWidget(el); });
  }
  render();
})();
