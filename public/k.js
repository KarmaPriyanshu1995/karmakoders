(function () {
  var KEY = "kk_vid";
  var FIRST = "kk_seen";
  var LAND = window.__kkLandAt || Date.now();
  var lastLand = "";

  function rand() {
    var a = new Uint8Array(16);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
    else for (var i = 0; i < 16; i++) a[i] = Math.floor(Math.random() * 256);
    var s = "";
    for (i = 0; i < 16; i++) s += a[i].toString(16).padStart(2, "0");
    return s;
  }

  function vid() {
    try {
      var v = localStorage.getItem(KEY);
      if (!v) {
        v = rand();
        localStorage.setItem(KEY, v);
        localStorage.setItem(FIRST, String(Date.now()));
      }
      return v;
    } catch (e) {
      return rand();
    }
  }

  function returning() {
    try {
      var t = Number(localStorage.getItem(FIRST) || 0);
      return t > 0 && Date.now() - t > 86400000 ? 1 : 0;
    } catch (e) {
      return 0;
    }
  }

  function device() {
    var w = window.innerWidth || 1200;
    if (w < 768) return "mobile";
    if (w < 1024) return "tablet";
    return "desktop";
  }

  function browser() {
    var ua = navigator.userAgent || "";
    if (ua.indexOf("Edg/") !== -1) return "Edge";
    if (ua.indexOf("Chrome/") !== -1) return "Chrome";
    if (ua.indexOf("Firefox/") !== -1) return "Firefox";
    if (ua.indexOf("Safari/") !== -1) return "Safari";
    return "Other";
  }

  function send(type, extra) {
    var tool = (extra && extra.tool) || window.__kkTool || "";
    if (!tool) return;
    var body = JSON.stringify({
      t: type,
      tool: String(tool).slice(0, 80),
      v: vid(),
      r: returning(),
      d: device(),
      b: browser(),
      ref: document.referrer || "",
      ms: type === "pageview" ? null : Math.max(0, Date.now() - LAND),
    });
    try {
      if (navigator.sendBeacon) navigator.sendBeacon("/api/analytics/collect", new Blob([body], { type: "application/json" }));
      else fetch("/api/analytics/collect", { method: "POST", headers: { "Content-Type": "application/json" }, body: body, keepalive: true });
    } catch (e) {}
  }

  window.kk = {
    track: function (type, extra) {
      send(type, extra || {});
    },
    land: function (tool) {
      if (!tool) return;
      var stamp = tool + "|" + location.pathname;
      if (lastLand === stamp && Date.now() - LAND < 1500) return;
      lastLand = stamp;
      LAND = window.__kkLandAt || Date.now();
      window.__kkTool = tool;
      send("pageview", { tool: tool });
    },
  };

  var queued = window.kkq || [];
  window.kkq = [];
  for (var n = 0; n < queued.length; n++) window.kk.track(queued[n][0], queued[n][1]);
})();
