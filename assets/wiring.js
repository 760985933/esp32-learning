/* ============================================================
   ESP32 学习材料 · 实物接线图引擎 (纯 SVG · 离线 · 2D)
   直觉优先: 一眼看懂「这根线接到哪」
   用法: <div class="wiring" data-wiring="led"></div>
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 通用图元 ---------- */
  function board(o) {
    var x = o.x, y = o.y, w = o.w, h = o.h, s = "";
    s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="12" fill="#0e2a1c" stroke="#2a9d8f" stroke-width="2"/>';
    s += '<rect x="' + (x + w * 0.30) + '" y="' + (y - 9) + '" width="' + (w * 0.40) + '" height="11" rx="3" fill="#1c2733" stroke="#56606f"/>';
    s += '<rect x="' + (x + w * 0.26) + '" y="' + (y + h * 0.36) + '" width="' + (w * 0.48) + '" height="' + (h * 0.30) + '" rx="5" fill="#06140d" stroke="#2a9d8f"/>';
    s += '<text class="sch-label" x="' + (x + w / 2) + '" y="' + (y + h * 0.53) + '" text-anchor="middle">ESP32</text>';
    var pins = {};
    (o.pins || []).forEach(function (p) {
      var py = y + p.f * h, px = p.side === "L" ? x : x + w, dir = p.side === "L" ? -1 : 1;
      s += '<line x1="' + px + '" y1="' + py + '" x2="' + (px + dir * 16) + '" y2="' + py + '" stroke="' + (p.cls ? "" : "#56606f") + '" class="' + (p.cls || "") + '" stroke-width="3"/>';
      s += '<circle cx="' + (px + dir * 16) + '" cy="' + py + '" r="4" fill="#56606f"/>';
      s += '<text class="sch-label pin" x="' + (px + dir * 22) + '" y="' + (py + 3) + '" text-anchor="' + (p.side === "L" ? "end" : "start") + '">' + p.label + '</text>';
      pins[p.label] = { x: px + dir * 16, y: py };
    });
    return { svg: s, pins: pins };
  }

  function breadboard(x, y, w, h) {
    var s = "";
    s += '<rect class="sch-bb" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="10"/>';
    s += '<line x1="' + x + '" y1="' + (y + 20) + '" x2="' + (x + w) + '" y2="' + (y + 20) + '" stroke="#e05260" stroke-width="2" opacity=".5"/>';
    s += '<line x1="' + x + '" y1="' + (y + h - 20) + '" x2="' + (x + w) + '" y2="' + (y + h - 20) + '" stroke="#5aa9e6" stroke-width="2" opacity=".5"/>';
    s += '<line x1="' + x + '" y1="' + (y + h / 2) + '" x2="' + (x + w) + '" y2="' + (y + h / 2) + '" stroke="var(--surface-border)" stroke-width="1" stroke-dasharray="3 4"/>';
    return s;
  }

  function wire(pts, cls, label, lx, ly) {
    var d = "M" + pts[0][0] + " " + pts[0][1];
    for (var i = 1; i < pts.length; i++) d += " L" + pts[i][0] + " " + pts[i][1];
    var s = '<path class="sch-wire ' + cls + '" d="' + d + '"/>';
    if (label) s += '<text class="sch-label sm" x="' + lx + '" y="' + ly + '">' + label + '</text>';
    return s;
  }

  function dot(cx, cy, c) { return '<circle cx="' + cx + '" cy="' + cy + '" r="4" class="' + (c || "sch-dot") + '" fill="#56606f"/>'; }

  function led(cx, cy, on) {
    var s = "";
    if (on) s += '<circle cx="' + cx + '" cy="' + cy + '" r="18" fill="rgba(238,108,77,.22)"/>';
    s += '<line x1="' + (cx - 22) + '" y1="' + cy + '" x2="' + (cx - 12) + '" y2="' + cy + '" stroke="' + (on ? "var(--accent)" : "var(--text-faint)") + '" stroke-width="3"/>';
    s += '<path d="M' + (cx - 12) + ' ' + cy + ' L' + (cx + 2) + ' ' + (cy - 11) + ' L' + (cx + 2) + ' ' + (cy + 11) + ' Z" class="' + (on ? "sch-accent" : "sch-part") + '"/>';
    s += '<line x1="' + (cx + 2) + '" y1="' + (cy - 12) + '" x2="' + (cx + 2) + '" y2="' + (cy + 12) + '" stroke="' + (on ? "var(--accent)" : "var(--text-faint)") + '" stroke-width="3"/>';
    s += '<line x1="' + (cx + 2) + '" y1="' + cy + '" x2="' + (cx + 22) + '" y2="' + cy + '" stroke="' + (on ? "var(--accent)" : "var(--text-faint)") + '" stroke-width="3"/>';
    s += '<text class="sch-label sm" x="' + cx + '" y="' + (cy - 22) + '" text-anchor="middle">LED</text>';
    return s;
  }

  function resistor(x1, x2, y, label) {
    var s = '<path class="sch-wire" style="stroke:var(--text-soft)" d="M' + x1 + ' ' + y;
    var n = 6, seg = (x2 - x1) / n, i;
    for (i = 1; i <= n; i++) s += " L" + (x1 + seg * i) + " " + (y + (i % 2 ? -7 : 7));
    s += '"/>';
    s += '<text class="sch-label sm" x="' + ((x1 + x2) / 2) + '" y="' + (y - 12) + '" text-anchor="middle">' + label + '</text>';
    return s;
  }

  function button(cx, cy) {
    var s = "";
    s += '<line x1="' + (cx - 22) + '" y1="' + cy + '" x2="' + (cx - 8) + '" y2="' + cy + '" stroke="var(--text-soft)" stroke-width="3"/>';
    s += '<line x1="' + (cx + 8) + '" y1="' + cy + '" x2="' + (cx + 22) + '" y2="' + cy + '" stroke="var(--text-soft)" stroke-width="3"/>';
    s += '<rect x="' + (cx - 8) + '" y="' + (cy - 12) + '" width="16" height="24" rx="6" class="sch-part"/>';
    s += '<line x1="' + (cx - 8) + '" y1="' + cy + '" x2="' + (cx + 8) + '" y2="' + (cy - 9) + '" stroke="var(--accent)" stroke-width="3"/>';
    s += '<text class="sch-label sm" x="' + cx + '" y="' + (cy + 28) + '" text-anchor="middle">按钮</text>';
    return s;
  }

  function pot(cx, cy) {
    var s = "";
    s += '<rect x="' + (cx - 18) + '" y="' + (cy - 16) + '" width="36" height="30" rx="6" class="sch-part"/>';
    s += '<line x1="' + (cx - 12) + '" y1="' + (cy - 8) + '" x2="' + (cx - 12) + '" y2="' + (cy + 6) + '" stroke="var(--text-soft)" stroke-width="2"/>';
    s += '<line x1="' + (cx + 12) + '" y1="' + (cy - 8) + '" x2="' + (cx + 12) + '" y2="' + (cy + 6) + '" stroke="var(--text-soft)" stroke-width="2"/>';
    s += '<line x1="' + cx + '" y1="' + (cy + 6) + '" x2="' + cx + '" y2="' + (cy + 18) + '" stroke="var(--accent)" stroke-width="2"/>';
    s += '<text class="sch-label sm" x="' + cx + '" y="' + (cy + 32) + '" text-anchor="middle">电位器</text>';
    return s;
  }

  function oled(x, y, w, h) {
    var s = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="5" class="sch-part"/>';
    s += '<rect x="' + (x + 6) + '" y="' + (y + 6) + '" width="' + (w - 12) + '" height="' + (h - 12) + '" rx="2" fill="#0a0e13"/>';
    s += '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 4) + '" text-anchor="middle" fill="#39d98a" font-size="11" font-family="ui-monospace,monospace">OLED</text>';
    return s;
  }

  function motor(cx, cy) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="20" class="sch-part"/><text x="' + cx + '" y="' + (cy + 6) + '" text-anchor="middle" class="sch-label">M</text>';
  }

  function dht(x, y, w, h) {
    var s = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="4" class="sch-teal"/>';
    s += '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 4) + '" text-anchor="middle" class="sch-label">DHT</text>';
    return s;
  }

  function battery(cx, cy) {
    var s = '<rect x="' + (cx - 20) + '" y="' + (cy - 11) + '" width="40" height="22" rx="3" class="sch-part"/>';
    s += '<text class="sch-label sm" x="' + cx + '" y="' + (cy + 30) + '" text-anchor="middle">电池</text>';
    return s;
  }

  function legend() {
    var y = 350;
    return '<g class="sch-leg">' +
      '<line class="w-vcc" x1="30" y1="' + y + '" x2="58" y2="' + y + '"/>' +
      '<text x="62" y="' + (y + 4) + '" class="sch-label sm">电源 3.3V</text>' +
      '<line class="w-gnd" x1="170" y1="' + y + '" x2="198" y2="' + y + '"/>' +
      '<text x="202" y="' + (y + 4) + '" class="sch-label sm">GND 地</text>' +
      '<line class="w-sig" x1="290" y1="' + y + '" x2="318" y2="' + y + '"/>' +
      '<text x="322" y="' + (y + 4) + '" class="sch-label sm">信号 GPIO</text>' +
      '<line class="w-sda" x1="430" y1="' + y + '" x2="458" y2="' + y + '"/>' +
      '<text x="462" y="' + (y + 4) + '" class="sch-label sm">SDA</text>' +
      '<line class="w-scl" x1="520" y1="' + y + '" x2="548" y2="' + y + '"/>' +
      '<text x="552" y="' + (y + 4) + '" class="sch-label sm">SCL</text>' +
      '</g>';
  }

  function wrap(inner) {
    return '<svg viewBox="0 0 600 370" role="img" aria-label="实物接线图">' + inner + legend() + '</svg>';
  }

  /* ---------- 各接线图 ---------- */
  var BUILD = {
    // Blink: 外接 LED
    led: function () {
      var b = board({ x: 30, y: 70, w: 110, h: 230, pins: [
        { label: "GPIO2", side: "R", f: 0.32, cls: "w-sig" },
        { label: "GND", side: "R", f: 0.70, cls: "w-gnd" }
      ] });
      var g = b.pins["GPIO2"], gd = b.pins["GND"], cx = 440;
      var s = b.svg + breadboard(250, 70, 320, 230);
      s += wire([[g.x, g.y], [360, g.y]], "w-sig");
      s += resistor(360, 402, g.y, "220Ω");
      s += wire([[402, g.y], [cx - 22, g.y]], "w-sig");
      s += led(cx, g.y, true);
      s += wire([[cx + 22, g.y], [cx + 22, gd.y - 16], [gd.x, gd.y - 16], [gd.x, gd.y]], "w-gnd");
      return { svg: wrap(s), cap: "<b>外接 LED：</b>GPIO2 → 220Ω 电阻 → LED 长脚(阳极) → LED 短脚(阴极) → GND。多数开发板板载蓝灯已在 GPIO2，<b>什么都不接也能闪</b>。" };
    },

    // 按钮 + 内部上拉
    button: function () {
      var b = board({ x: 30, y: 60, w: 110, h: 240, pins: [
        { label: "GPIO4", side: "R", f: 0.40, cls: "w-sig" },
        { label: "GND", side: "R", f: 0.78, cls: "w-gnd" }
      ] });
      var g = b.pins["GPIO4"], gd = b.pins["GND"], cx = 440, cy = 175;
      var s = b.svg + breadboard(250, 60, 320, 240);
      // 内部上拉 (虚线到 3.3V)
      s += '<line x1="' + g.x + '" y1="' + g.y + '" x2="' + g.x + '" y2="' + (g.y - 40) + '" stroke="#e05260" stroke-width="2" stroke-dasharray="4 4"/>';
      s += '<text class="sch-label sm" x="' + (g.x + 6) + '" y="' + (g.y - 44) + '">内部上拉→3.3V</text>';
      s += wire([[g.x, g.y], [cx - 22, cy]], "w-sig");
      s += button(cx, cy);
      s += wire([[cx + 22, cy], [cx + 22, gd.y - 16], [gd.x, gd.y - 16], [gd.x, gd.y]], "w-gnd");
      return { svg: wrap(s), cap: "<b>按钮读输入：</b>按钮一端接 GPIO4、一端接 GND，代码中启用 <code>Pin.PULL_UP</code>。未按→被内部电阻拉高读 <b>1</b>；按下→直接接地读 <b>0</b>。" };
    },

    // ADC 电位器
    adc: function () {
      var b = board({ x: 30, y: 60, w: 110, h: 240, pins: [
        { label: "3V3", side: "R", f: 0.20, cls: "w-vcc" },
        { label: "GPIO34", side: "R", f: 0.50, cls: "w-sig" },
        { label: "GND", side: "R", f: 0.80, cls: "w-gnd" }
      ] });
      var v = b.pins["3V3"], g = b.pins["GPIO34"], gd = b.pins["GND"], cx = 440, cy = 175;
      var s = b.svg + breadboard(250, 60, 320, 240);
      s += wire([[v.x, v.y], [cx - 28, cy - 8]], "w-vcc", "3.3V", cx - 60, cy - 22);
      s += pot(cx, cy);
      s += wire([[cx + 28, cy - 8], [gd.x, gd.y - 16], [gd.x, gd.y]], "w-gnd");
      s += wire([[cx, cy + 18], [g.x, g.y]], "w-sig", "抽头", cx - 10, cy + 36);
      return { svg: wrap(s), cap: "<b>模拟输入：</b>电位器两端接 3.3V 与 GND，中间抽头(信号)接 ADC 引脚(GPIO34)。转动改变分压，芯片读到 <b>0~4095</b>。" };
    },

    // PWM 调光 (与 Blink 同接法)
    pwm: function () {
      var b = board({ x: 30, y: 70, w: 110, h: 230, pins: [
        { label: "GPIO2", side: "R", f: 0.32, cls: "w-sig" },
        { label: "GND", side: "R", f: 0.70, cls: "w-gnd" }
      ] });
      var g = b.pins["GPIO2"], gd = b.pins["GND"], cx = 440;
      var s = b.svg + breadboard(250, 70, 320, 230);
      s += wire([[g.x, g.y], [360, g.y]], "w-sig");
      s += resistor(360, 402, g.y, "220Ω");
      s += wire([[402, g.y], [cx - 22, g.y]], "w-sig");
      s += led(cx, g.y, true);
      s += wire([[cx + 22, g.y], [cx + 22, gd.y - 16], [gd.x, gd.y - 16], [gd.x, gd.y]], "w-gnd");
      s += '<text class="sch-label sm" x="250" y="300" >代码区别: 用 PWM 快速开关(调占空比)→看到的是平滑亮度, 不是单纯闪</text>';
      return { svg: wrap(s), cap: "<b>PWM 调光：</b>接线与 Blink 完全相同(GPIO→电阻→LED→GND)。差别只在代码——用 PWM 以很高频率开关，改变「亮的时间占比」来调亮度。" };
    },

    // I2C OLED
    oled: function () {
      var b = board({ x: 30, y: 70, w: 110, h: 230, pins: [
        { label: "3V3", side: "R", f: 0.18, cls: "w-vcc" },
        { label: "GPIO21 SDA", side: "R", f: 0.45, cls: "w-sda" },
        { label: "GPIO22 SCL", side: "R", f: 0.60, cls: "w-scl" },
        { label: "GND", side: "R", f: 0.82, cls: "w-gnd" }
      ] });
      var v = b.pins["3V3"], sda = b.pins["GPIO21 SDA"], scl = b.pins["GPIO22 SCL"], gd = b.pins["GND"];
      var s = b.svg + breadboard(250, 70, 320, 230);
      var ox = 360, oy = 120, ow = 150, oh = 90;
      s += oled(ox, oy, ow, oh);
      s += wire([[v.x, v.y], [ox + 30, oy - 14], [ox + 30, oy]], "w-vcc", "VCC", ox + 6, oy - 18);
      s += wire([[gd.x, gd.y], [ox + ow - 30, oy + oh + 14], [ox + ow - 30, oy + oh]], "w-gnd", "GND", ox + ow - 70, oy + oh + 18);
      s += wire([[sda.x, sda.y], [ox + 40, oy + 30], [ox + 40, oy + oh]], "w-sda", "SDA", ox + 16, oy + 50);
      s += wire([[scl.x, scl.y], [ox + ow - 40, oy + 20], [ox + ow - 40, oy + oh]], "w-scl", "SCL", ox + ow - 78, oy + 40);
      return { svg: wrap(s), cap: "<b>OLED(I2C)：</b>VCC→3.3V，GND→GND，SDA→GPIO21，SCL→GPIO22（ESP32 默认 I2C 引脚）。两根线就能挂多个设备。" };
    },

    // DHT 温湿度
    sensor: function () {
      var b = board({ x: 30, y: 70, w: 110, h: 230, pins: [
        { label: "3V3", side: "R", f: 0.18, cls: "w-vcc" },
        { label: "GPIO4", side: "R", f: 0.50, cls: "w-sig" },
        { label: "GND", side: "R", f: 0.82, cls: "w-gnd" }
      ] });
      var v = b.pins["3V3"], g = b.pins["GPIO4"], gd = b.pins["GND"];
      var s = b.svg + breadboard(250, 70, 320, 230);
      var dx = 370, dy = 140, dw = 90, dh = 70;
      s += dht(dx, dy, dw, dh);
      s += wire([[v.x, v.y], [dx + 20, dy - 14], [dx + 20, dy]], "w-vcc", "VCC", dx - 4, dy - 18);
      s += wire([[gd.x, gd.y], [dx + dw - 20, dy + dh + 14], [dx + dw - 20, dy + dh]], "w-gnd", "GND", dx + dw - 64, dy + dh + 18);
      s += wire([[g.x, g.y], [dx + dw / 2, dy - 14], [dx + dw / 2, dy]], "w-sig", "DATA", dx + dw / 2 - 24, dy - 18);
      s += '<line x1="' + (dx + dw / 2) + '" y1="' + dy + '" x2="' + (dx + dw / 2) + '" y2="' + (dy - 30) + '" stroke="#e05260" stroke-width="2" stroke-dasharray="3 3"/>';
      s += '<text class="sch-label sm" x="' + (dx + dw / 2 + 6) + '" y="' + (dy - 30) + '">+10k上拉(模块常已带)</text>';
      return { svg: wrap(s), cap: "<b>数字传感器(DHT)：</b>VCC→3.3V，GND→GND，DATA→任意 GPIO(如 GPIO4)。DATA 需 10k 上拉到 3.3V（多数模块板载）。" };
    },

    // L298N 电机
    motor: function () {
      var b = board({ x: 20, y: 60, w: 100, h: 250, pins: [
        { label: "GPIO13", side: "R", f: 0.35, cls: "w-sig" },
        { label: "GPIO12", side: "R", f: 0.55, cls: "w-sig" },
        { label: "GND", side: "R", f: 0.82, cls: "w-gnd" }
      ] });
      var in1 = b.pins["GPIO13"], in2 = b.pins["GPIO12"], gd = b.pins["GND"];
      var s = b.svg;
      // L298N 模块
      var lx = 200, ly = 90, lw = 150, lh = 150;
      s += '<rect x="' + lx + '" y="' + ly + '" width="' + lw + '" height="' + lh + '" rx="8" class="sch-part"/>';
      s += '<text class="sch-label" x="' + (lx + lw / 2) + '" y="' + (ly + 22) + '" text-anchor="middle">L298N</text>';
      s += wire([[in1.x, in1.y], [lx + 30, ly + 50]], "w-sig", "IN1", lx + 6, ly + 46);
      s += wire([[in2.x, in2.y], [lx + 30, ly + 80]], "w-sig", "IN2", lx + 6, ly + 76);
      s += wire([[gd.x, gd.y], [lx + 30, ly + 120], [lx + 30, ly + lh]], "w-gnd", "GND", lx + 6, ly + 124);
      // 电机
      var mx = 470, my = 175;
      s += wire([[lx + lw, ly + 60], [mx - 20, my]], "w-sig");
      s += wire([[lx + lw, ly + 95], [mx + 20, my]], "w-sig");
      s += motor(mx, my);
      // 外接电源
      s += battery(470, 290);
      s += wire([[lx + lw - 30, ly + lh], [430, 290]], "w-vcc", "12V", lx + lw - 70, 300);
      s += wire([[470, 310], [mx, 200]], "w-vcc");
      return { svg: wrap(s), cap: "<b>直流电机(L298N)：</b>ESP32 的 PWM 引脚→IN1/IN2 控制转向与速度；电机接 OUT 口；L298N 的 12V 与 GND 接<b>外接电源，并与 ESP32 共地</b>。勿直接用 GPIO 驱动电机！" };
    },

    // 深度睡眠 + 电池
    battery_sleep: function () {
      var b = board({ x: 30, y: 70, w: 110, h: 230, pins: [
        { label: "3V3", side: "R", f: 0.30, cls: "w-vcc" },
        { label: "GPIO0", side: "R", f: 0.55, cls: "w-sig" },
        { label: "GND", side: "R", f: 0.80, cls: "w-gnd" }
      ] });
      var v = b.pins["3V3"], g = b.pins["GPIO0"], gd = b.pins["GND"];
      var s = b.svg + breadboard(250, 70, 320, 230);
      // 稳压
      s += '<rect x="300" y="150" width="60" height="40" rx="6" class="sch-accent"/>';
      s += '<text class="sch-label sm" x="330" y="174" text-anchor="middle">3.3V 稳压</text>';
      s += wire([[v.x, v.y], [300, 170]], "w-vcc");
      // 电池
      s += battery(450, 250);
      s += wire([[450, 239], [330, 250], [330, 190]], "w-vcc", "电池+", 360, 244);
      s += wire([[450, 261], [gd.x, gd.y - 16], [gd.x, gd.y]], "w-gnd", "电池−", 470, 280);
      // 唤醒按钮
      s += button(450, 130);
      s += wire([[450 - 22, 130], [g.x, g.y]], "w-sig", "唤醒", 410, 116);
      return { svg: wrap(s), cap: "<b>电池供电 + 深度睡眠：</b>电池→3.3V 稳压→ESP32 的 3V3；电池−→GND。唤醒源(按钮/RTC)接 GPIO，平时进深度睡眠，电流仅几 μA。" };
    },

    // 面包板内部连通示意
    breadboard: function () {
      var x = 90, y = 60, w = 420, h = 240;
      var s = breadboard(x, y, w, h);
      // 高亮一行(横向5孔相通) 红框
      var ry = y + 70;
      s += '<rect x="' + (x + 60) + '" y="' + (ry - 12) + '" width="120" height="24" rx="4" fill="none" stroke="#e05260" stroke-width="2"/>';
      s += '<text class="sch-label sm" x="' + (x + 60) + '" y="' + (ry - 18) + '" fill="#e05260">同一行 5 孔相通</text>';
      // 高亮半列(纵向相通) 蓝框 (上半)
      var cxcol = x + 60 + 30;
      s += '<rect x="' + (cxcol - 12) + '" y="' + (y + 24) + '" width="24" height="90" rx="4" fill="none" stroke="#5aa9e6" stroke-width="2"/>';
      s += '<text class="sch-label sm" x="' + (cxcol - 12) + '" y="' + (y + 18) + '" fill="#5aa9e6">半列纵向相通</text>';
      // 跨凹槽跳线
      s += wire([[cxcol, y + 120], [cxcol, y + h - 60]], "w-sig", "跨凹槽要跳线", cxcol + 10, y + h / 2);
      s += dot(cxcol, y + 120); s += dot(cxcol, y + h - 60);
      return { svg: wrap(s), cap: "<b>面包板内部连通规律：</b>中间凹槽<b>上方</b>每一列(5 孔)竖直接通、下方每一列也接通，但上下<b>不互通</b>；外侧两条长槽是电源轨（整条相通）。跨凹槽的信号必须用电线引过去。" };
    },

    // 红外接收头
    ir: function () {
      var b = board({ x: 30, y: 70, w: 110, h: 230, pins: [
        { label: "3V3", side: "R", f: 0.18, cls: "w-vcc" },
        { label: "GPIO4", side: "R", f: 0.50, cls: "w-sig" },
        { label: "GND", side: "R", f: 0.82, cls: "w-gnd" }
      ] });
      var v = b.pins["3V3"], g = b.pins["GPIO4"], gd = b.pins["GND"];
      var s = b.svg + breadboard(250, 70, 320, 230);
      var ix = 400, iy = 130, iw = 84, ih = 100;
      s += '<rect x="' + ix + '" y="' + (iy + 22) + '" width="' + iw + '" height="' + (ih - 22) + '" rx="4" class="sch-part"/>';
      s += '<path d="M' + ix + ' ' + (iy + 22) + ' Q ' + (ix + iw / 2) + ' ' + iy + ' ' + (ix + iw) + ' ' + (iy + 22) + '" class="sch-part"/>';
      s += '<text class="sch-label" x="' + (ix + iw / 2) + '" y="' + (iy + ih - 8) + '" text-anchor="middle">IR 接收</text>';
      s += wire([[v.x, v.y], [ix + 22, iy - 8], [ix + 22, iy + 22]], "w-vcc", "VCC", ix - 2, iy - 12);
      s += wire([[gd.x, gd.y], [ix + iw - 22, iy + ih + 12], [ix + iw - 22, iy + ih]], "w-gnd", "GND", ix + iw - 66, iy + ih + 16);
      s += wire([[g.x, g.y], [ix + iw / 2, iy - 8], [ix + iw / 2, iy + 22]], "w-sig", "OUT", ix + iw / 2 - 22, iy - 12);
      return { svg: wrap(s), cap: "<b>红外接收头(如 VS1838)：</b>VCC→3.3V，GND→GND，OUT→任意 GPIO(如 GPIO4)。它把遥控器红外信号解调成数字脉冲，用 ir 库即可识别按键。多数模块已带滤波。</b>" };
    }
  };

  /* ---------- 注入 ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".wiring[data-wiring]").forEach(function (el) {
      var d = BUILD[el.getAttribute("data-wiring")];
      if (!d) return;
      var o = d();
      el.innerHTML =
        '<div class="w-head"><span class="pulse"></span><b>实物接线图</b>' +
        '<span class="hint">按颜色对线 · 红=电源 灰=地 琥珀=信号</span></div>' +
        '<div class="w-body">' + o.svg + '</div>' +
        '<div class="w-cap">' + o.cap + '</div>';
    });
  });
})();
