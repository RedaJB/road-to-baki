'use client';

/**
 * Générateur de pubs TikTok (1080×1920, 30 i/s, MP4 H.264).
 * Utilisé par scripts/render-ads.mjs. Outil de dev : désactivé en production.
 */
import { useEffect, useRef, useState } from 'react';
import { ArrayBufferTarget, Muxer } from 'mp4-muxer';

const W = 1080;
const H = 1920;
const FPS = 30;
const ACCENT = '#e5484d';
const FONT = 'Oswald, Impact, "Arial Narrow", sans-serif';
const BODY = '"DM Sans", "Segoe UI", sans-serif';

type Ctx = CanvasRenderingContext2D;
type Imgs = Record<string, HTMLImageElement>;
interface Scene {
  from: number;
  to: number;
  draw: (c: Ctx, t: number, imgs: Imgs) => void;
}
interface Ad {
  name: string;
  total: number;
  scenes: Scene[];
}

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const outCubic = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
const outBack = (x: number) => {
  const t = clamp(x);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function background(c: Ctx, time: number) {
  c.fillStyle = '#0b0b0c';
  c.fillRect(0, 0, W, H);
  const g = c.createRadialGradient(W / 2, 260 + Math.sin(time * 0.8) * 30, 40, W / 2, 300, 1100);
  g.addColorStop(0, 'rgba(229,72,77,0.22)');
  g.addColorStop(1, 'rgba(229,72,77,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}

/** Texte « pop » mot par mot */
function popLines(c: Ctx, lines: { text: string; color?: string }[], t: number, opts: { y: number; size: number; gap?: number; stagger?: number }) {
  const gap = opts.gap ?? opts.size * 1.02;
  lines.forEach((ln, i) => {
    const k = outBack((t - i * (opts.stagger ?? 0.22)) / 0.38);
    if (k <= 0) return;
    c.save();
    c.translate(W / 2, opts.y + i * gap);
    c.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
    c.globalAlpha *= clamp(k * 1.4);
    c.font = `700 ${opts.size}px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = ln.color ?? '#f2f2f3';
    c.fillText(ln.text.toUpperCase(), 0, 0);
    c.restore();
  });
}

function caption(c: Ctx, text: string, t: number, y = 250) {
  const k = outCubic(t / 0.35);
  c.save();
  c.globalAlpha *= k;
  c.font = `700 62px ${FONT}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const words = text.toUpperCase().split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (c.measureText(test).width > 860 && cur) {
      lines.push(cur);
      cur = w;
    } else cur = test;
  }
  lines.push(cur);
  lines.forEach((l, i) => {
    const yy = y + i * 72 + (1 - k) * 24;
    const w = c.measureText(l).width + 44;
    c.fillStyle = i === lines.length - 1 && lines.length > 1 ? ACCENT : 'rgba(11,11,12,0.82)';
    if (lines.length === 1) c.fillStyle = 'rgba(11,11,12,0.82)';
    rr(c, W / 2 - w / 2, yy - 40, w, 80, 16);
    c.fill();
    c.fillStyle = '#f2f2f3';
    c.fillText(l, W / 2, yy + 2);
  });
  c.restore();
}

/** Téléphone avec un écran (fondu entre deux captures possible) */
function phone(c: Ctx, imgs: Imgs, src: string, t: number, opts: { cx?: number; y?: number; w?: number; next?: string; mix?: number; enter?: boolean; tilt?: number }) {
  const w = opts.w ?? 560;
  const img = imgs[src];
  const h = w * (img ? img.height / img.width : 2.16);
  const k = opts.enter === false ? 1 : outCubic(t / 0.55);
  const cx = opts.cx ?? W / 2;
  const top = (opts.y ?? 400) + (1 - k) * 700;
  c.save();
  c.globalAlpha *= clamp(k * 1.5);
  c.translate(cx, top + h / 2);
  c.rotate(((opts.tilt ?? 0) * Math.PI) / 180);
  c.translate(-cx, -(top + h / 2));
  c.shadowColor = 'rgba(0,0,0,0.6)';
  c.shadowBlur = 60;
  c.fillStyle = '#1b1b1f';
  rr(c, cx - w / 2 - 14, top - 14, w + 28, h + 28, 64);
  c.fill();
  c.shadowBlur = 0;
  c.save();
  rr(c, cx - w / 2, top, w, h, 52);
  c.clip();
  if (img) c.drawImage(img, cx - w / 2, top, w, h);
  if (opts.next && imgs[opts.next] && (opts.mix ?? 0) > 0) {
    c.globalAlpha *= clamp(opts.mix ?? 0);
    c.drawImage(imgs[opts.next], cx - w / 2, top, w, h);
  }
  c.restore();
  c.restore();
}

function card(c: Ctx, imgs: Imgs, src: string, t: number, y: number) {
  const img = imgs[src];
  if (!img) return;
  const w = 900;
  const h = (w * img.height) / img.width;
  const k = outBack(t / 0.5);
  c.save();
  c.globalAlpha *= clamp(k * 1.3);
  c.translate(W / 2, y + h / 2);
  c.scale(0.85 + 0.15 * k, 0.85 + 0.15 * k);
  c.shadowColor = 'rgba(0,0,0,0.6)';
  c.shadowBlur = 50;
  rr(c, -w / 2, -h / 2, w, h, 36);
  c.fillStyle = '#151517';
  c.fill();
  c.shadowBlur = 0;
  rr(c, -w / 2, -h / 2, w, h, 36);
  c.clip();
  c.drawImage(img, -w / 2, -h / 2, w, h);
  c.restore();
}

function chip(c: Ctx, text: string, t: number, x: number, y: number) {
  const k = outBack(t / 0.35);
  if (k <= 0) return;
  c.save();
  c.translate(x, y);
  c.scale(k, k);
  c.font = `700 40px ${BODY}`;
  const w = c.measureText(text).width + 56;
  c.fillStyle = ACCENT;
  rr(c, -w / 2, -38, w, 76, 38);
  c.fill();
  c.fillStyle = '#fff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, 0, 2);
  c.restore();
}

function endCard(c: Ctx, t: number) {
  const k = outBack(t / 0.5);
  c.save();
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.globalAlpha *= clamp(k * 1.4);
  c.fillStyle = ACCENT;
  c.font = `900 300px "Yu Mincho", "MS Mincho", serif`;
  c.save();
  c.translate(W / 2, 640);
  c.scale(0.7 + 0.3 * k, 0.7 + 0.3 * k);
  c.fillText('道', 0, 0);
  c.restore();
  c.fillStyle = '#f2f2f3';
  c.font = `700 120px ${FONT}`;
  c.fillText('ROAD TO BAKI', W / 2, 930);
  c.font = `500 46px ${BODY}`;
  c.fillStyle = '#a3a3ab';
  c.fillText('Entraîne-toi comme un combattant.', W / 2, 1030);
  const k2 = outBack((t - 0.5) / 0.4);
  if (k2 > 0) {
    c.save();
    c.translate(W / 2, 1200);
    c.scale(k2, k2);
    c.fillStyle = ACCENT;
    rr(c, -330, -64, 660, 128, 30);
    c.fill();
    c.fillStyle = '#fff';
    c.font = `700 58px ${FONT}`;
    c.fillText('7 JOURS OFFERTS', 0, 4);
    c.restore();
  }
  const k3 = clamp((t - 1) / 0.4);
  c.globalAlpha *= k3;
  c.fillStyle = '#f2f2f3';
  c.font = `700 52px ${FONT}`;
  c.fillText('LIEN EN BIO', W / 2, 1360 + Math.sin(t * 6) * 6);
  c.restore();
}

/* ───────── les pubs ───────── */

const END = (from: number): Scene => ({ from, to: 99, draw: (c, t) => endCard(c, t) });

const ADS: Ad[] = [
  {
    name: 'pub-1-ton-plan',
    total: 15,
    scenes: [
      { from: 0, to: 2.3, draw: (c, t) => popLines(c, [{ text: 'Tu t’entraînes' }, { text: 'sans plan ?', color: ACCENT }], t, { y: 840, size: 150 }) },
      {
        from: 2.3,
        to: 6.2,
        draw: (c, t, i) => {
          caption(c, 'Ton plan en 60 secondes', t);
          phone(c, i, 'onb-goal', t, { y: 400, next: 'onb-body', mix: (t - 1.9) / 0.4 });
        },
      },
      {
        from: 6.2,
        to: 10.2,
        draw: (c, t, i) => {
          caption(c, 'Séance guidée série par série', t);
          phone(c, i, 'workout', t, { y: 400 });
          chip(c, 'Démo 3D de chaque exo', t - 1.2, W / 2, 1640);
        },
      },
      {
        from: 10.2,
        to: 12.7,
        draw: (c, t, i) => {
          caption(c, 'Calories et macros calculées pour toi', t);
          phone(c, i, 'graille', t, { y: 470 });
        },
      },
      END(12.7),
    ],
  },
  {
    name: 'pub-2-genoux',
    total: 15,
    scenes: [
      { from: 0, to: 2.4, draw: (c, t) => popLines(c, [{ text: 'Mal aux' }, { text: 'genoux ?', color: ACCENT }], t, { y: 840, size: 170 }) },
      {
        from: 2.4,
        to: 6.4,
        draw: (c, t, i) => {
          caption(c, 'Les exos à risque sont remplacés automatiquement', t, 300);
          card(c, i, 'exos-adaptes', t - 0.3, 560);
        },
      },
      {
        from: 6.4,
        to: 10.4,
        draw: (c, t, i) => {
          caption(c, 'Chaque mouvement montré en 3D', t);
          phone(c, i, 'workout', t, { y: 400 });
        },
      },
      {
        from: 10.4,
        to: 12.7,
        draw: (c, t, i) => {
          caption(c, 'Salle ou maison', t);
          phone(c, i, 'onb-training', t, { y: 400 });
        },
      },
      END(12.7),
    ],
  },
  {
    name: 'pub-3-pas-de-salle',
    total: 15,
    scenes: [
      {
        from: 0,
        to: 2.6,
        draw: (c, t) => {
          popLines(c, [{ text: 'Pas de salle ?' }], t, { y: 760, size: 140 });
          popLines(c, [{ text: 'Pas d’excuse.', color: ACCENT }], t - 0.9, { y: 940, size: 140 });
        },
      },
      {
        from: 2.6,
        to: 6.4,
        draw: (c, t, i) => {
          caption(c, 'Mode maison : zéro matériel', t);
          phone(c, i, 'onb-training', t, { y: 400 });
        },
      },
      {
        from: 6.4,
        to: 10.2,
        draw: (c, t, i) => {
          caption(c, 'Chaque exo a sa version poids du corps', t, 300);
          card(c, i, 'exos-adaptes', t - 0.3, 560);
        },
      },
      {
        from: 10.2,
        to: 12.7,
        draw: (c, t, i) => {
          caption(c, 'Le chrono te pousse jusqu’au bout', t);
          phone(c, i, 'rest', t, { y: 400 });
        },
      },
      END(12.7),
    ],
  },
  {
    name: 'pub-4-discipline',
    total: 15,
    scenes: [
      {
        from: 0,
        to: 2.8,
        draw: (c, t) => {
          popLines(c, [{ text: 'Une seule règle :' }], t, { y: 760, size: 110 });
          popLines(c, [{ text: 'ne rien' }, { text: 'lâcher.', color: ACCENT }], t - 0.7, { y: 920, size: 160 });
        },
      },
      {
        from: 2.8,
        to: 6.6,
        draw: (c, t, i) => {
          caption(c, 'Séries validées, records enregistrés', t);
          phone(c, i, 'workout', t, { y: 400, tilt: -2 });
        },
      },
      {
        from: 6.6,
        to: 10.2,
        draw: (c, t, i) => {
          caption(c, 'Repos chronométré', t);
          phone(c, i, 'rest', t, { y: 400, tilt: 2 });
        },
      },
      {
        from: 10.2,
        to: 12.7,
        draw: (c, t, i) => {
          caption(c, 'Repas, eau, jeûne : tout est suivi', t);
          phone(c, i, 'graille', t, { y: 470 });
        },
      },
      END(12.7),
    ],
  },
];

function renderFrame(c: Ctx, ad: Ad, time: number, imgs: Imgs) {
  background(c, time);
  for (const s of ad.scenes) {
    const fadeOut = 0.25;
    if (time < s.from || time > s.to + fadeOut) continue;
    c.save();
    c.globalAlpha = time > s.to ? 1 - (time - s.to) / fadeOut : 1;
    s.draw(c, time - s.from, imgs);
    c.restore();
  }
}

async function encode(ad: Ad, canvas: HTMLCanvasElement, imgs: Imgs): Promise<{ mp4: string; cover: string; codec: string }> {
  const c = canvas.getContext('2d')!;
  const candidates = ['avc1.640028', 'avc1.4d0028', 'avc1.42e028'];
  let codec = '';
  for (const k of candidates) {
    const s = await VideoEncoder.isConfigSupported({ codec: k, width: W, height: H, bitrate: 9_000_000, framerate: FPS });
    if (s.supported) {
      codec = k;
      break;
    }
  }
  if (!codec) throw new Error('Encodage H.264 indisponible dans ce navigateur');
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H, frameRate: FPS }, fastStart: 'in-memory' });
  const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => console.error(e) });
  enc.configure({ codec, width: W, height: H, bitrate: 9_000_000, framerate: FPS, avc: { format: 'avc' } });
  const frames = Math.round(ad.total * FPS);
  let cover = '';
  for (let i = 0; i < frames; i++) {
    renderFrame(c, ad, i / FPS, imgs);
    if (i === Math.round(1.6 * FPS)) cover = canvas.toDataURL('image/jpeg', 0.9);
    const vf = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    enc.encode(vf, { keyFrame: i % (FPS * 2) === 0 });
    vf.close();
    if (enc.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 5));
  }
  await enc.flush();
  muxer.finalize();
  const buf = new Uint8Array(muxer.target.buffer);
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { mp4: btoa(bin), cover, codec };
}

