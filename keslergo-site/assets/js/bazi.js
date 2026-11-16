/* Kesler Go — Bazi (Four Pillars) calculator.
 * Runs entirely in the visitor's browser; nothing is sent anywhere.
 * Year & month pillars: solar calendar (Li Chun at solar longitude 315°, months at each solar term).
 * Day & hour pillars: true solar time for the chosen city (longitude offset + equation of time).
 * Day changes at 23:00 solar time (late Zi hour convention).
 */
(function () {
  'use strict';

  var STEMS = [
    ['甲', 'Jia', 'Wood', 'Yang'], ['乙', 'Yi', 'Wood', 'Yin'],
    ['丙', 'Bing', 'Fire', 'Yang'], ['丁', 'Ding', 'Fire', 'Yin'],
    ['戊', 'Wu', 'Earth', 'Yang'], ['己', 'Ji', 'Earth', 'Yin'],
    ['庚', 'Geng', 'Metal', 'Yang'], ['辛', 'Xin', 'Metal', 'Yin'],
    ['壬', 'Ren', 'Water', 'Yang'], ['癸', 'Gui', 'Water', 'Yin']
  ];
  var BRANCHES = [
    ['子', 'Zi', 'Rat', 'Water', 'Yang'], ['丑', 'Chou', 'Ox', 'Earth', 'Yin'],
    ['寅', 'Yin', 'Tiger', 'Wood', 'Yang'], ['卯', 'Mao', 'Rabbit', 'Wood', 'Yin'],
    ['辰', 'Chen', 'Dragon', 'Earth', 'Yang'], ['巳', 'Si', 'Snake', 'Fire', 'Yin'],
    ['午', 'Wu', 'Horse', 'Fire', 'Yang'], ['未', 'Wei', 'Goat', 'Earth', 'Yin'],
    ['申', 'Shen', 'Monkey', 'Metal', 'Yang'], ['酉', 'You', 'Rooster', 'Metal', 'Yin'],
    ['戌', 'Xu', 'Dog', 'Earth', 'Yang'], ['亥', 'Hai', 'Pig', 'Water', 'Yin']
  ];
  // Same order as the <option value="0..18"> list on the page.
  var CITIES = [
    { label: 'Manila', lon: 120.98, tz: 8 }, { label: 'Quezon City', lon: 121.04, tz: 8 },
    { label: 'Cebu City', lon: 123.89, tz: 8 }, { label: 'Davao City', lon: 125.61, tz: 8 },
    { label: 'Hong Kong', lon: 114.17, tz: 8 }, { label: 'Taipei', lon: 121.56, tz: 8 },
    { label: 'Shanghai', lon: 121.47, tz: 8 }, { label: 'Beijing', lon: 116.40, tz: 8 },
    { label: 'Singapore', lon: 103.82, tz: 8 }, { label: 'Kuala Lumpur', lon: 101.69, tz: 8 },
    { label: 'Jakarta', lon: 106.85, tz: 7 }, { label: 'Bangkok', lon: 100.50, tz: 7 },
    { label: 'Tokyo', lon: 139.69, tz: 9 }, { label: 'Sydney', lon: 151.21, tz: 10 },
    { label: 'Dubai', lon: 55.27, tz: 4 }, { label: 'London', lon: -0.13, tz: 0 },
    { label: 'New York', lon: -74.01, tz: -5 }, { label: 'Los Angeles', lon: -118.24, tz: -8 },
    { label: 'Toronto', lon: -79.38, tz: -5 }
  ];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'];

  function jdn(y, m, d) {
    var a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) -
      Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function mod(a, n) { return ((a % n) + n) % n; }

  function compute(s) {
    var y = parseInt(s.year, 10), m = parseInt(s.month, 10), d = parseInt(s.day, 10);
    if (!(y >= 1900 && y <= 2100)) return { error: 'Enter a birth year between 1900 and 2100.' };
    if (!(m >= 1 && m <= 12)) return { error: 'Enter a month from 1 to 12.' };
    var dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
    if (!(d >= 1 && d <= dim)) return { error: 'That day does not exist in the selected month.' };
    var known = !s.unknownTime, hh = 12, mi = 0;
    if (known) {
      hh = parseInt(s.hour, 10);
      mi = s.minute === '' ? 0 : parseInt(s.minute, 10);
      if (!(hh >= 0 && hh <= 23) || !(mi >= 0 && mi <= 59)) {
        return { error: 'Enter a time between 00:00 and 23:59, or mark the birth time as unknown.' };
      }
    }
    var city = CITIES[parseInt(s.city, 10)] || CITIES[0];

    // Sun's apparent longitude at the moment of birth (UT) → year and month pillars
    var base = jdn(y, m, d);
    var localMin = hh * 60 + mi;
    var n = base - 0.5 + (localMin - city.tz * 60) / 1440 - 2451545.0;
    var rad = Math.PI / 180;
    var g = (357.528 + 0.9856003 * n) * rad;
    var lam = mod(280.460 + 0.9856474 * n + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g), 360);
    var fromLiChun = mod(lam - 315, 360);
    var mIdx = Math.floor(fromLiChun / 30);
    var degInMonth = fromLiChun - mIdx * 30;
    var sy = (m <= 2 && mIdx >= 10) ? y - 1 : y;
    var ys = mod(sy - 4, 10), yb = mod(sy - 4, 12);
    var ms = ((ys % 5) * 2 + 2 + mIdx) % 10, mb = (mIdx + 2) % 12;

    // True solar time → day and hour pillars
    var doy = base - jdn(y, 1, 1) + 1;
    var B = 2 * Math.PI * (doy - 81) / 365;
    var eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
    var corr = (city.lon - city.tz * 15) * 4 + eot;
    var dayJ = base, sm = localMin;
    if (known) {
      sm = localMin + corr;
      if (sm < 0) { sm += 1440; dayJ -= 1; } else if (sm >= 1440) { sm -= 1440; dayJ += 1; }
    }
    var lateZi = known && sm >= 1380;
    var di = mod((lateZi ? dayJ + 1 : dayJ) + 49, 60);
    var ds = di % 10, db = di % 12;
    var hb = Math.floor((sm / 60 + 1) / 2) % 12;
    var hs = ((ds % 5) * 2 + hb) % 10;

    function pillar(label, zh, si, bi, isDay, isKnown) {
      var S = STEMS[si], Br = BRANCHES[bi];
      return { label: label, zh: zh, known: isKnown, isDay: isDay,
        stemChar: S[0], stemPy: S[1], stemDesc: S[3] + ' ' + S[2],
        branchChar: Br[0], branchPy: Br[1] + ' · ' + Br[2], branchDesc: Br[4] + ' ' + Br[3] };
    }
    var pillars = [
      pillar('Hour', '時柱', hs, hb, false, known),
      pillar('Day', '日柱', ds, db, true, true),
      pillar('Month', '月柱', ms, mb, false, true),
      pillar('Year', '年柱', ys, yb, false, true)
    ];

    var notes = [];
    if (known) {
      var smi = Math.floor(sm);
      notes.push('Clock time ' + pad(hh) + ':' + pad(mi) + ' in ' + city.label + ' corrected to true solar time ' +
        pad(Math.floor(smi / 60)) + ':' + pad(smi % 60) + ' (' + (corr >= 0 ? '+' : '−') + Math.abs(corr).toFixed(1) + ' min).');
    } else {
      notes.push('Birth time unknown: the Hour Pillar is omitted, and the Day and Month Pillars are calculated at local noon.');
    }
    notes.push('Year and Month Pillars follow the solar calendar: the year begins at Li Chun (立春), and each month at its solar term.');
    if (degInMonth < 0.6 || degInMonth > 29.4) {
      notes.push('This birth falls within about half a day of a solar-term boundary; the Month' +
        (mIdx === 0 || mIdx === 11 ? ' and Year Pillars' : ' Pillar') + ' should be confirmed.');
    }
    if (lateZi) {
      notes.push('Born between 23:00 and 24:00 solar time. This calculator changes the day at 23:00; some schools change it at midnight, which would alter the Day Pillar.');
    }
    var subtitle = d + ' ' + MONTHS[m - 1] + ' ' + y + (known ? ', ' + pad(hh) + ':' + pad(mi) : ', time unknown') + ' · ' + city.label;
    return { subtitle: subtitle, pillars: pillars, notes: notes };
  }

  function esc(t) {
    return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  var F = { futura: "'Futura', 'Futura PT', 'Jost', sans-serif", bask: "'Libre Baskerville', Baskerville, serif",
    soleil: "'Soleil', 'Figtree', sans-serif", han: "'Noto Serif SC', 'Songti SC', 'PingFang SC', serif" };

  function pillarHTML(p) {
    var top = p.isDay ? '#b00101' : '#000000', bg = p.isDay ? '#fffce1' : 'transparent';
    var inner;
    if (p.known) {
      inner =
        '<div style="display:flex;flex-direction:column;gap:22px">' +
        '<div>' +
        '<p style="margin:0 0 8px;font-family:' + F.bask + ';font-size:11px;letter-spacing:.08em">Heavenly Stem</p>' +
        '<p style="margin:0;font-family:' + F.han + ';font-size:60px;line-height:1.1">' + esc(p.stemChar) + '</p>' +
        '<p style="margin:8px 0 2px;font-family:' + F.futura + ';font-size:16px;font-weight:500">' + esc(p.stemPy) + '</p>' +
        '<p style="margin:0;font-family:' + F.bask + ';font-size:13px">' + esc(p.stemDesc) + '</p>' +
        '</div>' +
        '<div style="border-top:1px solid #e8d4a4;padding-top:22px">' +
        '<p style="margin:0 0 8px;font-family:' + F.bask + ';font-size:11px;letter-spacing:.08em">Earthly Branch</p>' +
        '<p style="margin:0;font-family:' + F.han + ';font-size:60px;line-height:1.1">' + esc(p.branchChar) + '</p>' +
        '<p style="margin:8px 0 2px;font-family:' + F.futura + ';font-size:16px;font-weight:500">' + esc(p.branchPy) + '</p>' +
        '<p style="margin:0;font-family:' + F.bask + ';font-size:13px">' + esc(p.branchDesc) + '</p>' +
        '</div></div>';
    } else {
      inner =
        '<div style="display:flex;flex-direction:column;gap:8px;padding-top:24px">' +
        '<p style="margin:0;font-size:60px;line-height:1.1;color:#c0a460">—</p>' +
        '<p style="margin:0;font-family:' + F.soleil + ';font-size:14px">Birth time unknown. The Hour Pillar is not calculated.</p>' +
        '</div>';
    }
    return '<div style="border-top:3px solid ' + top + ';background:' + bg + ';padding:22px 20px 28px;display:flex;flex-direction:column;gap:22px;border-right:1px solid #e8d4a4">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">' +
      '<span style="font-family:' + F.futura + ';font-size:12px;letter-spacing:.16em;text-transform:uppercase;font-weight:500">' + esc(p.label) + '</span>' +
      '<span style="font-family:' + F.han + ';font-size:13px">' + esc(p.zh) + '</span></div>' +
      inner + '</div>';
  }

  function render(r) {
    var errBox = document.getElementById('bz-error');
    var out = document.getElementById('bz-output');
    if (r.error) {
      errBox.textContent = r.error;
      errBox.hidden = false;
      out.innerHTML = '';
      return;
    }
    errBox.hidden = true;
    out.innerHTML =
      '<div style="display:flex;flex-direction:column;gap:32px">' +
      '<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:8px 32px">' +
      '<h2 style="margin:0;font-family:' + F.futura + ';font-weight:500;font-size:32px;line-height:1.15">The Four Pillars</h2>' +
      '<p style="margin:0;font-family:' + F.bask + ';font-size:14px">' + esc(r.subtitle) + '</p></div>' +
      '<div style="overflow-x:auto;border-top:1px solid #000;border-bottom:1px solid #000">' +
      '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));min-width:600px">' +
      r.pillars.map(pillarHTML).join('') + '</div></div>' +
      '<div><p style="margin:0 0 10px;font-family:' + F.futura + ';font-size:12px;letter-spacing:.22em;text-transform:uppercase">Calculation notes</p>' +
      '<ul style="margin:0;padding:0;list-style:none;border-top:1px solid #e8d4a4;font-family:' + F.soleil + ';font-size:14px;line-height:1.6">' +
      r.notes.map(function (t) { return '<li style="padding:12px 0;border-bottom:1px solid #e8d4a4">' + esc(t) + '</li>'; }).join('') +
      '</ul></div></div>';
  }

  function readForm() {
    return {
      year: document.getElementById('bz-y').value,
      month: document.getElementById('bz-m').value,
      day: document.getElementById('bz-d').value,
      hour: document.getElementById('bz-h').value,
      minute: document.getElementById('bz-min').value,
      unknownTime: document.getElementById('bz-unknown').checked,
      city: document.getElementById('bz-city').value
    };
  }

  function init() {
    var form = document.getElementById('bz-form');
    if (!form) return;
    // Sample values so a first-time visitor sees a chart straight away.
    document.getElementById('bz-y').value = '1990';
    document.getElementById('bz-m').value = '6';
    document.getElementById('bz-d').value = '15';
    document.getElementById('bz-h').value = '9';
    document.getElementById('bz-min').value = '30';
    document.getElementById('bz-city').value = '0';

    var unknown = document.getElementById('bz-unknown');
    unknown.addEventListener('change', function () {
      document.getElementById('bz-h').disabled = unknown.checked;
      document.getElementById('bz-min').disabled = unknown.checked;
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      render(compute(readForm()));
    });
    render(compute(readForm()));
  }

  // Exposed for testing in the browser console: KeslerBazi.compute({...})
  window.KeslerBazi = { compute: compute };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
