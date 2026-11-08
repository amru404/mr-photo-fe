// @ts-nocheck — imperative SVG port of the isometric studio (dashboard_studio_fotografer_filter.html).
/**
 * An isometric studio floor with six workflow stations. A photographer and a
 * client walk between them; selecting a station sends both there and plays
 * that stage's animation (shooting, typing, picking, editing, sending,
 * celebrating). React owns the selection and the counts; this owns the SVG.
 */

export interface StudioStation {
  label: string;
  color: "purple" | "blue" | "teal" | "coral" | "amber" | "green";
}

export interface StudioScene {
  setActive(index: number): void;
  setCounts(counts: number[]): void;
  destroy(): void;
}

const S = 22, K = 0.866 * S, H = 0.5 * S, OX = 190, OY = 95, AY = 3.75, Z = 0.25;

export const STUDIO_COLORS = {
  purple: { t: "#CECBF6", l: "#AFA9EC", r: "#7F77DD", d: "#3C3489" },
  blue: { t: "#B5D4F4", l: "#85B7EB", r: "#378ADD", d: "#0C447C" },
  teal: { t: "#9FE1CB", l: "#5DCAA5", r: "#1D9E75", d: "#085041" },
  coral: { t: "#F5C4B3", l: "#F0997B", r: "#D85A30", d: "#712B13" },
  amber: { t: "#FAC775", l: "#EF9F27", r: "#BA7517", d: "#633806" },
  green: { t: "#C0DD97", l: "#97C459", r: "#639922", d: "#27500A" },
};

const C = {
  ...STUDIO_COLORS,
  gray: { t: "#D3D1C7", l: "#B4B2A9", r: "#888780" },
  W: { t: "#FFFFFF", l: "#F1EFE8", r: "#D3D1C7" },
  LB: { t: "#E6F1FB", l: "#B5D4F4", r: "#85B7EB" },
  LA: { t: "#FAEEDA", l: "#FAC775", r: "#EF9F27" },
};

const POS = [
  { x: 0.5, y: 0.7, zt: 2.0 },
  { x: 4.3, y: 0.7, zt: 1.8 },
  { x: 8.1, y: 0.7, zt: 1.2 },
  { x: 8.1, y: 4.8, zt: 1.7 },
  { x: 4.3, y: 4.8, zt: 1.7 },
  { x: 0.5, y: 4.8, zt: 1.9 },
];

