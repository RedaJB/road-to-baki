"""
Génère le combattant de l'appli (public/fighter/hero.glb + hero-ink.png) à partir du
« Superhero_Male » du pack Universal Base Characters [Standard] de Quaternius (licence CC0) :
https://quaternius.itch.io/universal-base-characters

Usage (Python 3 + numpy + Pillow) :
  python scripts/build-manga-hero.py "<pack>/Base Characters/Godot - UE" public/fighter

Étapes :
  - tête sans visage : nez, orbites, bouche et oreilles comblés (surface lissée), yeux et sourcils retirés
  - masse musculaire accentuée (déplacement le long des normales, pondéré par les os)
  - pantalon + ceinture (couleurs à plat), carte de normales conservée (relief musculaire)
  - carte d'encrage : creux des muscles tirés de la carte de normales
  - crinière en pointes modelée sur le crâne, attachée à l'os de la tête
Sorties : hero.glb, hero-ink.png.
"""
import io, json, math, os, struct, sys
import numpy as np
from PIL import Image

SRC, OUT = sys.argv[1], sys.argv[2]
SKIN_RGB = (236, 200, 170)
PANTS_RGB = (28, 28, 34)
BELT_RGB = (200, 50, 58)
HAIR_RGB = (178, 40, 26)
TEX = 2048
rng = np.random.default_rng(7)

g = json.load(open(os.path.join(SRC, 'Superhero_Male_FullBody.gltf')))
raw = open(os.path.join(SRC, g['buffers'][0]['uri']), 'rb').read()
CT = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def acc(ai):
    a = g['accessors'][ai]
    bv = g['bufferViews'][a['bufferView']]
    dt = np.dtype(CT[a['componentType']])
    n = NC[a['type']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = bv.get('byteStride', dt.itemsize * n)
    arr = np.lib.stride_tricks.as_strided(np.frombuffer(raw, dtype=np.uint8, offset=off), shape=(a['count'], n * dt.itemsize), strides=(stride, 1))
    out = np.ascontiguousarray(arr).view(dt).reshape(a['count'], n)
    if a.get('normalized'):
        out = out.astype(np.float32) / np.iinfo(dt).max
    return out


skin = g['skins'][0]
jnames = [g['nodes'][j]['name'] for j in skin['joints']]
J = {n: i for i, n in enumerate(jnames)}
HEAD = J['Head']
ibm = acc(skin['inverseBindMatrices'])

body = next(m for m in g['meshes'] if m['name'].startswith('Sphere'))['primitives'][0]
pos = acc(body['attributes']['POSITION']).astype(np.float64)
nrm = acc(body['attributes']['NORMAL']).astype(np.float64)
uv = acc(body['attributes']['TEXCOORD_0']).astype(np.float64)
joints = acc(body['attributes']['JOINTS_0']).astype(np.int64)
weights = acc(body['attributes']['WEIGHTS_0']).astype(np.float64)
tri = acc(body['indices']).reshape(-1, 3).astype(np.int64)
N = len(pos)
W = np.zeros((N, len(jnames)))
for k in range(4):
    np.add.at(W, (np.arange(N), joints[:, k]), weights[:, k])
y0, y1 = pos[:, 1].min(), pos[:, 1].max()
H = y1 - y0
print('sommets', N, 'triangles', len(tri), 'taille', round(H, 3))

# ── soudure des doublons (coutures UV) ──
key = np.round(pos * 1e5).astype(np.int64)
_, first, wid = np.unique(key, axis=0, return_index=True, return_inverse=True)
wid = wid.reshape(-1)
K = len(first)
P = pos[first].copy()
Wk = W[first]
Nk = np.zeros((K, 3))
np.add.at(Nk, wid, nrm)
Nk /= np.linalg.norm(Nk, axis=1, keepdims=True) + 1e-12
T = wid[tri]


def vertex_normals(P):
    fn = np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]])
    vn = np.zeros_like(P)
    for c in range(3):
        np.add.at(vn, T[:, c], fn)
    return vn / (np.linalg.norm(vn, axis=1, keepdims=True) + 1e-12)


# voisinage (arêtes uniques)
E = np.concatenate([T[:, [0, 1]], T[:, [1, 2]], T[:, [2, 0]]])
E = np.unique(np.sort(E, axis=1), axis=0)
deg = np.zeros(K)
np.add.at(deg, E[:, 0], 1)
np.add.at(deg, E[:, 1], 1)


