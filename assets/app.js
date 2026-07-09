/* ============================================================
   ESP32 学习材料 · 交互逻辑 (纯原生 JS · 离线)
   - 主题: 亮 / 暗 / 跟随系统
   - 磁吸按钮 / 滚动渐显 / 目录高亮
   - 课程进度本地存储 + 全局进度环
   ============================================================ */
(function () {
  "use strict";
  var STORE_THEME = "esp32-theme";
  var STORE_PROG = "esp32-progress";

  /* ---------- 主题 ---------- */
  function applyTheme(mode) {
    var root = document.documentElement;
    if (mode === "system") {
      var mq = window.matchMedia("(prefers-color-scheme: dark)");
      root.setAttribute("data-theme", mq.matches ? "dark" : "light");
    } else {
      root.setAttribute("data-theme", mode);
    }
    document.querySelectorAll("[data-theme-set]").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-theme-set") === mode);
    });
  }
  function initTheme() {
    var saved = localStorage.getItem(STORE_THEME) || "system";
    applyTheme(saved);
    document.querySelectorAll("[data-theme-set]").forEach(function (b) {
      b.addEventListener("click", function () {
        var m = b.getAttribute("data-theme-set");
        localStorage.setItem(STORE_THEME, m);
        applyTheme(m);
      });
    });
    // 跟随系统变化时实时更新
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
      if ((localStorage.getItem(STORE_THEME) || "system") === "system") applyTheme("system");
    });
  }

  /* ---------- 磁吸按钮 ---------- */
  function initMagnetic() {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    var els = [].slice.call(document.querySelectorAll(".magnetic"));
    var mx = -999, my = -999;
    window.addEventListener("mousemove", function (e) { mx = e.clientX; my = e.clientY; });
    function loop() {
      els.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var dx = mx - cx, dy = my - cy;
        var dist = Math.hypot(dx, dy);
        var radius = 120;
        if (dist < radius) {
          var f = (1 - dist / radius) * 0.35;
          el.style.transform = "translate(" + (dx * f) + "px," + (dy * f) + "px)";
        } else {
          el.style.transform = "translate(0,0)";
        }
      });
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  /* ---------- 滚动渐显 ---------- */
  function initReveal() {
    var els = [].slice.call(document.querySelectorAll(".reveal"));
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- 目录高亮 ---------- */
  function initTOC() {
    var toc = document.querySelector(".toc");
    if (!toc) return;
    var links = [].slice.call(toc.querySelectorAll("a[href^='#']"));
    var map = {};
    links.forEach(function (l) {
      var id = l.getAttribute("href").slice(1);
      var sec = document.getElementById(id);
      if (sec) map[id] = l;
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          links.forEach(function (l) { l.classList.remove("active"); });
          var l = map[en.target.id];
          if (l) l.classList.add("active");
        }
      });
    }, { rootMargin: "-20% 0px -70% 0px" });
    Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
  }

  /* ---------- 课程进度 ---------- */
  function loadProg() { try { return JSON.parse(localStorage.getItem(STORE_PROG) || "{}"); } catch (e) { return {}; } }
  function saveProg(p) { localStorage.setItem(STORE_PROG, JSON.stringify(p)); }

  function initChecks() {
    var btns = [].slice.call(document.querySelectorAll(".check-btn[data-course]"));
    if (!btns.length) return;
    var prog = loadProg();
    btns.forEach(function (b) {
      var key = b.getAttribute("data-course");
      if (prog[key]) { b.classList.add("done"); b.textContent = "✓"; }
      b.addEventListener("click", function () {
        var p = loadProg();
        if (p[key]) { delete p[key]; b.classList.remove("done"); b.textContent = ""; }
        else { p[key] = true; b.classList.add("done"); b.textContent = "✓"; }
        saveProg(p);
        updateCounts();
      });
    });
    updateCounts();
  }

  function updateCounts() {
    var prog = loadProg();
    var total = 0, done = 0;
    document.querySelectorAll(".check-btn[data-course]").forEach(function (b) {
      total++; if (prog[b.getAttribute("data-course")]) done++;
    });
    var dc = document.getElementById("done-count");
    if (dc) dc.textContent = done;
    var tc = document.getElementById("total-count");
    if (tc) tc.textContent = total;
    // 进度环
    var ring = document.getElementById("prog-ring");
    if (ring && total) {
      var pct = Math.round((done / total) * 100);
      var circle = ring.querySelector("circle.bar");
      var r = circle ? circle.getAttribute("r") : 0;
      var c = 2 * Math.PI * r;
      circle.style.strokeDasharray = c;
      circle.style.strokeDashoffset = c * (1 - done / total);
      var lbl = ring.querySelector(".pct");
      if (lbl) lbl.textContent = pct + "%";
    }
  }

  /* ---------- 工具: 复制到剪贴板 ---------- */
  function initCopy() {
    document.querySelectorAll("pre[data-copy]").forEach(function (pre) {
      var btn = document.createElement("button");
      btn.className = "ctrl"; btn.textContent = "复制"; btn.style.marginLeft = "auto";
      btn.addEventListener("click", function () {
        navigator.clipboard.writeText(pre.innerText).then(function () { btn.textContent = "已复制 ✓"; setTimeout(function(){btn.textContent="复制";},1400); });
      });
      pre.parentNode.insertBefore(btn, pre.nextSibling);
    });
  }

  /* ---------- 启动 ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initMagnetic();
    initReveal();
    initTOC();
    initChecks();
    initCopy();
  });

  // 暴露给页面: 计算全局完成度
  window.ESP = {
    refreshProgress: updateCounts,
    progress: function () { var p = loadProg(); var t = 0, d = 0;
      document.querySelectorAll(".check-btn[data-course]").forEach(function (b){ t++; if(p[b.getAttribute("data-course")]) d++; });
      return { done: d, total: t }; }
  };
})();
