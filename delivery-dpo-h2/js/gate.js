/* Puerta de acceso del Menú Delivery DPO H2 (clave 031023).
   Dinámica: cada dígito es una parada de la ruta; el camión avanza y al completar la clave llega al CD.
   Se usa en la portada y en todas las páginas del menú (una sola vez por sesión). */
(function () {
  var PIN = "031023", KEY = "dpo-ok", PIH = "4007b530a1cf44b36d8260259a6491b0e53730ad5b718b92ffbf0ac33033ffce";
  var portada = !!document.currentScript && document.currentScript.hasAttribute("data-portada");
  var store = null; try { store = window.sessionStorage; store.getItem(KEY); } catch (e) { store = null; }
  if (store && store.getItem(KEY) === "1") return;
  if (!store && !portada) return; // sin memoria de sesión, solo pide la clave la portada
  var old = document.getElementById("gate"); if (old) old.remove();

  var h = new Date(Date.now() - 5 * 3600e3).getUTCHours();
  var saludo = h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
  var css = "" +
    "#dg{position:fixed;inset:0;z-index:2147483600;display:grid;grid-template-columns:minmax(0,1fr);place-items:center;padding:20px;overflow:hidden;box-sizing:border-box;background:#070707;color:#F4F1E8;font-family:Barlow,Arial,sans-serif;transition:opacity .6s,transform .6s}" +
    "#dg.fuera{opacity:0;transform:scale(1.04);pointer-events:none}" +
    "#dg .bg{position:absolute;inset:0;width:100%;height:100%}" +
    "#dg .bg path{fill:none;stroke:#E5B21C;stroke-width:1.4;stroke-dasharray:6 12;opacity:.28;animation:dgf 5s linear infinite}" +
    "#dg .bg path:nth-child(2n){animation-duration:8s;opacity:.18}#dg .bg path:nth-child(3n){animation-direction:reverse}" +
    "#dg .bg circle{fill:#FFE27A;animation:dgp 2.6s ease-in-out infinite}#dg .bg circle:nth-of-type(2n){animation-delay:1.3s}" +
    "@keyframes dgf{to{stroke-dashoffset:-180}}@keyframes dgp{0%,100%{opacity:.15;r:2}50%{opacity:.9;r:4}}" +
    "#dg::after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 42%,rgba(229,178,28,.16),rgba(7,7,7,.2) 40%,rgba(7,7,7,.92) 78%);pointer-events:none}" +
    "#dg .box{position:relative;z-index:1;width:100%;max-width:400px;min-width:0;text-align:center;animation:dgin .7s cubic-bezier(.2,.8,.2,1)}" +
    "@keyframes dgin{from{opacity:0;transform:translateY(18px)}}" +
    "#dg .k{font:700 12px 'JetBrains Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:#A6A093}" +
    "#dg h1{margin:8px 0 2px;font:900 clamp(40px,11vw,64px)/.95 'Big Shoulders Display',Impact,sans-serif;text-transform:uppercase;background:linear-gradient(100deg,#9A6F05,#E5B21C 30%,#FFF1B0 50%,#E5B21C 70%,#9A6F05);background-size:220% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:dgsh 4s linear infinite}" +
    "@keyframes dgsh{to{background-position:-220% 0}}" +
    "#dg .sub{font:800 22px 'Big Shoulders Display',Impact,sans-serif;text-transform:uppercase;color:#E5B21C;margin-bottom:22px}" +
    "#dg .hi{margin:0 0 14px;font-size:18px}#dg .hi b{color:#E5B21C}" +
    "#dg .ruta{position:relative;height:46px;margin:0 6px 6px}" +
    "#dg .via{position:absolute;left:0;right:0;top:30px;height:4px;border-radius:4px;background:repeating-linear-gradient(90deg,#3a352a 0 10px,transparent 10px 18px)}" +
    "#dg .avance{position:absolute;left:0;top:30px;height:4px;border-radius:4px;background:#E5B21C;box-shadow:0 0 10px #E5B21C;width:0;transition:width .35s}" +
    "#dg .cam{position:absolute;top:2px;left:0;font-size:26px;transform:translateX(-50%) scaleX(-1);transition:left .35s cubic-bezier(.3,1.4,.5,1)}" +
    "#dg .cd{position:absolute;right:-6px;top:6px;font:800 11px 'JetBrains Mono',monospace;color:#A6A093}" +
    "#dg .pins{position:relative;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin:4px 0 0}" +
    "#dg .pin{height:56px;border-radius:12px;border:1.5px solid #4a4434;background:#121210;display:grid;place-items:center;transition:border-color .2s,background .2s}" +
    "#dg .pin i{width:14px;height:14px;border-radius:50%;background:#E5B21C;transform:scale(0);transition:transform .25s cubic-bezier(.3,1.8,.5,1);box-shadow:0 0 12px #E5B21C}" +
    "#dg .pin.on{border-color:#E5B21C;background:#1d1a10}#dg .pin.on i{transform:scale(1)}" +
    "#dg .pin.cur{border-color:#FFE27A;animation:dgcur 1s ease-in-out infinite}@keyframes dgcur{50%{box-shadow:0 0 0 3px rgba(229,178,28,.25)}}" +
    "#dg.ok .pin{border-color:#2FBF71;background:#0f2118}#dg.ok .pin i{background:#2FBF71;box-shadow:0 0 12px #2FBF71}#dg.ok .avance{background:#2FBF71;box-shadow:0 0 10px #2FBF71}" +
    "#dg.err .pin{border-color:#E5484D;background:#240f10}#dg.err .pin i{background:#E5484D;box-shadow:none}#dg.err .pins{animation:dgsk .45s}" +
    "@keyframes dgsk{20%,60%{transform:translateX(-9px)}40%,80%{transform:translateX(9px)}}" +
    "#dg input{position:absolute;inset:0;width:100%;height:100%;opacity:0;border:0;font-size:16px;cursor:pointer}" +
    "#dg .msg{min-height:24px;margin:14px 0 0;font-size:15px;color:#A6A093}#dg.err .msg{color:#FF6B70}#dg.ok .msg{color:#2FBF71;font-weight:700;font-size:17px}" +
    "#dg .ver{display:inline-flex;gap:6px;align-items:center;margin-top:6px;background:none;border:0;color:#A6A093;font:600 13px Barlow,Arial,sans-serif;cursor:pointer;text-decoration:underline}" +
    "#dg .logo{display:block;width:118px;height:auto;margin:0 auto 10px;filter:drop-shadow(0 0 14px rgba(229,178,28,.55));animation:dgl .9s cubic-bezier(.2,1.6,.4,1) both,dgfl 3.2s ease-in-out .9s infinite}" +
    "@keyframes dgl{from{opacity:0;transform:scale(.3) rotate(-25deg)}}@keyframes dgfl{50%{transform:translateY(-8px) rotate(3deg);filter:drop-shadow(0 0 24px rgba(255,226,122,.85))}}" +
    "#dg.err .logo{animation:dgsk .45s}#dg.ok .logo{animation:dgwin .9s ease-in forwards}@keyframes dgwin{40%{transform:scale(1.25) rotate(-8deg)}100%{transform:scale(1.1) rotate(360deg);filter:drop-shadow(0 0 30px #2FBF71)}}" +
    "@media (max-height:640px){#dg .logo{width:84px}}" +
    "@media (prefers-reduced-motion:reduce){#dg *{animation:none!important;transition:none!important}}";

  var paths = "";
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  for (var n = 0; n < 9; n++) {
    var y = rnd(40, 760), y2 = rnd(40, 760);
    paths += '<path d="M-20 ' + y.toFixed(0) + ' C 300 ' + rnd(0, 800).toFixed(0) + ', 700 ' + rnd(0, 800).toFixed(0) + ', 1220 ' + y2.toFixed(0) + '"/>';
  }
  var dots = "";
  for (var m = 0; m < 14; m++) dots += '<circle cx="' + rnd(20, 1180).toFixed(0) + '" cy="' + rnd(20, 780).toFixed(0) + '" r="3"/>';

  var g = document.createElement("div");
  g.id = "dg"; g.setAttribute("role", "dialog"); g.setAttribute("aria-modal", "true"); g.setAttribute("aria-labelledby", "dg-t");
  g.innerHTML = '<style>' + css + '</style>' +
    '<svg class="bg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + paths + dots + '</svg>' +
    '<div class="box"><img class="logo" src="img/cd-callao-op.png" alt="CD Callao" onerror="this.remove()"><div class="k">Backus · CD Callao · T2</div>' +
    '<h1 id="dg-t">Delivery DPO</h1><div class="sub">H2 · CD Callao</div>' +
    '<p class="hi">' + saludo + ', <b>Mayra</b>. Ingresa tu clave de acceso</p>' +
    '<div class="ruta" aria-hidden="true"><div class="via"></div><div class="avance"></div><div class="cam">🚚</div><div class="cd">CD</div></div>' +
    '<div class="pins">' + '<div class="pin"><i></i></div>'.repeat(6) +
    '<input id="dg-i" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" aria-label="Clave de acceso de 6 dígitos"></div>' +
    '<p class="msg" role="status" aria-live="polite">Cada dígito es una parada de tu ruta</p>' +
    '<button class="ver" type="button">👁 Ver clave</button></div>';

  var root = document.body || document.documentElement;
  root.appendChild(g);
  document.documentElement.style.overflow = "hidden";

  var i = g.querySelector("input"), pins = g.querySelectorAll(".pin"), cam = g.querySelector(".cam"),
      av = g.querySelector(".avance"), msg = g.querySelector(".msg"), ver = g.querySelector(".ver"), visto = false;

  function pinta() {
    var v = i.value.replace(/\D/g, "").slice(0, 6);
    if (v !== i.value) i.value = v;
    for (var k = 0; k < 6; k++) {
      pins[k].classList.toggle("on", k < v.length);
      pins[k].classList.toggle("cur", k === v.length);
      pins[k].firstChild.textContent = "";
      pins[k].firstChild.style.cssText = visto && k < v.length ? "width:auto;height:auto;background:none;box-shadow:none;color:#FFE27A;font:800 24px 'JetBrains Mono',monospace" : "";
      if (visto && k < v.length) pins[k].firstChild.textContent = v[k];
    }
    var p = v.length / 6 * 100;
    cam.style.left = p + "%"; av.style.width = p + "%";
    return v;
  }
  function entrar() {
    try {
      if (store) { store.setItem(KEY, "1"); store.setItem("pib1-gate", PIH); }
    } catch (e) {}
    g.classList.add("ok"); i.blur(); i.disabled = true;
    msg.textContent = "¡Ruta completa! Bienvenida, Mayra 🚚";
    cam.style.left = "104%";
    setTimeout(function () { g.classList.add("fuera"); document.documentElement.style.overflow = ""; }, 950);
    setTimeout(function () { g.remove(); }, 1600);
  }
  i.addEventListener("input", function () {
    g.classList.remove("err");
    var v = pinta();
    msg.textContent = v.length ? "Parada " + v.length + " de 6" : "Cada dígito es una parada de tu ruta";
    if (v.length === 6) {
      if (v === PIN) entrar();
      else {
        g.classList.add("err"); msg.textContent = "Clave incorrecta. Vuelve a intentarlo.";
        if (navigator.vibrate) try { navigator.vibrate(120); } catch (e) {}
        setTimeout(function () { i.value = ""; pinta(); i.focus(); }, 650);
      }
    }
  });
  ver.addEventListener("click", function () { visto = !visto; ver.textContent = visto ? "🙈 Ocultar clave" : "👁 Ver clave"; pinta(); i.focus(); });
  pinta();
  setTimeout(function () { try { i.focus(); } catch (e) {} }, 80);
})();