def laplacian(P):
    s = np.zeros_like(P)
    np.add.at(s, E[:, 0], P[E[:, 1]])
    np.add.at(s, E[:, 1], P[E[:, 0]])
    return s / deg[:, None] - P


# ── 1. masse musculaire ──
BULK = {'clavicle_l': 6, 'clavicle_r': 6, 'upperarm_l': 8, 'upperarm_r': 8, 'lowerarm_l': 5.5, 'lowerarm_r': 5.5,
        'spine_03': 7, 'spine_02': 4, 'spine_01': 1.5, 'neck_01': 11, 'thigh_l': 6, 'thigh_r': 6, 'calf_l': 5.5, 'calf_r': 5.5}
a = np.zeros(len(jnames))
for n, mm in BULK.items():
    a[J[n]] = mm / 1000
P += Nk * (Wk @ a)[:, None]

# ── 2. tête sans visage : lissage de Taubin restreint à la tête ──
hw = np.clip((Wk[:, HEAD] - 0.3) / 0.5, 0, 1)
head_v = hw > 0.9
# le visage (avant de la tête) est lissé plus fort que le crâne
Ph0 = P[head_v]
hcx = (Ph0[:, 0].min() + Ph0[:, 0].max()) / 2
hcz = (Ph0[:, 2].min() + Ph0[:, 2].max()) / 2
# menton : bas du visage, même partiellement lié au cou
low_face = (Wk[:, HEAD] > 0.15) & (P[:, 2] > hcz + 0.02)
hchin = P[low_face, 1].min()
hH = Ph0[:, 1].max() - hchin
haz = np.arctan2(P[:, 0] - hcx, P[:, 2] - hcz)
hyr = (P[:, 1] - hchin) / hH
headish = Wk[:, HEAD] > 0.15
face = headish & (hyr > 0.14) & (hyr < 0.84) & (np.abs(haz) < 1.3)  # menton et mâchoire fixes
ears = head_v & (hyr > 0.36) & (hyr < 0.76) & (np.abs(haz) > 1.1) & (np.abs(haz) < 2.05)
region = face | ears
print('visage', int(face.sum()), 'oreilles', int(ears.sum()))
# surface « plaque mince » tendue sur le bord fixe : plus de nez, d'orbites, de bouche ni d'oreilles
for it in range(9000):
    U = laplacian(P)
    U2 = laplacian(U)
    P[region] -= 0.12 * U2[region]
# creux entre lèvre et menton : comblé par un lissage local (la mâchoire reste en place)
dimple = headish & (hyr > 0.03) & (hyr < 0.2) & (np.abs(haz) < 0.75)
for it in range(80):
    P[dimple] += 0.45 * laplacian(P)[dimple]
# raccord visage / menton : lissage de Taubin (sans perte de volume) sur le bas du visage
band = headish & (hyr > -0.02) & (hyr < 0.5) & (np.abs(haz) < 1.05)
for it in range(220):
    P[band] += 0.5 * laplacian(P)[band]
    P[band] += -0.53 * laplacian(P)[band]
# dernières aspérités du visage : lissage doux restreint à la zone comblée
for it in range(60):
    P[region] += 0.5 * laplacian(P)[region]
    P[region] += -0.52 * laplacian(P)[region]
# raccord doux avec le crâne
amt = hw * 0.5
for it in range(20):
    P += 0.5 * amt[:, None] * laplacian(P)
    P += -0.53 * amt[:, None] * laplacian(P)