function P(x, y, z) {
  return [OX + (x - y) * K, OY + (x + y) * H - z * S];
}
function pts(a) {
  return a.map((p) => { const q = P(p[0], p[1], p[2]); return q[0].toFixed(1) + "," + q[1].toFixed(1); }).join(" ");
}
function face(a, f, cls?, k?, fc?) {
  return '<polygon points="' + pts(a) + '" style="fill:' + f + ';stroke:rgba(0,0,0,.14);stroke-width:.5;stroke-linejoin:round"' +
    (cls ? ' class="' + cls + '"' : "") + (k ? ' data-k="' + k + '" data-f="' + fc + '"' : "") + "/>";
}
function box(x, y, z, w, d, h, c, cls?, k?) {
  const t = z + h;
  return face([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, t], [x, y + d, t]], c.l, 0, k, "l") +
    face([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, t], [x + w, y, t]], c.r, 0, k, "r") +
    face([[x, y, t], [x + w, y, t], [x + w, y + d, t], [x, y + d, t]], c.t, cls, k, "t");
}
function hx(h) {
  return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)];
}
function mix(a, b, u) {
  const A = hx(a), B = hx(b);
  return "rgb(" + Math.round(A[0] + (B[0] - A[0]) * u) + "," + Math.round(A[1] + (B[1] - A[1]) * u) + "," + Math.round(A[2] + (B[2] - A[2]) * u) + ")";
}
function ob(i, px, py, c) {
  if (i === 0) return box(px + 0.5, py + 0.3, Z, 1.6, 0.2, 1.3, C.W) + box(px + 0.5, py + 0.5, Z + 0.9, 1.6, 0.06, 0.4, c) + box(px + 0.5, py + 1.1, Z, 0.4, 0.4, 0.3, c) + box(px + 1.1, py + 1.1, Z, 0.4, 0.4, 0.3, C.W);
  if (i === 1 || i === 4) { const k = i === 1 ? "scrUp" : "scrSend"; return box(px + 0.5, py + 0.8, Z, 1.6, 1.0, 0.12, C.W) + box(px + 0.5, py + 0.8, Z + 0.12, 1.6, 0.1, 0.9, c, 0, k); }
  if (i === 2) { let s = box(px + 0.3, py + 0.3, Z, 2.0, 1.5, 0.25, C.W); for (let j = 0; j < 2; j++) for (let a = 0; a < 3; a++) s += box(px + 0.4 + a * 0.62, py + 0.4 + j * 0.68, Z + 0.25, 0.5, 0.55, 0.05, C.gray, 0, "tile" + (j * 3 + a)); return s; }
  if (i === 3) return box(px + 0.3, py + 0.4, Z, 2.0, 1.3, 0.45, C.gray) + box(px + 1.2, py + 0.55, Z + 0.45, 0.2, 0.2, 0.15, C.gray) + box(px + 0.7, py + 0.5, Z + 0.6, 1.2, 0.1, 0.8, C.gray, 0, "mon") + box(px + 0.8, py + 1.0, Z + 0.45, 1.0, 0.35, 0.05, C.W);
  return box(px + 0.4, py + 0.4, Z, 1.0, 0.1, 1.2, C.W) + box(px + 0.5, py + 0.5, Z + 0.15, 0.8, 0.05, 0.9, C.gray, 0, "frA") + box(px + 1.4, py + 0.9, Z, 0.8, 0.1, 0.9, C.W) + box(px + 1.5, py + 1.0, Z + 0.12, 0.6, 0.05, 0.65, C.gray, 0, "frB");
}