function DevAdsInner() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [preview, setPreview] = useState<string[]>([]);

  useEffect(() => {
    const names = ['onb-goal', 'onb-body', 'onb-training', 'workout', 'rest', 'graille', 'exos-adaptes'];
    const imgs: Imgs = {};
    Promise.all(
      names.map(
        (n) =>
          new Promise<void>((res) => {
            const im = new Image();
            im.onload = () => res();
            im.onerror = () => res();
            im.src = `/screens/${n}.png`;
            imgs[n] = im;
          }),
      ),
    )
      .then(() => document.fonts.ready)
      .then(() => {
        const w = window as unknown as Record<string, unknown>;
        w.__ads = ADS.map((a) => a.name);
        w.renderAd = (name: string) => encode(ADS.find((a) => a.name === name)!, canvas.current!, imgs);
        // planche de contrôle : 1 image par scène
        const c = canvas.current!.getContext('2d')!;
        const shots: string[] = [];
        for (const ad of ADS)
          for (const s of ad.scenes) {
            renderFrame(c, ad, Math.min(ad.total - 0.1, s.from + 1.8), imgs);
            shots.push(canvas.current!.toDataURL('image/jpeg', 0.6));
          }
        setPreview(shots);
        w.__done = true;
      });
  }, []);

  return (
    <div style={{ background: '#000', padding: 8 }}>
      <canvas ref={canvas} width={W} height={H} style={{ display: 'none' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6 }}>
        {preview.map((s, i) => (
          <img key={i} src={s} alt="" style={{ width: '100%' }} />
        ))}
      </div>
    </div>
  );
}

/** Outil de dev : désactivé en production */
export default function DevAds() {
  if (process.env.NODE_ENV === 'production') return null;
  return <DevAdsInner />;
}