# bouche (lèvres + intérieur) : ramenée sur une surface lisse ajustée au visage qui l'entoure
mz = (P[:, 2] > hcz + 0.05) & (P[:, 1] > hchin) & (P[:, 1] < hchin + 0.09) & (np.abs(P[:, 0] - hcx) < 0.03)
mc = np.median(P[mz], axis=0)
dxy = np.hypot(P[:, 0] - mc[0], (P[:, 1] - mc[1]) * 1.15)
ring = headish & (dxy > 0.036) & (dxy < 0.062) & (P[:, 2] > mc[2] - 0.035)
X = np.stack([np.ones(int(ring.sum())), P[ring, 0] - mc[0], P[ring, 1] - mc[1], (P[ring, 0] - mc[0]) ** 2, (P[ring, 0] - mc[0]) * (P[ring, 1] - mc[1]), (P[ring, 1] - mc[1]) ** 2], axis=1)
coef = np.linalg.lstsq(X, P[ring, 2], rcond=None)[0]
mouth = headish & (dxy < 0.036) & (P[:, 2] > mc[2] - 0.05)
x_, y_ = P[mouth, 0] - mc[0], P[mouth, 1] - mc[1]
P[mouth, 2] = coef[0] + coef[1] * x_ + coef[2] * y_ + coef[3] * x_ ** 2 + coef[4] * x_ * y_ + coef[5] * y_ ** 2
print('bouche aplanie', int(mouth.sum()), 'sommets')
Nn = vertex_normals(P)
gx = coef[1] + 2 * coef[3] * x_ + coef[4] * y_
gy = coef[2] + coef[4] * x_ + 2 * coef[5] * y_
mn = np.stack([-gx, -gy, np.ones_like(gx)], axis=1)
Nn[mouth] = mn / np.linalg.norm(mn, axis=1, keepdims=True)

# ── 3. textures ──
U = uv[:, 0] * TEX
V = uv[:, 1] * TEX
hrel = (pos[:, 1] - y0) / H


def raster(values, mask_tri=None, fill=-1.0):
    """Valeur interpolée par pixel UV (une couche), triangles du corps."""
    out = np.full((TEX, TEX), fill, dtype=np.float32)
    for t in range(len(tri)):
        if mask_tri is not None and not mask_tri[t]:
            continue
        i0, i1, i2 = tri[t]
        ax, ay, bx, by, cx, cy = U[i0], V[i0], U[i1], V[i1], U[i2], V[i2]
        x0, x1 = int(max(0, math.floor(min(ax, bx, cx)))), int(min(TEX - 1, math.ceil(max(ax, bx, cx))))
        q0, q1 = int(max(0, math.floor(min(ay, by, cy)))), int(min(TEX - 1, math.ceil(max(ay, by, cy))))
        if x1 < x0 or q1 < q0:
            continue
        den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
        if abs(den) < 1e-9:
            continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(q0, q1 + 1) + 0.5)
        l1 = ((by - cy) * (gx - cx) + (cx - bx) * (gy - cy)) / den
        l2 = ((cy - ay) * (gx - cx) + (ax - cx) * (gy - cy)) / den
        l3 = 1 - l1 - l2
        inside = (l1 >= -0.03) & (l2 >= -0.03) & (l3 >= -0.03)
        val = l1 * values[i0] + l2 * values[i1] + l3 * values[i2]
        sub = out[q0:q1 + 1, x0:x1 + 1]
        sub[inside] = val[inside]
    return out


hmap = raster(hrel)
headmap = raster(np.maximum(hw, region.astype(np.float64))[wid])  # tête + visage comblé (bouche comprise)
cover = hmap >= 0
PANTS_LO, BELT_LO, PANTS_HI = 0.07, 0.565, 0.6
pants = (hmap >= PANTS_LO) & (hmap < BELT_LO)
belt = (hmap >= BELT_LO) & (hmap <= PANTS_HI)
headm = headmap > 0.5


def box_blur(a, r):
    if r < 1:
        return a
    k = 2 * r + 1
    p = np.pad(a, r, mode='edge').astype(np.float64)
    c = np.cumsum(p, axis=0)
    c = np.vstack([np.zeros((1, c.shape[1])), c])
    p = (c[k:] - c[:-k]) / k
    c = np.cumsum(p, axis=1)
    c = np.hstack([np.zeros((c.shape[0], 1)), c])
    return (c[:, k:] - c[:, :-k]) / k


def gblur(a, r):
    for _ in range(3):
        a = box_blur(a, r)
    return a


# albédo à plat
alb = np.zeros((TEX, TEX, 3), dtype=np.float32)
alb[:] = SKIN_RGB
alb[pants] = PANTS_RGB
alb[belt] = BELT_RGB
alb_img = Image.fromarray(alb.astype(np.uint8)).resize((1024, 1024), Image.LANCZOS)

