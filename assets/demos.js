/* ============================================================
   ESP32 学习材料 · 交互式直觉演示引擎 (纯 Canvas · 离线)
   每个概念: 先有画面, 再可把玩。
   ============================================================ */
(function () {
  "use strict";

  var C = {
    bg: "#0b0f15", grid: "#16202c", wire: "#566677", accent: "#ee6c4d",
    teal: "#2a9d8f", yellow: "#e9c46a", text: "#c7d2dd", dim: "#5b6b7d",
    green: "#52b788", red: "#e05260", blue: "#5aa9e6", purple: "#9b8cff", white: "#e8edf3"
  };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  var _sizes = new WeakMap();
  function getCtx(canvas) {
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.clientWidth || 600, h = canvas.clientHeight || 300;
    var prev = _sizes.get(canvas);
    if (!prev || prev.w !== w || prev.h !== h || canvas.width !== Math.round(w * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      _sizes.set(canvas, { w: w, h: h });
    }
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }

  function polyline(points) {
    var segs = [], total = 0;
    for (var i = 0; i < points.length - 1; i++) {
      var a = points[i], b = points[i + 1];
      var len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      segs.push({ a: a, b: b, len: len, acc: total });
      total += len;
    }
    return {
      total: total,
      at: function (d) {
        d = ((d % total) + total) % total;
        for (var i = 0; i < segs.length; i++) {
          var s = segs[i];
          if (d <= s.acc + s.len) {
            var t = s.len ? (d - s.acc) / s.len : 0;
            return [s.a[0] + (s.b[0] - s.a[0]) * t, s.a[1] + (s.b[1] - s.a[1]) * t];
          }
        }
        return segs[0].a;
      }
    };
  }

  function led(ctx, x, y, r, on, intensity) {
    intensity = intensity == null ? 1 : intensity;
    if (on) {
      var g = ctx.createRadialGradient(x, y, 1, x, y, r * 2.2);
      g.addColorStop(0, "rgba(255,210,140," + (0.9 * intensity) + ")");
      g.addColorStop(0.4, "rgba(238,108,77," + (0.5 * intensity) + ")");
      g.addColorStop(1, "rgba(238,108,77,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, 7); ctx.fill();
      ctx.fillStyle = "#ffd27a";
    } else { ctx.fillStyle = "#3a4250"; }
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = on ? "rgba(255,220,160,.8)" : "#56606f"; ctx.stroke();
  }

  function resistorSym(ctx, x1, y, x2, amp) {
    var n = 6, seg = (x2 - x1) / n, i;
    ctx.beginPath(); ctx.moveTo(x1, y);
    for (i = 1; i <= n; i++) ctx.lineTo(x1 + seg * i, y + (i % 2 ? -amp : amp));
    ctx.stroke();
  }

  function drawFlow(ctx, pts, phase, col) {
    var pl = polyline(pts), k, d, p;
    for (k = 0; k < 7; k++) {
      d = (phase * pl.total + k * pl.total / 7) % pl.total;
      p = pl.at(d);
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p[0], p[1], 3, 0, 7); ctx.fill();
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function readout(root) { return root.querySelector("[data-readout]"); }

  /* ---------------- 1. 电流像水流 ---------------- */
  function currentFlow(canvas, root) {
    var loop; var closed = true;
    var btn = root.querySelector("[data-ctrl='toggle']");
    if (btn) btn.addEventListener("click", function () {
      closed = !closed; btn.textContent = closed ? "断开开关" : "闭合开关"; btn.classList.toggle("on", closed);
    });
    function frame(t) {
      var s = getCtx(canvas), ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);
      var y = h / 2, x0 = 50, x1 = w - 50;
      // 电池
      ctx.strokeStyle = C.accent; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x0, y - 22); ctx.lineTo(x0, y + 22); ctx.stroke();
      ctx.fillStyle = C.text; ctx.font = "12px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("电池 3.3V", x0, y + 42);
      // 上导线
      ctx.strokeStyle = C.wire; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x0, y - 22); ctx.lineTo(x1, y - 22); ctx.stroke();
      // 下导线
      ctx.beginPath(); ctx.moveTo(x0, y + 22); ctx.lineTo(x1, y + 22); ctx.stroke();
      // 开关 (x≈ x0+ (x1-x0)*0.32)
      var sx = x0 + (x1 - x0) * 0.30;
      ctx.fillStyle = C.dim; ctx.beginPath(); ctx.arc(sx, y - 22, 5, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(sx, y + 22, 5, 0, 7); ctx.fill();
      ctx.strokeStyle = closed ? C.accent : C.dim; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(sx, y - 22);
      if (closed) ctx.lineTo(sx, y + 22); else ctx.lineTo(sx + 26, y - 8);
      ctx.stroke();
      // LED (x≈ x0+(x1-x0)*0.62)
      var lx = x0 + (x1 - x0) * 0.62;
      led(ctx, lx, y, 12, closed, 1);
      ctx.fillStyle = C.text; ctx.fillText("LED", lx, y + 34);
      // 电子流动
      if (closed) {
        var path = polyline([[x0, y - 22], [x1, y - 22], [x1, y + 22], [x0, y + 22], [x0, y - 22]]);
        var n = 14, speed = 0.06;
        for (var i = 0; i < n; i++) {
          var d = (t * speed + i * path.total / n) % path.total;
          var p = path.at(d);
          ctx.fillStyle = C.yellow;
          ctx.beginPath(); ctx.arc(p[0], p[1], 3.2, 0, 7); ctx.fill();
        }
        ctx.fillStyle = C.yellow; ctx.textAlign = "left";
        ctx.fillText("电子(负电荷)沿回路流动 → 电流", 50, 30);
      } else {
        ctx.fillStyle = C.red; ctx.textAlign = "left";
        ctx.fillText("开关断开: 回路切断, 没有电流", 50, 30);
      }
      loop = requestAnimationFrame(frame);
    }
    loop = requestAnimationFrame(frame);
  }

  /* ---------------- 2. Blink 时序 ---------------- */
  function blink(canvas, root) {
    var delay = 500, paused = false, t0 = performance.now(), loops = 0, lastLoop = 0;
    var slider = root.querySelector("[data-ctrl='delay']");
    if (slider) slider.addEventListener("input", function () { delay = +slider.value; });
    var pb = root.querySelector("[data-ctrl='pause']");
    if (pb) pb.addEventListener("click", function () { paused = !paused; pb.textContent = paused ? "继续" : "暂停"; });

    function frame(t) {
      var s = getCtx(canvas), ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);
      var period = delay * 2; // on delay + off delay
      var elapsed = (t - t0);
      if (!paused) {
        var cyc = Math.floor(elapsed / period);
        if (cyc !== lastLoop) { loops = cyc; lastLoop = cyc; }
      }
      var on = (!paused ? (elapsed % period) < delay : true);
      var phase = (!paused ? (elapsed % period) / period : 0);

      // 时间轴
      var x0 = 50, x1 = w - 30, y = h / 2 + 20;
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      // 方波: 高(delay)低(delay)
      ctx.strokeStyle = C.accent; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x0, y); ctx.lineTo(x0, y - 40); ctx.lineTo(x0 + (x1 - x0) * 0.5, y - 40);
      ctx.lineTo(x0 + (x1 - x0) * 0.5, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.fillStyle = C.dim; ctx.font = "12px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("亮 " + delay + "ms", x0 + (x1 - x0) * 0.25, y - 50);
      ctx.fillText("灭 " + delay + "ms", x0 + (x1 - x0) * 0.75, y - 50);
      // 播放头
      var hx = x0 + (x1 - x0) * phase;
      ctx.strokeStyle = C.white; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hx, y - 60); ctx.lineTo(hx, y + 10); ctx.stroke();
      // LED 指示
      led(ctx, w - 60, 40, 14, on, 1);
      ctx.fillStyle = on ? C.green : C.dim; ctx.textAlign = "center";
      ctx.font = "13px sans-serif"; ctx.fillText(on ? "ON" : "OFF", w - 60, 70);
      var r = readout(root);
      if (r) r.innerHTML = "已循环 <b>" + loops + "</b> 次 · 周期 <b>" + (period / 1000).toFixed(2) + "s</b> · 频率 <b>" + (1000 / period).toFixed(2) + "Hz</b>";
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- 3. PWM 呼吸灯 ---------------- */
  function pwm(canvas, root) {
    var duty = 50, paused = false;
    var slider = root.querySelector("[data-ctrl='duty']");
    if (slider) slider.addEventListener("input", function () { duty = +slider.value; });
    var pb = root.querySelector("[data-ctrl='pause']");
    if (pb) pb.addEventListener("click", function () { paused = !paused; pb.textContent = paused ? "继续" : "暂停"; });

    function frame(t) {
      var s = getCtx(canvas), ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);
      var x0 = 50, x1 = w - 130, base = h - 50, top = 40, amp = base - top;
      var period = 200, dutyFrac = duty / 100;
      var phase = paused ? 0 : (t / period) % 1;
      // 波形
      ctx.strokeStyle = C.accent; ctx.lineWidth = 3;
      var segs = 60;
      ctx.beginPath();
      for (var i = 0; i <= segs; i++) {
        var ph = i / segs;
        var v = (ph % 1) < dutyFrac ? 1 : 0;
        var x = x0 + (x1 - x0) * (i / segs);
        var y = base - v * amp;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // 平均电压填充
      var avgY = base - dutyFrac * amp;
      ctx.fillStyle = "rgba(238,108,77,.15)";
      ctx.fillRect(x0, avgY, x1 - x0, base - avgY);
      ctx.strokeStyle = C.yellow; ctx.setLineDash([5, 4]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0, avgY); ctx.lineTo(x1, avgY); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.yellow; ctx.font = "12px sans-serif"; ctx.textAlign = "left";
      ctx.fillText("平均电压 ≈ " + (3.3 * dutyFrac).toFixed(2) + "V", x0 + 4, avgY - 6);
      // LED 灯 (右侧)
      led(ctx, w - 70, h / 2, 22, dutyFrac > 0, dutyFrac);
      ctx.fillStyle = C.text; ctx.textAlign = "center"; ctx.font = "13px sans-serif";
      ctx.fillText("亮度 " + duty + "%", w - 70, h / 2 + 44);
      var r = readout(root);
      if (r) r.innerHTML = "占空比 <b>" + duty + "%</b> · 每周期亮 " + (dutyFrac * 100).toFixed(0) + "% 的时间 → 人眼看作稳定亮度";
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- 4. ADC 采样量化 ---------------- */
  function adc(canvas, root) {
    var rate = 6, paused = false, t0 = performance.now();
    var slider = root.querySelector("[data-ctrl='rate']");
    if (slider) slider.addEventListener("input", function () { rate = +slider.value; });
    var pb = root.querySelector("[data-ctrl='pause']");
    if (pb) pb.addEventListener("click", function () { paused = !paused; pb.textContent = paused ? "继续" : "暂停"; });

    function frame(t) {
      var s = getCtx(canvas), ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);
      var x0 = 40, x1 = w - 30, base = h - 40, top = 30, amp = base - top;
      var sampleMs = 1000 / rate;
      // 连续模拟信号 (温度/电压)
      ctx.strokeStyle = C.teal; ctx.lineWidth = 2;
      ctx.beginPath();
      for (var i = 0; i <= 200; i++) {
        var x = x0 + (x1 - x0) * (i / 200);
        var ph = (i / 200) * 4 + ((t - t0) / 1500);
        var v = 0.5 + 0.42 * Math.sin(ph);
        var y = base - v * amp;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // 采样点 + 量化台阶
      var steps = Math.ceil(rate * 2); // 窗口内采样数
      ctx.strokeStyle = C.accent; ctx.lineWidth = 2;
      var lastY = base;
      for (var k = 0; k < steps; k++) {
        var frac = (k / rate) + ((t - t0) / 1000) % (1 / rate);
        var xn = x0 + (x1 - x0) * (frac / 2); // 显示约2秒窗口
        if (xn > x1) continue;
        var ph2 = (frac / 2) * 4 + ((t - t0) / 1500);
        var vv = 0.5 + 0.42 * Math.sin(ph2);
        // 量化到 12bit (0..4095)
        var q = Math.round(vv * 4095);
        var qv = q / 4095;
        var yq = base - qv * amp;
        ctx.fillStyle = C.accent; ctx.beginPath(); ctx.arc(xn, yq, 3.5, 0, 7); ctx.fill();
        ctx.strokeStyle = "rgba(238,108,77,.35)";
        ctx.beginPath(); ctx.moveTo(xn, base); ctx.lineTo(xn, yq); ctx.stroke();
        lastY = yq;
      }
      ctx.fillStyle = C.dim; ctx.font = "12px sans-serif"; ctx.textAlign = "left";
      ctx.fillText("连续模拟信号 → 离散数字值 (ESP32 ADC 为 12 位: 0~4095)", x0, 18);
      var r = readout(root);
      if (r) r.innerHTML = "采样率 <b>" + rate + " Hz</b> · 最近读数 ≈ <b>" + Math.round((0.5 + 0.42 * Math.sin(((t - t0) / 1500)) ) * 4095) + "/4095</b>";
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- 5. 上拉 / 下拉电阻 ---------------- */
  function pullResistor(canvas, root) {
    var mode = "up", pressed = false; // up/down/none
    var btns = root.querySelectorAll("[data-ctrl^='mode-']");
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        mode = b.getAttribute("data-ctrl").replace("mode-", "");
        btns.forEach(function (x) { x.style.borderColor = ""; x.style.color = ""; });
        b.style.borderColor = C.accent; b.style.color = C.accent;
        draw();
      });
    });
    var pb = root.querySelector("[data-ctrl='press']");
    if (pb) pb.addEventListener("click", function () {
      pressed = !pressed; pb.textContent = pressed ? "松开按钮" : "按下按钮";
      draw();
    });

    function level() {
      if (mode === "up") return pressed ? 0 : 1;      // 上拉: 未按=高, 按=低(接地)
      if (mode === "down") return pressed ? 1 : 0;    // 下拉: 未按=低, 按=高(接VCC)
      return pressed ? 0 : -1;                          // 无: 浮空, 不可预测
    }

    function draw() {
      var s = getCtx(canvas), ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);
      var pinX = w * 0.5, pinY = h * 0.35;
      // MCU 方块
      ctx.fillStyle = "#1c2733"; ctx.strokeStyle = C.wire; ctx.lineWidth = 2;
      roundRect(ctx, pinX - 70, pinY - 36, 140, 72, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.text; ctx.font = "12px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("ESP32 引脚 GPIO", pinX, pinY - 6);
      // 引脚到按钮
      var btnX = pinX, btnY = pinY + 70;
      ctx.strokeStyle = C.wire; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(pinX, pinY + 36); ctx.lineTo(btnX, btnY - 14); ctx.stroke();
      // 按钮
      ctx.fillStyle = pressed ? C.accent : "#2a3644";
      roundRect(ctx, btnX - 26, btnY - 14, 52, 26, 6); ctx.fill();
      ctx.fillStyle = C.text; ctx.fillText(pressed ? "按下(接GND)" : "松开", btnX, btnY + 32);
      // 上拉/下拉电阻 & VCC/GND
      if (mode === "up") {
        wireV(ctx, pinX, pinY + 36, btnY - 14, "VCC", C.green, true);
        ctx.fillStyle = C.green; ctx.fillText("内部上拉电阻→VCC(3.3V)", pinX - 120, pinY - 50);
      } else if (mode === "down") {
        wireV(ctx, pinX, pinY + 36, btnY - 14, "GND", C.dim, false);
        ctx.fillStyle = C.dim; ctx.fillText("内部下拉电阻→GND", pinX + 60, pinY - 50);
      } else {
        ctx.fillStyle = C.red; ctx.fillText("⚠ 浮空: 引脚像没系绳的风筝, 读到随机值", pinX - 90, pinY - 50);
      }
      // 读取结果
      var lv = level();
      var txt = lv === 1 ? "读到 HIGH (1)" : lv === 0 ? "读到 LOW (0)" : "浮空 → 0 或 1 随机!";
      var col = lv === -1 ? C.red : (lv ? C.green : C.yellow);
      ctx.fillStyle = col; ctx.font = "bold 15px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(txt, pinX, h - 22);
      led(ctx, pinX + 110, pinY, 12, lv === 1, 1);
    }
    function wireV(ctx, x1, y1, y2, label, color, toVcc) {
      ctx.strokeStyle = color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1, (y1 + y2) / 2); ctx.stroke();
      // 电阻(锯齿)
      var my = (y1 + y2) / 2;
      ctx.beginPath(); var rx = x1, rw = 0;
      for (var i = 0; i < 6; i++) { ctx.lineTo(rx + (i % 2 ? 6 : -6), my - 12 + i * 4); }
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x1, my + 12); ctx.lineTo(x1, y2); ctx.stroke();
    }
    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath(); ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
    draw();
  }

  /* ---------------- 6. I2C 总线寻址 ---------------- */
  function i2c(canvas, root) {
    var addr = [0, 1, 1, 1, 1, 0, 0, 0]; // 0x78 = 01111000 (0x3C<<1 + W)
    var seq = ["START"].concat(addr.map(function (b, i) { return "A" + i + ":" + b; })).concat(["ACK", "DATA...", "ACK", "STOP"]);
    var paused = false, idx = 0, t0 = performance.now();
    var pb = root.querySelector("[data-ctrl='pause']");
    if (pb) pb.addEventListener("click", function () { paused = !paused; pb.textContent = paused ? "继续" : "暂停"; });

    function frame(t) {
      var s = getCtx(canvas), ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);
      var n = seq.length, x0 = 40, x1 = w - 40, cw = (x1 - x0) / n;
      var sclY = h * 0.38, sdaY = h * 0.62;
      if (!paused) idx = Math.floor((t - t0) / 700) % n;
      // 时钟 SCL
      ctx.strokeStyle = C.blue; ctx.lineWidth = 2;
      for (var i = 0; i < n; i++) {
        var x = x0 + i * cw + cw / 2;
        var hi = (i <= idx);
        ctx.beginPath(); ctx.moveTo(x - cw / 2 + 3, sclY + (hi ? -16 : 16));
        ctx.lineTo(x - 4, sclY + (hi ? -16 : 16));
        ctx.lineTo(x - 4, sclY + (hi ? -16 : 16)); ctx.lineTo(x + 4, sclY + (hi ? 16 : -16));
        ctx.lineTo(x + cw / 2 - 3, sclY + (hi ? 16 : -16)); ctx.stroke();
      }
      // SDA 数据
      ctx.strokeStyle = C.accent; ctx.lineWidth = 2;
      for (var j = 0; j < n; j++) {
        var xj = x0 + j * cw + cw / 2;
        var bit = j === 0 ? 1 : (j > 8 ? 0 : addr[j - 1]);
        var yo = sdaY + (bit ? -16 : 16);
        ctx.beginPath(); ctx.moveTo(xj - cw / 2 + 3, yo); ctx.lineTo(xj + cw / 2 - 3, yo); ctx.stroke();
      }
      // START/STOP 标记
      ctx.fillStyle = C.dim; ctx.font = "11px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("SCL(时钟)", x0, sclY - 30); ctx.fillText("SDA(数据)", x0, sdaY - 30);
      // 当前阶段
      var cur = seq[idx];
      ctx.fillStyle = C.white; ctx.font = "bold 14px sans-serif";
      ctx.fillText("当前: " + cur, w / 2, h - 16);
      // 高亮当前格
      ctx.strokeStyle = C.yellow; ctx.lineWidth = 2;
      ctx.strokeRect(x0 + idx * cw + 2, sclY - 22, cw - 4, (sdaY + 22) - (sclY - 22));
      var r = readout(root);
      if (r) r.innerHTML = (idx === 0 ? "起始条件(START): SDA 在 SCL 高时拉低" :
        idx <= 8 ? "发送地址 0x3C<<1 + 写位(0) = <b>0x78</b>" :
        idx === 9 ? "从机应答 ACK(拉低 SDA)" :
        idx === n - 1 ? "停止条件 STOP: SDA 在 SCL 高时拉高" : "传输数据字节…") +
        " · 总线只需 2 根线连多个设备";
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- 7. WiFi 状态机 ---------------- */
  function wifiState(canvas, root) {
    var states = ["断电", "扫描 AP", " authenticate", "关联/连接", "获取 IP", "已连接"];
    states[2] = "认证中"; states[3] = "连接中";
    var cur = 0, t0 = performance.now(), paused = false;
    var connectBtn = root.querySelector("[data-ctrl='connect']");
    var lossBtn = root.querySelector("[data-ctrl='loss']");
    if (connectBtn) connectBtn.addEventListener("click", function () { cur = 1; t0 = performance.now(); });
    if (lossBtn) lossBtn.addEventListener("click", function () { cur = 4; });
    var pb = root.querySelector("[data-ctrl='pause']");
    if (pb) pb.addEventListener("click", function () { paused = !paused; pb.textContent = paused ? "继续" : "暂停"; });

    function frame(t) {
      var s = getCtx(canvas), ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);
      if (!paused && cur < states.length - 1 && (t - t0) > 900) { cur++; t0 = performance.now(); }
      // 节点
      var n = states.length, x0 = 60, x1 = w - 60, y = h / 2;
      for (var i = 0; i < n; i++) {
        var x = x0 + (x1 - x0) * (i / (n - 1));
        ctx.strokeStyle = i < cur ? C.accent : C.grid; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x, y); if (i < n - 1) ctx.lineTo(x0 + (x1 - x0) * ((i + 1) / (n - 1)), y); ctx.stroke();
        var done = i < cur, active = i === cur;
        ctx.fillStyle = done ? C.accent : (active ? C.yellow : "#2a3644");
        ctx.beginPath(); ctx.arc(x, y, active ? 12 : 9, 0, 7); ctx.fill();
        if (active) { ctx.strokeStyle = C.yellow; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 17, 0, 7); ctx.stroke(); }
        ctx.fillStyle = i <= cur ? C.text : C.dim; ctx.font = "12px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(states[i], x, y + 36);
      }
      // 信号格 (已连接时)
      if (cur === n - 1) {
        for (var b = 0; b < 4; b++) {
          ctx.fillStyle = C.green;
          var bx = w / 2 - 30 + b * 16, bh = 6 + b * 6;
          ctx.fillRect(bx, y - 60 - bh, 10, bh);
        }
        ctx.fillStyle = C.green; ctx.fillText("IP: 192.168.1.42  ✔ 可上网", w / 2, y - 70);
      }
      var r = readout(root);
      if (r) r.innerHTML = "状态: <b>" + states[cur] + "</b>" + (cur === n - 1 ? " · 点「断网」模拟掉线, 会自动回退重连" : "");
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- 8. ESP-NOW 一对多 ---------------- */
  function espNow(canvas, root) {
    var peers = 4, t0 = performance.now();
    var slider = root.querySelector("[data-ctrl='peers']");
    if (slider) slider.addEventListener("input", function () { peers = +slider.value; });

    function frame(t) {
      var s = getCtx(canvas), ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);
      var cx = w / 2, cy = h / 2;
      // 路由器(无)
      ctx.fillStyle = C.dim; ctx.font = "12px sans-serif"; ctx.textAlign = "center";
      // 发送端
      ctx.fillStyle = C.accent; ctx.beginPath(); ctx.arc(cx, cy, 16, 0, 7); ctx.fill();
      ctx.fillStyle = C.white; ctx.fillText("发送端", cx, cy + 36);
      // 接收端环绕
      var R = Math.min(w, h) * 0.34;
      for (var i = 0; i < peers; i++) {
        var ang = (i / peers) * Math.PI * 2 - Math.PI / 2;
        var px = cx + Math.cos(ang) * R, py = cy + Math.sin(ang) * R;
        // 发射中的包
        var prog = ((t - t0) / 1200 + i / peers) % 1;
        var bx = lerp(cx, px, prog), by = lerp(cy, py, prog);
        ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.arc(bx, by, 4, 0, 7); ctx.fill();
        ctx.fillStyle = C.teal; ctx.beginPath(); ctx.arc(px, py, 13, 0, 7); ctx.fill();
        ctx.fillStyle = C.white; ctx.fillText("节点" + (i + 1), px, py + 30);
      }
      ctx.fillStyle = C.yellow; ctx.textAlign = "center"; ctx.font = "13px sans-serif";
      ctx.fillText("无需路由器: 芯片之间直接喊话 (低延迟·省电)", w / 2, 22);
      var r = readout(root);
      if (r) r.innerHTML = "节点数 <b>" + peers + "</b> · 每个包 ~几毫秒到达 · 适合遥控/传感网";
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- 9. FreeRTOS 任务调度 ---------------- */
  function rtos(canvas, root) {
    var paused = false, t0 = performance.now();
    var pb = root.querySelector("[data-ctrl='pause']");
    if (pb) pb.addEventListener("click", function () { paused = !paused; pb.textContent = paused ? "继续" : "暂停"; });
    var tasks = [
      { name: "任务A · 高优先级(按键)", color: C.red, prio: 3, period: 2600, duty: 260 },
      { name: "任务B · 中优先级(网络)", color: C.accent, prio: 2, period: 1700, duty: 700 },
      { name: "任务C · 低优先级(显示)", color: C.teal, prio: 1, period: 2200, duty: 1500 },
      { name: "空闲 Idle", color: C.dim, prio: 0, period: 99999, duty: 99999 }
    ];
    function frame(t) {
      var s = getCtx(canvas), ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);
      var x0 = 20, x1 = w - 20, top = 30;
      var rows = tasks.length, rh = (h - top - 20) / rows;
      var window = 6000, now = (paused ? 0 : (t - t0)) % window;
      // 时间网格
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.fillStyle = C.dim; ctx.font = "10px sans-serif"; ctx.textAlign = "left";
      for (var gx = 0; gx <= window; gx += 1000) {
        var x = x0 + (x1 - x0) * (gx / window);
        ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, h - 10); ctx.stroke();
        ctx.fillText((gx / 1000) + "s", x + 2, h - 2);
      }
      // 计算每时刻运行的任务: 最高优先级"就绪"者
      function runningAt(tt) {
        var best = tasks[tasks.length - 1];
        for (var i = 0; i < tasks.length; i++) {
          var tk = tasks[i];
          if (tk.period > 90000) { continue; }
          var phase = ((tt % tk.period) + tk.period) % tk.period;
          if (phase < tk.duty) { if (tk.prio >= best.prio) best = tk; }
        }
        // idle 兜底
        var any = false;
        for (var j = 0; j < tasks.length - 1; j++) {
          var tk2 = tasks[j]; var ph2 = ((tt % tk2.period) + tk2.period) % tk2.period;
          if (ph2 < tk2.duty) { any = true; break; }
        }
        return any ? best : tasks[tasks.length - 1];
      }
      // 画条
      for (var r = 0; r < rows; r++) {
        var ty = top + r * rh;
        ctx.fillStyle = C.text; ctx.font = "11px sans-serif"; ctx.textAlign = "left";
        ctx.fillText(tasks[r].name, x0 + 4, ty + 14);
        var step = 40;
        for (var xx = 0; xx < window; xx += step) {
          var runHere = runningAt(xx + step / 2);
          var isThis = runHere === tasks[r];
          if (isThis) {
            var bx = x0 + (x1 - x0) * (xx / window);
            var bw = (x1 - x0) * (step / window);
            ctx.fillStyle = tasks[r].color;
            ctx.fillRect(bx, ty + 18, bw - 2, rh - 24);
          }
        }
      }
      // 播放头
      var hx = x0 + (x1 - x0) * (now / window);
      ctx.strokeStyle = C.white; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx, top); ctx.lineTo(hx, h - 10); ctx.stroke();
      var r2 = readout(root);
      if (r2) r2.innerHTML = "当前运行: <b>" + runningAt(now).name + "</b> · 高优先级任务一旦就绪就抢占低优先级";
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- 10. Web 服务器请求流 ---------------- */
  function webServer(canvas, root) {
    var on = false, anim = -1, t0 = 0;
    function send(state) {
      on = state; anim = performance.now(); t0 = anim;
    }
    var bon = root.querySelector("[data-ctrl='on']");
    var boff = root.querySelector("[data-ctrl='off']");
    if (bon) bon.addEventListener("click", function () { send(true); });
    if (boff) boff.addEventListener("click", function () { send(false); });

    function frame(t) {
      var s = getCtx(canvas), ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);
      var px = w * 0.18, ex = w * 0.78, my = h / 2;
      // 手机
      ctx.fillStyle = "#1c2733"; ctx.strokeStyle = C.wire; ctx.lineWidth = 2;
      roundRect(ctx, px - 26, my - 40, 52, 80, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.text; ctx.font = "11px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("手机浏览器", px, my + 56);
      // ESP32
      ctx.fillStyle = "#16321f"; ctx.strokeStyle = C.teal; ctx.lineWidth = 2;
      roundRect(ctx, ex - 30, my - 34, 60, 68, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.teal; ctx.fillText("ESP32", ex, my + 52);
      led(ctx, ex, my - 4, 10, on, 1);
      ctx.fillStyle = on ? C.green : C.dim; ctx.fillText(on ? "LED 亮" : "LED 灭", ex, my + 18);
      // 请求动画
      if (anim > 0) {
        var prog = ((t - t0) / 900);
        if (prog >= 1) { anim = -1; }
        else {
          var bx = lerp(px + 26, ex - 30, prog);
          ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.arc(bx, my, 7, 0, 7); ctx.fill();
          ctx.fillStyle = C.yellow; ctx.textAlign = "center"; ctx.font = "12px sans-serif";
          ctx.fillText(on ? "GET /on" : "GET /off", (px + 26 + ex - 30) / 2, my - 24);
        }
      } else {
        ctx.fillStyle = C.dim; ctx.textAlign = "center"; ctx.font = "12px sans-serif";
        ctx.fillText("点「开灯 / 关灯」, 手机会发 HTTP 请求到 ESP32", w / 2, 24);
      }
      var r = readout(root);
      if (r) r.innerHTML = "LED 状态: <b>" + (on ? "ON" : "OFF") + "</b>";
      requestAnimationFrame(frame);
    }
    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath(); ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- 11. 深度睡眠电流对比 ---------------- */
  function deepSleep(canvas, root) {
    var wakePerDay = 100, wakeMs = 500;
    var slider = root.querySelector("[data-ctrl='wake']");
    if (slider) slider.addEventListener("input", function () { wakePerDay = +slider.value; update(); });
    var cap = 2000; // mAh
    function update() {
      var s = getCtx(canvas), ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);
      var bars = [
        { label: "持续工作", val: 80, unit: "mA", col: C.red },
        { label: "Modem-sleep", val: 15, unit: "mA", col: C.accent },
        { label: "深度睡眠", val: 0.005, unit: "mA", col: C.teal }
      ];
      var max = 80, x0 = 60, base = h - 50, top = 30, bw = (w - x0 - 40) / bars.length;
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, base); ctx.lineTo(w - 30, base); ctx.stroke();
      for (var i = 0; i < bars.length; i++) {
        var b = bars[i], bx = x0 + i * bw + bw * 0.18, bwi = bw * 0.64;
        var bh = (Math.log10(b.val + 0.01) / Math.log10(max + 0.01)) * (base - top);
        ctx.fillStyle = b.col; ctx.fillRect(bx, base - bh, bwi, bh);
        ctx.fillStyle = C.text; ctx.font = "12px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(b.label, bx + bwi / 2, base + 18);
        ctx.fillText(b.val + " " + b.unit, bx + bwi / 2, base - bh - 8);
      }
      // 平均电流 & 续航
      var avg = (80 * wakeMs * wakePerDay / 86400000) + (0.005 * (86400000 - wakeMs * wakePerDay) / 86400000);
      var days = cap / (avg * 24);
      ctx.fillStyle = C.yellow; ctx.textAlign = "left"; ctx.font = "13px sans-serif";
      ctx.fillText("每天唤醒 " + wakePerDay + " 次 × " + wakeMs + "ms → 平均电流 ≈ " + avg.toFixed(4) + " mA", x0, 20);
      ctx.fillStyle = C.green; ctx.fillText("纽扣电池(2000mAh) 预计续航 ≈ " + (days > 365 ? (days / 365).toFixed(1) + " 年" : days.toFixed(0) + " 天"), x0, h - 8);
    }
    slider && update();
    // 无 slider 时静态画一次
    if (!slider) { var s = getCtx(canvas); }
  }

  /* ---------------- 12. 电容充放电 ---------------- */
  function capacitor(canvas, root) {
    var mode = "charge", t = 0, V = 0, Vcc = 5, R = 1000, C = 0.0022, tau = R * C;
    var btn = root.querySelector("[data-ctrl='cap-mode']");
    if (btn) btn.addEventListener("click", function () {
      mode = mode === "charge" ? "discharge" : "charge";
      btn.textContent = mode === "charge" ? "切换→放电" : "切换→充电"; t = 0;
    });
    var last = performance.now();
    function frame(now) {
      var dt = (now - last) / 1000; last = now; if (dt > 0.05) dt = 0.05; t += dt;
      var e = Math.exp(-t / tau);
      V = mode === "charge" ? Vcc * (1 - e) : Vcc * e;
      var s = getCtx(canvas), ctx = s.ctx, w = s.w, h = s.h; ctx.clearRect(0, 0, w, h);
      var L = 80, Rt = w - 120, T = h * 0.32, B = h * 0.68, cy = h / 2;
      var loop = [[L, T], [Rt, T], [Rt, B], [L, B], [L, T]];
      ctx.strokeStyle = C.wire; ctx.lineWidth = 2.5; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(Rt, T); ctx.lineTo(Rt, B); ctx.lineTo(L, B); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = C.text; ctx.textAlign = "center"; ctx.font = "12px sans-serif";
      ctx.fillText("电池 " + Vcc + "V", L, T - 10);
      ctx.beginPath(); ctx.moveTo(L, cy - 12); ctx.lineTo(L, cy + 12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(L - 8, cy - 4); ctx.lineTo(L + 8, cy - 4); ctx.stroke();
      ctx.fillStyle = C.text; ctx.fillText("R", (L + Rt) / 2, T - 8);
      resistorSym(ctx, (L + Rt) / 2 - 25, T, (L + Rt) / 2 + 25, 7);
      var fill = V / Vcc;
      ctx.fillStyle = C.text; ctx.fillText("电容 C", Rt + 36, cy - 30);
      ctx.strokeStyle = C.white; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(Rt - 6, cy - 24); ctx.lineTo(Rt - 6, cy - 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(Rt + 6, cy + 2); ctx.lineTo(Rt + 6, cy + 24); ctx.stroke();
      ctx.fillStyle = C.red; var i; for (i = 0; i < 6; i++) { var yy = cy - 4 - (20 / 6) * i * fill; ctx.beginPath(); ctx.arc(Rt - 6, yy, 2.2, 0, 7); ctx.fill(); }
      ctx.fillStyle = C.blue; for (i = 0; i < 6; i++) { var yy2 = cy + 4 + (20 / 6) * i * fill; ctx.beginPath(); ctx.arc(Rt + 6, yy2, 2.2, 0, 7); ctx.fill(); }
      var I = (mode === "charge" ? (Vcc - V) : V) / R;
      var spd = Math.min(1, I * 3000);
      if (spd > 0.02) drawFlow(ctx, loop, performance.now() / 800 * spd, mode === "charge" ? C.yellow : C.blue);
      ctx.fillStyle = C.yellow; ctx.textAlign = "left"; ctx.font = "13px sans-serif";
      ctx.fillText("U_C = " + V.toFixed(2) + " V", Rt + 32, cy + 14);
      ctx.fillStyle = C.dim; ctx.fillText("τ=R·C=" + (tau * 1000).toFixed(0) + "ms", Rt + 32, cy + 32);
      var r = readout(root); if (r) r.innerHTML = (mode === "charge" ? "充电中" : "放电中") + " · U_C=" + V.toFixed(2) + "V → 趋近 " + (mode === "charge" ? Vcc : 0) + "V（指数曲线）";
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- 13. 分压器 ---------------- */
  function voltageDivider(canvas, root) {
    var ratio = 0.5, Vcc = 5;
    var slider = root.querySelector("[data-ctrl='div-ratio']");
    if (slider) slider.addEventListener("input", function () { ratio = +slider.value / 100; });
    function frame() {
      var s = getCtx(canvas), ctx = s.ctx, w = s.w, h = s.h; ctx.clearRect(0, 0, w, h);
      var cy = h * 0.38, Vout = Vcc * ratio;
      var xL = 70, xR = w - 70, xTap = lerp(xL, xR, ratio);
      ctx.strokeStyle = C.wire; ctx.lineWidth = 2.5; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(xL, cy); ctx.lineTo(xR, cy); ctx.stroke();
      ctx.fillStyle = C.red; ctx.textAlign = "center"; ctx.font = "13px sans-serif";
      ctx.fillText("VCC " + Vcc + "V", xL, cy - 26);
      ctx.beginPath(); ctx.arc(xL, cy, 4, 0, 7); ctx.fillStyle = C.red; ctx.fill();
      ctx.fillStyle = C.blue; ctx.fillText("GND", xR, cy - 26);
      ctx.beginPath(); ctx.arc(xR, cy, 4, 0, 7); ctx.fillStyle = C.blue; ctx.fill();
      ctx.strokeStyle = C.wire;
      resistorSym(ctx, xL + 20, cy, xTap - 20, 9);
      resistorSym(ctx, xTap + 20, cy, xR - 20, 9);
      ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(xTap, cy, 4, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(xTap, cy); ctx.lineTo(xTap, h * 0.72); ctx.stroke();
      ctx.fillStyle = C.yellow; ctx.fillText("Vout", xTap, h * 0.72 + 18);
      var gx = w * 0.5 + 120, gy = h * 0.5, gh = 110;
      ctx.strokeStyle = C.grid; ctx.strokeRect(gx, gy, 16, gh);
      var fh = gh * (Vout / Vcc);
      ctx.fillStyle = C.yellow; ctx.fillRect(gx, gy + gh - fh, 16, fh);
      ctx.fillStyle = C.text; ctx.textAlign = "left"; ctx.font = "13px sans-serif";
      ctx.fillText("R1 占 " + (100 - ratio * 100).toFixed(0) + "%   R2 占 " + (ratio * 100).toFixed(0) + "%", 70, h - 22);
      ctx.fillStyle = C.yellow; ctx.fillText("Vout = " + Vout.toFixed(2) + " V", gx + 26, gy + gh / 2);
      var r = readout(root); if (r) r.innerHTML = "滑动改变 R1/R2 比例 → Vout 在 0~" + Vcc + "V 间连续变化（ADC 读到的就是它）";
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- 14. 三极管开关 ---------------- */
  function transistor(canvas, root) {
    var on = false;
    var btn = root.querySelector("[data-ctrl='tr-base']");
    if (btn) btn.addEventListener("click", function () { on = !on; btn.textContent = on ? "基极:通电(导通)" : "基极:断电(截止)"; });
    function frame() {
      var s = getCtx(canvas), ctx = s.ctx, w = s.w, h = s.h; ctx.clearRect(0, 0, w, h);
      var cy = h / 2, vccX = w * 0.6, gndY = h * 0.82, ty = h * 0.5;
      ctx.strokeStyle = C.wire; ctx.lineWidth = 2.5; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(vccX, h * 0.16); ctx.lineTo(vccX, h * 0.3); ctx.stroke();
      ctx.fillStyle = C.red; ctx.textAlign = "center"; ctx.font = "12px sans-serif";
      ctx.fillText("+5V", vccX, h * 0.16 - 8);
      led(ctx, vccX, h * 0.38, 9, on, 1);
      var tx = vccX, tyy = h * 0.54;
      ctx.strokeStyle = C.wire; ctx.beginPath(); ctx.moveTo(vccX, h * 0.47); ctx.lineTo(tx, tyy - 14); ctx.stroke();
      ctx.strokeStyle = C.white; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(tx - 12, tyy - 14); ctx.lineTo(tx - 12, tyy + 14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx - 12, tyy - 14); ctx.lineTo(tx, tyy - 22); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx - 12, tyy + 14); ctx.lineTo(tx, tyy + 6); ctx.stroke();
      ctx.fillStyle = C.text; ctx.fillText("NPN", tx + 40, tyy);
      ctx.strokeStyle = C.wire; ctx.beginPath(); ctx.moveTo(tx, tyy + 6); ctx.lineTo(tx, gndY); ctx.stroke();
      ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(tx, gndY, 4, 0, 7); ctx.fill(); ctx.fillText("GND", tx, gndY + 18);
      var bx = vccX - 120;
      ctx.strokeStyle = C.wire; ctx.beginPath(); ctx.moveTo(bx, tyy); ctx.lineTo(tx - 12, tyy); ctx.stroke();
      resistorSym(ctx, bx + 10, tyy, tx - 30, 8);
      ctx.fillStyle = on ? C.green : C.dim; ctx.beginPath(); ctx.arc(bx, tyy, 7, 0, 7); ctx.fill();
      ctx.fillStyle = C.text; ctx.fillText("基极", bx, tyy - 16);
      if (on) drawFlow(ctx, [[vccX, h * 0.16], [vccX, h * 0.47], [vccX, tyy + 6], [tx, gndY]], performance.now() / 400, C.yellow);
      ctx.fillStyle = C.yellow; ctx.textAlign = "left"; ctx.font = "13px sans-serif";
      ctx.fillText(on ? "导通: 集电极→发射极大电流, LED 亮" : "截止: 基极无电流, 集电极-发射极断开, LED 灭", 60, h - 18);
      var r = readout(root); if (r) r.innerHTML = "小电流控制大电流: 基极小电流(按钮)即可开关集电极那一路大电流(LED)";
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- 15. 数制转换 (二进制/十六进制/BCD/格雷码) ---------------- */
  function binConv(canvas, root) {
    var bits = [0, 0, 0, 0, 0, 0, 0, 0]; // bits[0] = MSB(2^7)
    var cells = [], cellW = 0, cellH = 0, ox = 0, oy = 44;
    var pad = 8;

    function layout(s) {
      var w = s.w;
      cellW = Math.min(48, (w - 40) / 8 - pad);
      cellH = 44;
      ox = (w - (cellW * 8 + pad * 7)) / 2;
      cells = [];
      for (var i = 0; i < 8; i++) cells.push({ x: ox + i * (cellW + pad), y: oy, w: cellW, h: cellH, bit: 7 - i });
    }
    function val() { var v = 0; for (var i = 0; i < 8; i++) v = (v << 1) | bits[i]; return v; }
    function gray(v) { return v ^ (v >> 1); }
    function bcdStr(v) {
      if (v === 0) return "0000";
      var s = "", n = v;
      while (n > 0) { var d = n % 10; s = ("000" + d.toString(2)).slice(-4) + " " + s; n = Math.floor(n / 10); }
      return s.trim();
    }

    canvas.addEventListener("click", function (e) {
      var s = getCtx(canvas), rect = canvas.getBoundingClientRect();
      layout(s);
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      for (var i = 0; i < cells.length; i++) {
        var c = cells[i];
        if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) { bits[c.bit] ^= 1; draw(); return; }
      }
    });
    var slider = root.querySelector("[data-ctrl='bin-val']");
    if (slider) slider.addEventListener("input", function () {
      var v = +slider.value;
      for (var i = 0; i < 8; i++) bits[7 - i] = (v >> i) & 1;
      draw();
    });

    function draw() {
      var s = getCtx(canvas), ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h); layout(s);
      var v = val();
      ctx.fillStyle = C.dim; ctx.font = "12px sans-serif"; ctx.textAlign = "left";
      ctx.fillText("点格子切换 0/1 · 或拖下方滑块设十进制值", ox, 24);
      for (var i = 0; i < cells.length; i++) {
        var c = cells[i], on = bits[c.bit];
        ctx.fillStyle = on ? C.accent : "#1c2733"; roundRect(ctx, c.x, c.y, c.w, c.h, 8); ctx.fill();
        ctx.strokeStyle = on ? C.accent : C.grid; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = on ? "#fff" : C.dim; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(bits[c.bit], c.x + c.w / 2, c.y + c.h / 2 + 6);
        ctx.fillStyle = C.dim; ctx.font = "10px sans-serif"; ctx.fillText("2^" + c.bit, c.x + c.w / 2, c.y - 6);
      }
      var oy2 = oy + cellH + 24;
      ctx.textAlign = "left"; ctx.font = "13px sans-serif";
      ctx.fillStyle = C.text; ctx.fillText("十进制:", ox, oy2);
      ctx.fillStyle = C.yellow; ctx.fillText(String(v), ox + 64, oy2);
      ctx.fillStyle = C.text; ctx.fillText("十六进制:", ox, oy2 + 24);
      ctx.fillStyle = C.yellow; ctx.fillText("0x" + v.toString(16).toUpperCase().padStart(2, "0"), ox + 84, oy2 + 24);
      ctx.fillStyle = C.text; ctx.fillText("BCD码:", ox, oy2 + 48);
      ctx.fillStyle = C.teal; ctx.fillText(bcdStr(v), ox + 64, oy2 + 48);
      ctx.fillStyle = C.text; ctx.fillText("格雷码:", ox, oy2 + 72);
      ctx.fillStyle = C.blue; ctx.fillText(("0000000" + gray(v).toString(2)).slice(-8), ox + 64, oy2 + 72);
      var r = readout(root);
      if (r) r.innerHTML = "数值 <b>" + v + "</b> · 二进制 <b>" + ("0000000" + v.toString(2)).slice(-8) +
        "</b> · BCD 把每位十进制拆成 4 位(数码管常用) · 格雷码相邻只差 1 位(编码器防错)";
    }
    draw();
  }

  /* ---------------- 16. 卡诺图化简 ---------------- */
  function karnaugh(canvas, root) {
    // 3 变量: 行 A(0/1), 列 BC(Gray 序 00,01,11,10)
    var grid = [[0, 0, 0, 0], [0, 0, 0, 0]];
    var mIndex = [[0, 1, 3, 2], [4, 5, 7, 6]]; // 每格对应的 minterm
    var groups = null;
    var exBtn = root.querySelector("[data-ctrl='k-ex']");
    if (exBtn) exBtn.addEventListener("click", function () {
      grid = [[0, 0, 1, 0], [0, 1, 1, 1]]; // 多数表决: ≥2 个为 1
      groups = [{ r: 0, c: 2, h: 2, w: 1 }, { r: 1, c: 1, h: 1, w: 2 }];
      draw();
    });
    var clrBtn = root.querySelector("[data-ctrl='k-clr']");
    if (clrBtn) clrBtn.addEventListener("click", function () { grid = [[0, 0, 0, 0], [0, 0, 0, 0]]; groups = null; draw(); });

    canvas.addEventListener("click", function (e) {
      var s = getCtx(canvas), rect = canvas.getBoundingClientRect(), lay = layout(s);
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      for (var r = 0; r < 2; r++) for (var c = 0; c < 4; c++) {
        var cl = lay.cells[r][c];
        if (mx >= cl.x && mx <= cl.x + cl.w && my >= cl.y && my <= cl.y + cl.h) { grid[r][c] ^= 1; groups = null; draw(); return; }
      }
    });

    function layout(s) {
      var w = s.w, h = s.h, top = 42, left = 72;
      var cw = Math.min(66, (w - left - 30) / 4), ch = Math.min(56, (h - top - 90) / 2);
      var cells = [];
      for (var r = 0; r < 2; r++) { cells.push([]); for (var c = 0; c < 4; c++) cells[r].push({ x: left + c * (cw + 6), y: top + r * (ch + 6), w: cw, h: ch }); }
      return { cells: cells };
    }
    function minterms() { var a = []; for (var r = 0; r < 2; r++) for (var c = 0; c < 4; c++) if (grid[r][c]) a.push(mIndex[r][c]); return a; }
    function draw() {
      var s = getCtx(canvas), ctx = s.ctx, w = s.w, h = s.h; ctx.clearRect(0, 0, w, h);
      var lay = layout(s);
      ctx.fillStyle = C.dim; ctx.font = "11px sans-serif"; ctx.textAlign = "center";
      var colLab = ["00", "01", "11", "10"];
      for (var c = 0; c < 4; c++) ctx.fillText("BC=" + colLab[c], lay.cells[0][c].x + lay.cells[0][c].w / 2, lay.cells[0][0].y - 14);
      ctx.textAlign = "right"; ctx.fillStyle = C.text;
      ctx.fillText("A=0", lay.cells[0][0].x - 10, lay.cells[0][0].y + lay.cells[0][0].h / 2);
      ctx.fillText("A=1", lay.cells[1][0].x - 10, lay.cells[1][0].y + lay.cells[1][0].h / 2);
      ctx.textAlign = "left"; ctx.fillStyle = C.dim; ctx.fillText("卡诺图 (3 变量) · 点格子设 1", 20, 22);
      for (var r = 0; r < 2; r++) for (var c = 0; c < 4; c++) {
        var cl = lay.cells[r][c], on = grid[r][c];
        ctx.fillStyle = on ? C.teal : "#1c2733"; roundRect(ctx, cl.x, cl.y, cl.w, cl.h, 6); ctx.fill();
        ctx.strokeStyle = on ? C.teal : C.grid; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = on ? "#04121a" : C.dim; ctx.font = "bold 16px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(on ? "1" : "0", cl.x + cl.w / 2, cl.y + cl.h / 2 + 6);
        ctx.fillStyle = C.dim; ctx.font = "9px sans-serif"; ctx.fillText("m" + mIndex[r][c], cl.x + cl.w / 2, cl.y + 12);
      }
      if (groups) { ctx.strokeStyle = C.accent; ctx.lineWidth = 2; groups.forEach(function (g) {
        var cc = lay.cells[g.r][g.c];
        ctx.strokeRect(cc.x - 3, cc.y - 3, cc.w * g.w + 6 * (g.w - 1) + 6, cc.h * g.h + 6 * (g.h - 1) + 6);
      }); }
      var m = minterms(), r2 = readout(root);
      if (r2) r2.innerHTML = m.length
        ? ("F = Σm(" + m.join(",") + ") · " + (groups ? "示例化简: <b>F = BC + AB</b>(把相邻的 1 圈成矩形)" : "点格子设 1, 把几何相邻的 1 圈成矩形即可化简"))
        : "全 0: F = 0";
    }
    draw();
  }

  /* ---------------- 17. D 触发器时序 (边沿触发 / 抗毛刺) ---------------- */
  function dff(canvas, root) {
    var Dseq = [0, 1, 0, 1, 1, 0];
    var total = 6, paused = false, elapsed = 0, last = performance.now();
    var pb = root.querySelector("[data-ctrl='pause']");
    if (pb) pb.addEventListener("click", function () { paused = !paused; pb.textContent = paused ? "继续" : "暂停"; });
    var loop = 6; // 秒

    function frame(t) {
      var dt = (t - last) / 1000; last = t; if (dt > 0.05) dt = 0.05;
      if (!paused) elapsed += dt;
      var s = getCtx(canvas), ctx = s.ctx, w = s.w, h = s.h; ctx.clearRect(0, 0, w, h);
      var x0 = 48, x1 = w - 16, top = 18, laneH = (h - top - 16) / 3;
      function dVal(xf) {
        var c = Math.floor(xf * total), p = (xf * total) % 1, base = Dseq[c % Dseq.length];
        if (p > 0.42 && p < 0.48) return base ? 0 : 1;
        if (p > 0.52 && p < 0.58) return base ? 0 : 1;
        return base;
      }
      function qVal(xf) { return Dseq[Math.floor(xf * total) % Dseq.length]; }
      function clkVal(xf) { return (xf * total) % 1 < 0.5 ? 1 : 0; }
      function lane(y, fn, color, label) {
        ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.beginPath();
        var prev = null;
        for (var x = x0; x <= x1; x += 2) {
          var xf = (x - x0) / (x1 - x0), v = fn(xf), yy = y + (v ? -laneH * 0.32 : laneH * 0.32);
          if (prev === null) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); prev = v;
        }
        ctx.stroke();
        ctx.fillStyle = C.text; ctx.font = "12px sans-serif"; ctx.textAlign = "left"; ctx.fillText(label, 4, y + 4);
      }
      ctx.strokeStyle = C.grid; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      for (var c = 0; c < total; c++) { var ex = x0 + c * (x1 - x0) / total; ctx.beginPath(); ctx.moveTo(ex, top); ctx.lineTo(ex, top + laneH * 3); ctx.stroke(); }
      ctx.setLineDash([]);
      lane(top + laneH * 0.5, clkVal, C.blue, "CLK");
      lane(top + laneH * 1.5, dVal, C.yellow, "D (数据, 带毛刺)");
      lane(top + laneH * 2.5, qVal, C.green, "Q (锁存输出)");
      // 扫描播放头
      var phx = x0 + ((elapsed % loop) / loop) * (x1 - x0);
      ctx.strokeStyle = C.white; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(phx, top - 4); ctx.lineTo(phx, top + laneH * 3); ctx.stroke();
      var r = readout(root);
      if (r) r.innerHTML = "Q 只在 <b>CLK 上升沿</b>采样 D, 中间的毛刺被忽略 → 这正是用 DFF 滤除按键抖动的硬件原理";
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- 18. 电平兼容 (3.3V ↔ 5V) ---------------- */
  function levelShift(canvas, root) {
    var sce = "A";
    var btns = root.querySelectorAll("[data-ctrl^='ls-']");
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        sce = b.getAttribute("data-ctrl").replace("ls-", "");
        btns.forEach(function (x) { x.style.borderColor = ""; x.style.color = ""; });
        b.style.borderColor = C.accent; b.style.color = C.accent; draw();
      });
    });
    function draw() {
      var s = getCtx(canvas), ctx = s.ctx, w = s.w, h = s.h; ctx.clearRect(0, 0, w, h);
      var ly = h / 2, lx = w * 0.14, rx = w * 0.86;
      ctx.fillStyle = "#1c2733"; ctx.strokeStyle = C.teal; ctx.lineWidth = 2;
      roundRect(ctx, lx - 48, ly - 34, 96, 68, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.teal; ctx.font = "12px sans-serif"; ctx.textAlign = "center"; ctx.fillText("ESP32 (3.3V)", lx, ly + 50);
      ctx.fillStyle = C.text; ctx.fillText("IO 脚", lx, ly - 44);
      ctx.fillStyle = "#1c2733"; ctx.strokeStyle = C.accent; ctx.lineWidth = 2;
      roundRect(ctx, rx - 48, ly - 34, 96, 68, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.accent; ctx.fillText("5V 器件", rx, ly + 50);
      ctx.fillStyle = C.text; ctx.fillText("IO 脚", rx, ly - 44);
      var danger = sce === "A", warn = sce === "C", col = danger ? C.red : (warn ? C.yellow : C.green);
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx + 48, ly); ctx.lineTo(rx - 48, ly); ctx.stroke();
      if (sce === "A" || sce === "B") {
        ctx.fillStyle = C.red; ctx.textAlign = "left"; ctx.fillText("发送端: 5V 高电平", lx + 54, ly - 44);
        ctx.fillStyle = col; ctx.fillText(sce === "A" ? "❌ 直接灌 5V 进 3.3V 输入 → 可能烧 IO" : "✓ 电阻分压把 5V 降到 3.3V", rx - 210, ly - 44);
      } else {
        ctx.fillStyle = C.teal; ctx.textAlign = "left"; ctx.fillText("发送端: 3.3V 高电平", lx + 54, ly - 44);
        ctx.fillStyle = col; ctx.fillText(sce === "C" ? "⚠ 5V CMOS 的 Vih≈3.5V, 3.3V 可能读不准" : "✓ 转换芯片把 3.3V 抬到 5V", rx - 210, ly - 44);
      }
      var msg = {
        A: "危险: 5V 输出直连 3.3V 输入, 超出 IO 耐压, 可能永久损坏。务必加电平转换。",
        B: "正确: 两个电阻分压(如 10k+20k)把 5V 降到 3.3V 再进 ESP32, 简单低成本。",
        C: "隐患: 3.3V 的 HIGH 对 5V TTL(Vih≈2V)勉强可用, 但对 5V CMOS(Vih≈3.5V)可能低于阈值, 读错/不稳。",
        D: "正确: 用 TXS0108 / 74LVC 等电平转换芯片(或 MOSFET), 双向、干净、可靠。"
      }[sce];
      var r = readout(root); if (r) r.innerHTML = "<b>" + msg + "</b>";
    }
    draw();
  }

  /* ---------------- 19. 按键去抖 ---------------- */
  function debounce(canvas, root) {
    var pressBtn = root.querySelector("[data-ctrl='db-press']");
    var t0 = performance.now(), loop = 4;
    function rawVal(p) {
      if (p < 0.6) return 0;
      if (p < 0.72) { var q = (p - 0.6) / 0.12, seq = [1, 0, 1, 0, 1]; return seq[Math.floor(q * 5) % 5]; }
      if (p < 2.6) return 1;
      if (p < 2.72) { var q2 = (p - 2.6) / 0.12, seq2 = [0, 1, 0, 1, 0]; return seq2[Math.floor(q2 * 5) % 5]; }
      return 0;
    }
    function debVal(p) { return p < 0.6 ? 0 : (p < 2.6 ? 1 : 0); }
    function frame(t) {
      var s = getCtx(canvas), ctx = s.ctx, w = s.w, h = s.h; ctx.clearRect(0, 0, w, h);
      var p = ((t - t0) / 1000) % loop, x0 = 40, x1 = w - 20, top = 18, laneH = (h - top - 28) / 2;
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      [0.6, 2.6].forEach(function (ev) {
        var ex = x0 + (ev / loop) * (x1 - x0);
        ctx.beginPath(); ctx.moveTo(ex, top); ctx.lineTo(ex, top + laneH * 2); ctx.stroke();
        ctx.fillStyle = C.dim; ctx.font = "10px sans-serif"; ctx.textAlign = "center"; ctx.fillText(ev === 0.6 ? "按下" : "松开", ex, h - 6);
      });
      function lane(y, fn, color, label) {
        ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.beginPath();
        var prev = null;
        for (var x = x0; x <= x1; x += 2) {
          var xf = (x - x0) / (x1 - x0), v = fn(xf * loop), yy = y + (v ? -laneH * 0.32 : laneH * 0.32);
          if (prev === null) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); prev = v;
        }
        ctx.stroke();
        ctx.fillStyle = C.text; ctx.font = "12px sans-serif"; ctx.textAlign = "left"; ctx.fillText(label, 4, y + 4);
      }
      var rawCount = 0, debCount = 0, pr = 0, pd = 0, steps = 200;
      for (var i = 1; i <= steps; i++) {
        var tt = (i / steps) * loop; if (tt > p) break;
        var rv = rawVal(tt), dv = debVal(tt);
        if (rv === 1 && pr === 0) rawCount++; if (dv === 1 && pd === 0) debCount++;
        pr = rv; pd = dv;
      }
      lane(top + laneH * 0.5, rawVal, C.red, "实际按键 (带弹跳)");
      lane(top + laneH * 1.5, debVal, C.green, "软件读取 (已去抖)");
      var r = readout(root);
      if (r) r.innerHTML = "本周期原始读数跳变 <b>" + rawCount + "</b> 次(含抖动), 去抖后只判定 <b>" + debCount + "</b> 次有效按下 → 软件: 延时再采样; 硬件: 施密特 / DFF";
      requestAnimationFrame(frame);
    }
    if (pressBtn) pressBtn.addEventListener("click", function () { t0 = performance.now(); });
    requestAnimationFrame(frame);
  }

  /* ---------------- 20. 状态机 FSM (摩尔机示例) ---------------- */
  function fsm(canvas, root) {
    var states = ["关", "微亮", "全亮"], bright = [0, 0.25, 1], cur = 0;
    var btn = root.querySelector("[data-ctrl='fsm-press']");
    if (btn) btn.addEventListener("click", function () { cur = (cur + 1) % 3; draw(); });
    function draw() {
      var s = getCtx(canvas), ctx = s.ctx, w = s.w, h = s.h; ctx.clearRect(0, 0, w, h);
      var cx = w * 0.32, cy = h / 2, R = Math.min(w, h) * 0.24;
      var pos = [];
      for (var i = 0; i < 3; i++) { var a = -Math.PI / 2 + i * (Math.PI * 2 / 3); pos.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); }
      ctx.strokeStyle = C.wire; ctx.lineWidth = 2;
      for (var k = 0; k < 3; k++) {
        var a1 = pos[k], a2 = pos[(k + 1) % 3];
        ctx.beginPath(); ctx.moveTo(a1[0], a1[1]); ctx.lineTo(a2[0], a2[1]); ctx.stroke();
        var ang = Math.atan2(a2[1] - a1[1], a2[0] - a1[0]);
        var ax = a2[0] - Math.cos(ang) * 26, ay = a2[1] - Math.sin(ang) * 26;
        ctx.fillStyle = C.wire; ctx.beginPath(); ctx.moveTo(ax, ay);
        ctx.lineTo(ax - Math.cos(ang - 0.4) * 10, ay - Math.sin(ang - 0.4) * 10);
        ctx.lineTo(ax - Math.cos(ang + 0.4) * 10, ay - Math.sin(ang + 0.4) * 10);
        ctx.closePath(); ctx.fill();
      }
      for (var i = 0; i < 3; i++) {
        var active = i === cur;
        ctx.fillStyle = active ? C.accent : "#1c2733"; ctx.beginPath(); ctx.arc(pos[i][0], pos[i][1], active ? 26 : 20, 0, 7); ctx.fill();
        ctx.strokeStyle = active ? C.accent : C.grid; ctx.lineWidth = active ? 3 : 1.5; ctx.stroke();
        ctx.fillStyle = active ? "#fff" : C.text; ctx.font = "13px sans-serif"; ctx.textAlign = "center"; ctx.fillText(states[i], pos[i][0], pos[i][1] + 5);
      }
      var lx = w * 0.74, ly = h / 2, b = bright[cur];
      if (b > 0) { var g = ctx.createRadialGradient(lx, ly, 2, lx, ly, 46); g.addColorStop(0, "rgba(255,210,140," + (0.9 * b) + ")"); g.addColorStop(1, "rgba(255,210,140,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, 46, 0, 7); ctx.fill(); }
      ctx.fillStyle = b > 0.5 ? "#fff7e0" : (b > 0 ? "#bba56a" : "#3a4250"); ctx.beginPath(); ctx.arc(lx, ly, 22, 0, 7); ctx.fill();
      ctx.strokeStyle = C.wire; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = C.text; ctx.font = "13px sans-serif"; ctx.textAlign = "center"; ctx.fillText("输出亮度 " + Math.round(b * 100) + "%", lx, ly + 44);
      ctx.fillStyle = C.dim; ctx.textAlign = "left"; ctx.font = "12px sans-serif"; ctx.fillText("摩尔机: 输出只由当前状态决定", 20, 20);
      var r = readout(root); if (r) r.innerHTML = "状态: <b>" + states[cur] + "</b> (亮度 " + Math.round(b * 100) + "%) · 每次「按一下」转移 关→微亮→全亮→关。复杂协议(如解析 AT 指令)都用状态机避免混乱";
    }
    draw();
  }

  /* ---------------- 引脚图交互 (由 HTML 的 data-pin 触发) ---------------- */
  function initPinout() {
    var tip = document.createElement("div");
    tip.className = "pin-tip"; document.body.appendChild(tip);
    document.querySelectorAll("[data-pin]").forEach(function (el) {
      el.style.cursor = "pointer";
      el.addEventListener("mouseenter", function (e) {
        var d = JSON.parse(el.getAttribute("data-pin"));
        tip.innerHTML = "<b>" + d.name + "</b><div class='role'>" + d.role + "</div>" + (d.note ? "<div style='margin-top:6px;color:var(--text-soft)'>" + d.note + "</div>" : "");
        tip.classList.add("show");
      });
      el.addEventListener("mousemove", function (e) {
        tip.style.left = (e.clientX + 14) + "px";
        tip.style.top = (e.clientY + 14) + "px";
      });
      el.addEventListener("mouseleave", function () { tip.classList.remove("show"); });
    });
  }

  /* ---------------- 注册 ---------------- */
  var DEMOS = {
    currentFlow: currentFlow, blink: blink, pwm: pwm, adc: adc,
    pullResistor: pullResistor, i2c: i2c, wifiState: wifiState, espNow: espNow,
    rtos: rtos, webServer: webServer, deepSleep: deepSleep,
    capacitor: capacitor, voltageDivider: voltageDivider, transistor: transistor,
    binConv: binConv, karnaugh: karnaugh, dff: dff, levelShift: levelShift,
    debounce: debounce, fsm: fsm
  };

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("canvas[data-demo]").forEach(function (c) {
      var name = c.getAttribute("data-demo");
      var root = c.closest(".demo") || c.parentNode;
      if (DEMOS[name]) DEMOS[name](c, root);
    });
    initPinout();
  });
  window.ESP_DEMOS = DEMOS;
})();