export function mountStudio(container: HTMLElement, stations: StudioStation[], onSelect: (index: number) => void): StudioScene {
  const ST = stations.map((s, i) => ({ n: s.label, c: s.color, ...POS[i] }));
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  let o = '<svg viewBox="0 0 440 345" width="100%" style="display:block;overflow:visible" role="img" aria-label="Isometric studio with six workflow stations">';
  o += box(0, 0, -0.3, 12.2, 9, 0.3, { t: "var(--raised)", l: "var(--line)", r: "var(--control)" });
  o += face([[0.2, 2.9, 0], [12, 2.9, 0], [12, 4.6, 0], [0.2, 4.6, 0]], "var(--active)");
  const a0 = P(0.6, AY, 0.02), a1 = P(11.6, AY, 0.02);
  o += '<line class="studio-flow" x1="' + a0[0].toFixed(1) + '" y1="' + a0[1].toFixed(1) + '" x2="' + a1[0].toFixed(1) + '" y2="' + a1[1].toFixed(1) + '" style="stroke:var(--faint);stroke-width:1.5;stroke-dasharray:5 7"/>';
  const ord = [0, 1, 2, 3, 4, 5].sort((a, b) => (ST[a].x + ST[a].y) - (ST[b].x + ST[b].y));
  ord.forEach((i) => {
    const s = ST[i];
    o += '<g class="studio-clk st" data-s="' + i + '" style="cursor:pointer">' + box(s.x, s.y, 0, 3.4, 2.0, Z, C.gray, "ptop") + ob(i, s.x, s.y, C[s.c]) + "</g>";
  });
  o += '<g data-pins="1">';
  ST.forEach((s, i) => {
    const col = C[s.c], q = P(s.x + 1.3, s.y + 1.0, s.zt), w = 100;
    o += '<g class="pin" data-s="' + i + '" style="cursor:pointer"><line x1="' + q[0].toFixed(1) + '" y1="' + (q[1] - 12).toFixed(1) + '" x2="' + q[0].toFixed(1) + '" y2="' + q[1].toFixed(1) + '" style="stroke:' + col.r + ';stroke-width:1.5"/>' +
      '<rect class="pinr" x="' + (q[0] - w / 2).toFixed(1) + '" y="' + (q[1] - 34).toFixed(1) + '" width="' + w + '" height="22" rx="6" style="fill:' + col.t + ";stroke:" + col.r + ';stroke-width:.5"/>' +
      '<text class="pint" x="' + q[0].toFixed(1) + '" y="' + (q[1] - 19).toFixed(1) + '" text-anchor="middle" style="font-size:11.5px;font-weight:600;fill:' + col.d + '">' + s.n + "</text></g>";
  });
  o += '</g><g data-fx="1">';
  for (let i = 0; i < 5; i++) o += '<rect class="chip" width="8" height="6" rx="1.5" style="display:none;stroke-width:.5"/>';
  for (let i = 0; i < 24; i++) o += '<rect class="cf" width="4" height="6" style="display:none"/>';
  for (let i = 0; i < 6; i++) o += '<polyline class="ck" points="-4,0 -1,3 4,-3" style="display:none;fill:none;stroke:#085041;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round"/>';
  o += '<g class="flash" style="display:none"><circle r="3" style="fill:#FAC775"/>';
  for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4; o += '<line x1="' + (5 * Math.cos(an)).toFixed(1) + '" y1="' + (5 * Math.sin(an)).toFixed(1) + '" x2="' + (11 * Math.cos(an)).toFixed(1) + '" y2="' + (11 * Math.sin(an)).toFixed(1) + '" style="stroke:#EF9F27;stroke-width:1.5;stroke-linecap:round"/>'; }
  o += "</g></g></svg>";
  container.innerHTML = o;

  const svg = container.querySelector("svg");
  const pinsG = svg.querySelector("[data-pins]");
  const stOrder = ord.map((i) => ({ g: svg.querySelector('.st[data-s="' + i + '"]'), px: ST[i].x, py: ST[i].y }));
  const KE = {};
  svg.querySelectorAll("[data-k]").forEach((e) => { (KE[e.dataset.k] = KE[e.dataset.k] || []).push(e); });
  function setK(k, c0, c1, u) {
    const a = KE[k]; if (!a) return;
    const kk = [u.toFixed(2), c0.t, c1.t].join("|");
    if (a._v === kk) return; a._v = kk;
    a.forEach((e) => { e.style.fill = mix(c0[e.dataset.f], c1[e.dataset.f], u); });
  }
  function figInner(shirt, shirtD, hair, cam, tail) {
    return '<ellipse cx="0" cy="0" rx="9" ry="3.5" style="fill:rgba(0,0,0,.25)"/><g class="jmp"><g class="flp">' +
      '<rect class="legB" x="-4" y="-13" width="4" height="13" rx="2" style="fill:#444441"/>' +
      '<rect class="legF" x="0" y="-13" width="4" height="13" rx="2" style="fill:#2C2C2A"/>' +
      '<rect class="armB" x="-2.75" y="-25" width="3.5" height="12" rx="1.7" style="fill:' + shirtD + '"/>' +
      '<rect x="-7" y="-27" width="14" height="16" rx="5" style="fill:' + shirt + '"/>' +
      (tail ? '<circle cx="-7" cy="-32" r="3.2" style="fill:' + hair + '"/>' : "") +
      '<circle cx="0" cy="-34" r="6.5" style="fill:#F5C4B3"/>' +
      '<path d="M-6.8 -33 A6.8 6.8 0 0 1 6.8 -33 Q0 -36.5 -6.8 -33Z" style="fill:' + hair + '"/>' +
      '<circle cx="3" cy="-33" r="0.9" style="fill:#2C2C2A"/>' +
      '<rect class="armF" x="0.25" y="-25" width="3.5" height="12" rx="1.7" style="fill:' + shirt + '"/>' +
      (cam ? '<g class="cam"><rect x="-6" y="-4" width="12" height="8" rx="1.5" style="fill:#2C2C2A"/><circle cx="4" cy="0" r="2.6" style="fill:#85B7EB"/></g>' : "") +
      "</g></g>";
  }
  function mkW(x, y, shirt, shirtD, hair, cam, tail, faceDir, wait) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.innerHTML = figInner(shirt, shirtD, hair, cam, tail);
    svg.insertBefore(g, pinsG);
    return {
      g, x, y, z: 0, face: faceDir, path: [], moving: false, fresh: true, ctrl: false, sp: 2.4, wait,
      flp: g.querySelector(".flp"), jmp: g.querySelector(".jmp"), legB: g.querySelector(".legB"), legF: g.querySelector(".legF"),
      armB: g.querySelector(".armB"), armF: g.querySelector(".armF"), cam: g.querySelector(".cam"),
    };
  }
  const ph = mkW(3.2, 2.2, "#C8401C", "#7A2510", "#2C2C2A", true, false, -1, 0.4);
  const cl = mkW(2.2, 3.6, "#378ADD", "#0C447C", "#444441", false, true, 1, 2.2);
  function zAt(x, y) { for (let i = 0; i < 6; i++) { const s = ST[i]; if (x >= s.x && x <= s.x + 3.4 && y >= s.y && y <= s.y + 2.0) return Z; } return 0; }
  function place(w) {
    let before = null;
    for (let k = 0; k < stOrder.length; k++) {
      const s = stOrder[k], front = (w.x >= s.px + 3.4 || w.y >= s.py + 2.0), back = !front && (w.x <= s.px || w.y <= s.py);
      if (back) { before = s.g; break; }
    }
    svg.insertBefore(w.g, before || pinsG);
  }
  function fixPair() {
    const a = ph.x + ph.y, b = cl.x + cl.y, nodes = Array.prototype.slice.call(svg.childNodes);
    const order = nodes.indexOf(ph.g) - nodes.indexOf(cl.g);
    if (a > b && order < 0) svg.insertBefore(ph.g, cl.g.nextSibling);
    else if (b > a && order > 0) svg.insertBefore(cl.g, ph.g.nextSibling);
  }
  function plan(w, tx, ty) {
    const p = [];
    if (Math.abs(w.y - AY) > 0.35) p.push([w.x, AY]);
    if (Math.abs(w.x - tx) > 0.05) p.push([tx, AY]);
    p.push([tx, ty]);
    w.path = p;
  }
  function stepW(w, dt) {
    const was = w.moving;
    if (w.path.length) {
      const t = w.path[0], dx = t[0] - w.x, dy = t[1] - w.y, d = Math.sqrt(dx * dx + dy * dy), st = w.sp * dt;
      if (d <= st) { w.x = t[0]; w.y = t[1]; w.path.shift(); } else { w.x += dx / d * st; w.y += dy / d * st; }
      const sd = dx - dy; if (Math.abs(sd) > 0.01) w.face = sd > 0 ? 1 : -1;
      w.moving = true;
    } else w.moving = false;
    if (was && !w.moving) w.wait = 1.2 + Math.random() * 2.5;
    w.z += (zAt(w.x, w.y) - w.z) * Math.min(1, dt * 14);
  }
  const WP = [[3.2, 2.2], [7.0, 2.2], [11.1, 1.3], [10.8, 6.3], [7.0, 6.3], [3.5, 5.4], [2.2, 3.6], [5.5, 3.75], [9.0, 3.75], [1.2, 3.75], [11.2, 3.75], [10.8, 2.2], [3.2, 6.3]];
  function wander(w) {
    const other = w === ph ? cl : ph, ot = other.path.length ? other.path[other.path.length - 1] : [other.x, other.y];
    let t = null;
    for (let k = 0; k < 8; k++) {
      const c = WP[Math.floor(Math.random() * WP.length)];
      if (Math.hypot(c[0] - w.x, c[1] - w.y) > 2 && Math.hypot(c[0] - ot[0], c[1] - ot[1]) > 1.4) { t = c; break; }
    }
    if (!t) { w.wait = 1; return; }
    w.sp = 2.4; plan(w, t[0], t[1]);
  }
  function pose(w, m, t) {
    let lb = 0, lf = 0, ab = 0, af = 0, bob = 0, jump = 0, cam = 0, s;
    if (m === "walk") { const f = w.sp > 3 ? 10 : 7; s = Math.sin(t * f); lb = 26 * s; lf = -26 * s; ab = -20 * s; af = 20 * s; bob = -Math.abs(s) * 1.5; }
    else if (m === "shoot") { ab = -108; af = -116; cam = 1; }
    else if (m === "type") { s = Math.sin(t * 13); ab = -52 + 7 * s; af = -60 - 7 * s; bob = 0.5 * s; }
    else if (m === "point") { af = -72 + 16 * Math.sin(t * 3.4); ab = 3; }
    else if (m === "wave") { af = -150 + 12 * Math.sin(t * 7); ab = 6; }
    else if (m === "out") { af = -45; ab = 45; }
    else if (m === "cheer") { s = Math.sin(t * 6); af = -165 + 10 * Math.sin(t * 9); ab = 165 - 10 * Math.sin(t * 9 + 1); jump = Math.abs(s) * 6; lb = 6 * s; lf = -6 * s; }
    else { s = Math.sin(t * 2); ab = 3 * s; af = -3 * s; bob = 0.5 * s; }
    w.legB.setAttribute("transform", "rotate(" + lb.toFixed(1) + " -2 -13)");
    w.legF.setAttribute("transform", "rotate(" + lf.toFixed(1) + " 2 -13)");
    w.armB.setAttribute("transform", "rotate(" + ab.toFixed(1) + " -1 -25)");
    w.armF.setAttribute("transform", "rotate(" + af.toFixed(1) + " 2 -25)");
    w.jmp.setAttribute("transform", "translate(0 " + (bob - jump).toFixed(1) + ")");
    if (w.cam) w.cam.setAttribute("transform", cam ? "translate(11 -31)" : "translate(5 -19)");
  }
  const spotPh = (i) => [[3.2, 2.2], [7.0, 2.2], [11.1, 1.3], [10.8, 6.3], [7.0, 6.3], [3.5, 5.4]][i];
  const spotCl = (i) => [[2.2, 3.6], null, [10.8, 2.2], null, null, [3.2, 6.3]][i];
  const CH = [1, 0, 1, 1, 0, 1];
  let active = -1, phase = "idle", loopT = 0, shotIdx = -1, flashT = 9, T = 0, fuS = 0, cfT = 0;
  const chips = svg.querySelectorAll(".chip"), cfs = svg.querySelectorAll(".cf"), cks = svg.querySelectorAll(".ck"), flash = svg.querySelector(".flash");
  const cfd = []; for (let i = 0; i < 24; i++) cfd.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, r: 0, c: "#7F77DD" });
  const CFC = ["#7F77DD", "#1D9E75", "#D85A30", "#EF9F27", "#378ADD", "#639922", "#D4537E"];
  const lp1 = P(ST[1].x + 1.3, ST[1].y + 1.3, 0.95), lp4 = P(ST[4].x + 1.3, ST[4].y + 1.3, 0.95);

  function refresh() {
    svg.querySelectorAll(".st").forEach((g) => {
      const on = +g.dataset.s === active, t = g.querySelector(".ptop");
      g.style.opacity = active < 0 || on ? 1 : 0.45;
      t.style.stroke = on ? "var(--accent)" : "rgba(0,0,0,.14)";
      t.style.strokeWidth = on ? 2.5 : 0.5;
    });
    svg.querySelectorAll(".pin").forEach((g) => {
      const on = +g.dataset.s === active;
      g.style.opacity = active < 0 || on ? 1 : 0.5;
      g.querySelector(".pinr").style.strokeWidth = on ? 2 : 0.5;
    });
  }

  function setActive(i) {
    if (i === active) return;
    active = i;
    if (active < 0) {
      ph.ctrl = false; cl.ctrl = false; ph.wait = 0.3; cl.wait = 0.9; phase = "idle";
    } else {
      ph.ctrl = true; ph.sp = 4.2; const a = spotPh(active); plan(ph, a[0], a[1]);
      const b = spotCl(active);
      if (b) { cl.ctrl = true; cl.sp = 4.2; plan(cl, b[0], b[1]); } else if (cl.ctrl) { cl.ctrl = false; cl.wait = 0.3; }
      phase = "walking"; loopT = 0; shotIdx = -1; flashT = 9;
    }
    refresh();
  }

  function setCounts(counts) {
    svg.querySelectorAll(".pin").forEach((g) => {
      const i = +g.dataset.s;
      g.querySelector(".pint").textContent = ST[i].n + " · " + (counts[i] ?? 0);
    });
  }

  function update(dt) {
    T += dt;
    stepW(ph, dt); stepW(cl, dt);
    if (active >= 0) {
      if (phase === "walking" && ph.path.length === 0 && (!cl.ctrl || cl.path.length === 0)) { phase = "working"; loopT = 0; shotIdx = -1; }
      if (phase === "working") loopT += dt;
    }
    [ph, cl].forEach((w) => { if (!w.ctrl && !w.moving) { w.wait -= dt; if (w.wait <= 0) wander(w); } });
    const work = active >= 0 && phase === "working";
    let mp = "idle", mc = "idle";
    if (ph.moving) mp = "walk";
    if (cl.moving) mc = "walk";
    if (work) {
      if (active === 0) { mp = "shoot"; ph.face = -1; cl.face = 1; const si = Math.floor(loopT / 1.1); if (si !== shotIdx) { shotIdx = si; flashT = 0; } mc = shotIdx % 2 ? "out" : "wave"; }
      else if (active === 1 || active === 3 || active === 4) { mp = "type"; ph.face = -1; }
      else if (active === 2) { mc = "point"; cl.face = -1; ph.face = -1; }
      else { mp = "cheer"; mc = "cheer"; ph.face = -1; cl.face = -1; }
    }
    pose(ph, mp, T); pose(cl, mc, T + 1.3);
    [ph, cl].forEach((w) => {
      const q = P(w.x, w.y, w.z);
      w.g.setAttribute("transform", "translate(" + q[0].toFixed(1) + " " + q[1].toFixed(1) + ")");
      w.flp.setAttribute("transform", "scale(" + w.face + " 1)");
      if (w.moving || w.fresh) { place(w); w.fresh = false; }
    });
    if (ph.moving || cl.moving) fixPair();
    let pp = -1;
    if (work && active === 2) { const u0 = (loopT % 8) / 6; pp = u0 > 1 ? 1.01 : u0; }
    for (let k = 0; k < 6; k++) {
      const a = k / 6, b = (k + 1) / 6, tf = a + 0.55 * (b - a), fin = pp >= tf, hi = pp >= a && !fin, stt = fin ? (CH[k] ? 2 : 0) : hi ? 1 : 0;
      setK("tile" + k, C.gray, stt === 2 ? C.teal : stt === 1 ? C.amber : C.gray, stt ? 1 : 0);
      const ck = cks[k];
      if (fin && CH[k]) {
        const ti = k % 3, tj = Math.floor(k / 3), q2 = P(ST[2].x + 0.4 + ti * 0.62 + 0.25, ST[2].y + 0.4 + tj * 0.68 + 0.275, 0.56);
        ck.setAttribute("transform", "translate(" + q2[0].toFixed(1) + " " + q2[1].toFixed(1) + ")"); ck.style.display = "";
      } else ck.style.display = "none";
    }
    setK("mon", C.gray, C.coral, work && active === 3 ? Math.min(1, (loopT % 5) / 3.5) : 0);
    fuS += ((work && active === 5 ? 1 : 0) - fuS) * Math.min(1, dt * 4);
    setK("frA", C.gray, C.green, fuS); setK("frB", C.gray, C.green, fuS);
    setK("scrUp", C.blue, C.LB, work && active === 1 ? 0.5 + 0.5 * Math.sin(T * 8) : 0);
    setK("scrSend", C.amber, C.LA, work && active === 4 ? 0.5 + 0.5 * Math.sin(T * 8) : 0);
    for (let i = 0; i < 5; i++) {
      const el = chips[i];
      let vis = false, x = 0, y = 0, op = 1, u;
      if (work && active === 1) { u = ((loopT + i * 0.36) % 1.8) / 1.8; x = lp1[0] + (i - 2) * 6; y = lp1[1] - u * 32; op = 1 - u; vis = true; el.style.fill = C.blue.t; el.style.stroke = C.blue.r; }
      else if (work && active === 4) { u = ((loopT + i * 0.32) % 1.6) / 1.6; x = lp4[0] + u * 44; y = lp4[1] - u * 30 - Math.sin(Math.PI * u) * 6; op = u < 0.8 ? 1 : (1 - u) / 0.2; vis = true; el.style.fill = C.amber.t; el.style.stroke = C.amber.r; }
      el.style.display = vis ? "" : "none";
      if (vis) { el.setAttribute("transform", "translate(" + (x - 4).toFixed(1) + " " + (y - 3).toFixed(1) + ")"); el.style.opacity = op; }
    }
    if (work && active === 5) {
      cfT += dt;
      while (cfT > 0.07) {
        cfT -= 0.07;
        for (let j = 0; j < 24; j++) { if (cfd[j].life <= 0) { const q0 = P(ST[5].x + 1.3, ST[5].y + 1.0, 1.8), c = cfd[j]; c.x = q0[0]; c.y = q0[1]; c.vx = (Math.random() - 0.5) * 80; c.vy = -(40 + Math.random() * 60); c.life = 1.6 + Math.random(); c.r = Math.random() * 360; c.c = CFC[j % 7]; break; } }
      }
    }
    for (let j = 0; j < 24; j++) {
      const c2 = cfd[j], e2 = cfs[j];
      if (c2.life > 0) {
        c2.vy += 90 * dt; c2.x += c2.vx * dt; c2.y += c2.vy * dt; c2.life -= dt; c2.r += 200 * dt;
        e2.style.display = ""; e2.style.fill = c2.c; e2.style.opacity = Math.min(1, c2.life);
        e2.setAttribute("transform", "translate(" + c2.x.toFixed(1) + " " + c2.y.toFixed(1) + ") rotate(" + c2.r.toFixed(0) + ")");
      } else e2.style.display = "none";
    }
    flashT += dt;
    if (flashT < 0.35) {
      const fq = P(ph.x, ph.y, ph.z), fs = 0.5 + flashT / 0.35 * 1.4;
      flash.style.display = ""; flash.style.opacity = 1 - flashT / 0.35;
      flash.setAttribute("transform", "translate(" + (fq[0] + ph.face * 11).toFixed(1) + " " + (fq[1] - 31).toFixed(1) + ") scale(" + fs.toFixed(2) + ")");
    } else flash.style.display = "none";
  }

  let last = 0, raf = 0, visible = true;
  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
    if (visible) update(reduced ? 0 : dt);
    raf = requestAnimationFrame(frame);
  }
  // Pause when the scene is scrolled away or the tab is hidden.
  const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
  io.observe(container);

  const onClick = (e) => { const t = e.target.closest("[data-s]"); if (t) onSelect(+t.dataset.s); };
  svg.addEventListener("click", onClick);
  refresh();
  update(0);
  raf = requestAnimationFrame(frame);

  return {
    setActive,
    setCounts,
    destroy() {
      cancelAnimationFrame(raf);
      io.disconnect();
      svg.removeEventListener("click", onClick);
      container.innerHTML = "";
    },
  };
}