# carte de normales : tête neutre (fondu)
nm = np.asarray(Image.open(os.path.join(SRC, 'T_Superhero_Male_Normal.png')).convert('RGB'), dtype=np.float32)
fade = np.clip(gblur(headm.astype(np.float32), 6), 0, 1)[..., None]
neutral = np.array([128, 128, 255], dtype=np.float32)
nm2 = nm * (1 - fade) + neutral * fade
nm_img = Image.fromarray(nm2.clip(0, 255).astype(np.uint8)).resize((1024, 1024), Image.LANCZOS)

# carte d'encrage : divergence des normales (creux = traits)
n = nm / 127.5 - 1.0
nx = gblur(n[..., 0], 2)
ny = gblur(n[..., 1], 2)
div = np.zeros_like(nx)
div[:, 1:-1] += (nx[:, 2:] - nx[:, :-2]) / 2
SIGN = -1.0  # convention du canal vert de la carte de normales du pack
div[1:-1, :] += SIGN * (ny[2:, :] - ny[:-2, :]) / 2
ink = np.clip((-div - 0.012) / 0.03, 0, 1)
keep = cover & ~pants & ~belt
keep = gblur(keep.astype(np.float32), 4) > 0.995  # loin des coutures UV
keep &= ~(gblur(headm.astype(np.float32), 5) > 0.02)
ink = ink * keep
ink_img = Image.fromarray((ink * 255).astype(np.uint8)).resize((1024, 1024), Image.LANCZOS)
ink_img.save(os.path.join(OUT, 'hero-ink.png'), optimize=True)

# ── 4. crinière ──
hv = np.where(hw > 0.9)[0]
Ph = P[hv]
top = Ph[:, 1].max()
cz = (Ph[:, 2].min() + Ph[:, 2].max()) / 2
cx = (Ph[:, 0].min() + Ph[:, 0].max()) / 2
frontv = Ph[Ph[:, 2] > cz]
chin = frontv[:, 1].min()
Hh = top - chin
print('tête', round(Hh, 3), 'largeur', round(Ph[:, 0].max() - Ph[:, 0].min(), 3))
az = np.arctan2(P[:, 0] - cx, P[:, 2] - cz)
yr = (P[:, 1] - chin) / Hh
f = (1 - np.cos(az)) / 2  # 0 devant, 1 derrière
hairline = 0.7 - 0.42 * f ** 0.85
in_hair = (hw > 0.85) & (yr > hairline)
cap_tri = T[np.all(in_hair[T], axis=1)]
UP = np.array([0, 1.0, 0])
BACK = np.array([0, 0, -1.0])
FWD = -BACK

hair_pos, hair_nrm, hair_idx = [], [], []


def add_mesh(vs, fs):
    base = sum(len(v) for v in hair_pos)
    vs = np.asarray(vs, dtype=np.float64)
    fs = np.asarray(fs, dtype=np.int64)
    fn = np.cross(vs[fs[:, 1]] - vs[fs[:, 0]], vs[fs[:, 2]] - vs[fs[:, 0]])
    vn = np.zeros_like(vs)
    for c in range(3):
        np.add.at(vn, fs[:, c], fn)
    vn /= np.linalg.norm(vn, axis=1, keepdims=True) + 1e-12
    hair_pos.append(vs)
    hair_nrm.append(vn)
    hair_idx.append(fs + base)


# calotte : surface du crâne décollée de 5 mm
cap_v = np.unique(cap_tri)
remap = {v: i for i, v in enumerate(cap_v)}
add_mesh(P[cap_v] + Nn[cap_v] * 0.005, [[remap[a], remap[b], remap[c]] for a, b, c in cap_tri])

# racines des mèches : échantillonnage espacé sur la calotte
cand = cap_v[np.argsort(-P[cap_v, 1])]
roots = []
for v in cand:
    p = P[v]
    edge = yr[v] - hairline[v]
    dmin = 0.026 if edge < 0.1 and f[v] < 0.35 else 0.031
    if all(np.linalg.norm(p - P[r]) > dmin for r in roots):
        roots.append(v)
print('mèches', len(roots))


def spike(p, nrm_, d, L, bend, w0, th0, S=10, R=8):
    t = np.linspace(0, 1, S)
    a1 = np.cross(d, nrm_)
    if np.linalg.norm(a1) < 0.2:
        a1 = np.cross(d, UP)
    a1 /= np.linalg.norm(a1)
    vs, fs = [], []
    for i, ti in enumerate(t):
        c = p - nrm_ * 0.012 + d * L * ti + bend * ti * ti
        tg = d * L + 2 * bend * ti
        tg /= np.linalg.norm(tg)
        b1 = a1 - tg * np.dot(a1, tg)
        b1 /= np.linalg.norm(b1)
        b2 = np.cross(tg, b1)
        k = (1 - ti) ** 1.15
        for r in range(R):
            th = 2 * math.pi * r / R
            vs.append(c + b1 * math.cos(th) * w0 / 2 * k + b2 * math.sin(th) * th0 / 2 * k)
    for i in range(S - 1):
        for r in range(R):
            a_, b_ = i * R + r, i * R + (r + 1) % R
            c_, d_ = a_ + R, b_ + R
            fs += [[a_, b_, c_], [b_, d_, c_]]  # faces orientées vers l'extérieur
    return vs, fs


for v in roots:
    p, nr = P[v], Nn[v]
    fr, edge = f[v], yr[v] - hairline[v]
    s = rng.uniform(0.85, 1.15)
    if fr < 0.3 and edge < 0.14:
        # frange : mèches dressées vers l'avant puis vers le haut
        d = nr * 0.5 + UP * 0.8 + FWD * 0.35
        L = Hh * 0.55 * s
        bend = (UP * 0.22 + BACK * 0.12) * L
    elif fr > 0.7:
        # arrière : mèches balayées vers l'arrière, pointes qui retombent
        d = nr * 0.7 + BACK * 0.6 + UP * 0.1
        L = Hh * (0.62 if yr[v] > 0.6 else 0.48) * s
        bend = (-UP * 0.3 + BACK * 0.06) * L
    else:
        d = nr * 0.55 + BACK * 0.5 + UP * 0.5
        L = Hh * 0.66 * s
        bend = (-UP * 0.2 + BACK * 0.14) * L
    d = d / np.linalg.norm(d)
    d += rng.normal(0, 0.07, 3)
    d /= np.linalg.norm(d)
    w0 = Hh * rng.uniform(0.3, 0.4)
    vs, fs = spike(p, nr, d, L, bend, w0, w0 * 0.34)
    add_mesh(vs, fs)

# frange : mèches qui retombent sur le front
XAX = np.array([1.0, 0, 0])
bang_cand = sorted([v for v in cap_v if f[v] < 0.24 and (yr[v] - hairline[v]) < 0.07], key=lambda v: P[v, 0])
bangs = []
for v in bang_cand:
    if all(np.linalg.norm(P[v] - P[r]) > 0.028 for r in bangs):
        bangs.append(v)
print('frange', len(bangs))
for v in bangs:
    p, nr = P[v], Nn[v]
    side = np.sign(P[v, 0] - cx)
    d = nr * 0.5 + FWD * 0.35 - UP * 0.6 + XAX * side * 0.18
    d /= np.linalg.norm(d)
    L = Hh * rng.uniform(0.3, 0.4)
    bend = (-UP * 0.1 + nr * 0.08) * L
    w0 = Hh * rng.uniform(0.3, 0.38)
    vs, fs = spike(p, nr, d, L, bend, w0, w0 * 0.3)
    add_mesh(vs, fs)

HP = np.concatenate(hair_pos).astype(np.float32)
HN = np.concatenate(hair_nrm).astype(np.float32)
HI = np.concatenate(hair_idx).astype(np.uint32)
print('crinière', len(HP), 'sommets')

# ── 5. GLB ──
out_pos = P[wid].astype(np.float32)
out_nrm = Nn[wid].astype(np.float32)
blob = bytearray()
views, accs = [], []


def add_view(data, target=None):
    while len(blob) % 4:
        blob.append(0)
    v = {'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(data)}
    if target:
        v['target'] = target
    blob.extend(data)
    views.append(v)
    return len(views) - 1


def add_acc(arr, ctype, typ, target=34962, minmax=False):
    arr = np.ascontiguousarray(arr)
    vi = add_view(arr.tobytes(), target)
    a = {'bufferView': vi, 'componentType': ctype, 'count': int(arr.shape[0]), 'type': typ}
    if minmax:
        a['min'] = arr.min(axis=0).tolist()
        a['max'] = arr.max(axis=0).tolist()
    accs.append(a)
    return len(accs) - 1


body_prim = {
    'attributes': {
        'POSITION': add_acc(out_pos, 5126, 'VEC3', minmax=True),
        'NORMAL': add_acc(out_nrm, 5126, 'VEC3'),
        'TEXCOORD_0': add_acc(uv.astype(np.float32), 5126, 'VEC2'),
        'JOINTS_0': add_acc(joints.astype(np.uint8), 5121, 'VEC4'),
        'WEIGHTS_0': add_acc(weights.astype(np.float32), 5126, 'VEC4'),
    },
    'indices': add_acc(tri.reshape(-1).astype(np.uint16 if N < 65536 else np.uint32), 5123 if N < 65536 else 5125, 'SCALAR', 34963),
    'material': 0,
}
hj = np.zeros((len(HP), 4), dtype=np.uint8)
hj[:, 0] = HEAD
hwts = np.zeros((len(HP), 4), dtype=np.float32)
hwts[:, 0] = 1
hair_prim = {
    'attributes': {
        'POSITION': add_acc(HP, 5126, 'VEC3', minmax=True),
        'NORMAL': add_acc(HN, 5126, 'VEC3'),
        'JOINTS_0': add_acc(hj, 5121, 'VEC4'),
        'WEIGHTS_0': add_acc(hwts, 5126, 'VEC4'),
    },
    'indices': add_acc(HI.reshape(-1), 5125, 'SCALAR', 34963),
    'material': 1,
}
ibm_acc = add_acc(ibm.astype(np.float32), 5126, 'MAT4', target=None)


def img_bytes(im, fmt, **kw):
    b = io.BytesIO()
    im.save(b, fmt, **kw)
    return b.getvalue()


images = []
for name, data, mime in [('albedo', img_bytes(alb_img, 'PNG', optimize=True), 'image/png'), ('normal', img_bytes(nm_img, 'JPEG', quality=92), 'image/jpeg')]:
    images.append({'name': name, 'bufferView': add_view(data), 'mimeType': mime})

nodes = json.loads(json.dumps(g['nodes']))
for nd in nodes:
    if nd.get('name') in ('Eyes', 'Eyebrows'):
        nd.pop('mesh', None)
        nd.pop('skin', None)
    if nd.get('name') == 'SuperHero_Male':
        nd['mesh'] = 0
nodes.append({'name': 'Hair', 'mesh': 1, 'skin': 0})
arm = next(i for i, nd in enumerate(nodes) if nd.get('name') == 'Armature')
nodes[arm]['children'] = [c for c in nodes[arm]['children'] if nodes[c].get('name') not in ('Eyes', 'Eyebrows')] + [len(nodes) - 1]

gl = {
    'asset': {'version': '2.0', 'generator': 'build_manga_hero.py', 'copyright': 'Universal Base Characters by Quaternius (CC0 1.0), modifié'},
    'scene': 0,
    'scenes': [{'name': 'Scene', 'nodes': [arm]}],
    'nodes': nodes,
    'skins': [{'name': 'Skin', 'joints': skin['joints'], 'inverseBindMatrices': ibm_acc}],
    'meshes': [{'name': 'Body', 'primitives': [body_prim]}, {'name': 'Hair', 'primitives': [hair_prim]}],
    'materials': [
        {'name': 'M_Body', 'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicFactor': 0, 'roughnessFactor': 1}, 'normalTexture': {'index': 1}},
        {'name': 'M_Hair', 'pbrMetallicRoughness': {'baseColorFactor': [c / 255 for c in HAIR_RGB] + [1], 'metallicFactor': 0, 'roughnessFactor': 1}},
    ],
    'samplers': [{'magFilter': 9729, 'minFilter': 9987}],
    'textures': [{'sampler': 0, 'source': 0}, {'sampler': 0, 'source': 1}],
    'images': images,
    'accessors': accs,
    'bufferViews': views,
}
while len(blob) % 4:
    blob.append(0)
gl['buffers'] = [{'byteLength': len(blob)}]
js = json.dumps(gl, separators=(',', ':')).encode()
js += b' ' * ((4 - len(js) % 4) % 4)
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob))
glb += struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(blob), 0x004E4942) + bytes(blob)
open(os.path.join(OUT, 'hero.glb'), 'wb').write(glb)
print('hero.glb', len(glb), 'octets ; encre', os.path.getsize(os.path.join(OUT, 'hero-ink.png')))
