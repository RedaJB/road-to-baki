"""
Transfert d'animations (squelette Mixamo, captures CMU) vers le squelette du combattant (Quaternius / Unreal).
Chaque segment (bassin, colonne, clavicule, bras, avant-bras, main, cuisse, tibia, pied) reçoit l'orientation
du segment correspondant de la source, calculée à partir des positions des articulations : indépendant des
poses de repos et des axes propres à chaque squelette.

Usage (Python 3 + numpy) :
  python scripts/retarget-cmu.py public/fighter/hero.glb <clip_mixamo.glb> public/fighter/anims/<exercice>.glb
Le cap moyen est ramené face caméra (+Z) et le déplacement net du bassin retiré (mouvement sur place).
"""
import json, struct, sys
import numpy as np

HERO, SRC, OUT = sys.argv[1], sys.argv[2], sys.argv[3]


def load_glb(path):
    b = open(path, 'rb').read()
    jl = struct.unpack_from('<I', b, 12)[0]
    g = json.loads(b[20:20 + jl])
    off = 20 + jl
    bl = struct.unpack_from('<I', b, off)[0]
    return g, b[off + 8: off + 8 + bl]


CT = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8, 5122: np.int16, 5120: np.int8}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def acc(g, binb, ai):
    a = g['accessors'][ai]
    bv = g['bufferViews'][a['bufferView']]
    dt = np.dtype(CT[a['componentType']])
    n = NC[a['type']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = bv.get('byteStride', dt.itemsize * n)
    raw = np.frombuffer(binb, dtype=np.uint8)
    rows = np.stack([raw[off + i * stride: off + i * stride + dt.itemsize * n] for i in range(a['count'])])
    out = rows.view(dt).reshape(a['count'], n).astype(np.float64)
    if a.get('normalized'):
        out /= np.iinfo(dt).max
    return out


def q2m(q):
    x, y, z, w = q
    return np.array([
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
    ])


def m2q(m):
    t = m[0, 0] + m[1, 1] + m[2, 2]
    if t > 0:
        s = np.sqrt(t + 1.0) * 2
        w, x, y, z = 0.25 * s, (m[2, 1] - m[1, 2]) / s, (m[0, 2] - m[2, 0]) / s, (m[1, 0] - m[0, 1]) / s
    elif m[0, 0] > m[1, 1] and m[0, 0] > m[2, 2]:
        s = np.sqrt(1.0 + m[0, 0] - m[1, 1] - m[2, 2]) * 2
        w, x, y, z = (m[2, 1] - m[1, 2]) / s, 0.25 * s, (m[0, 1] + m[1, 0]) / s, (m[0, 2] + m[2, 0]) / s
    elif m[1, 1] > m[2, 2]:
        s = np.sqrt(1.0 + m[1, 1] - m[0, 0] - m[2, 2]) * 2
        w, x, y, z = (m[0, 2] - m[2, 0]) / s, (m[0, 1] + m[1, 0]) / s, 0.25 * s, (m[1, 2] + m[2, 1]) / s
    else:
        s = np.sqrt(1.0 + m[2, 2] - m[0, 0] - m[1, 1]) * 2
        w, x, y, z = (m[1, 0] - m[0, 1]) / s, (m[0, 2] + m[2, 0]) / s, (m[1, 2] + m[2, 1]) / s, 0.25 * s
    q = np.array([x, y, z, w])
    return q / np.linalg.norm(q)


class Skel:
    def __init__(self, g, keep=None):
        self.nodes = g['nodes']
        self.parent = {}
        for i, n in enumerate(self.nodes):
            for c in n.get('children', []):
                self.parent[c] = i
        self.idx = {n.get('name'): i for i, n in enumerate(self.nodes)}
        self.T = [np.array(n.get('translation', [0, 0, 0]), dtype=np.float64) for n in self.nodes]
        self.R = [np.array(n.get('rotation', [0, 0, 0, 1]), dtype=np.float64) for n in self.nodes]
        self.S = [np.array(n.get('scale', [1, 1, 1]), dtype=np.float64) for n in self.nodes]
        order, seen = [], set()

        def visit(i):
            if i in seen:
                return
            p = self.parent.get(i)
            if p is not None:
                visit(p)
            seen.add(i)
            order.append(i)
        for i in range(len(self.nodes)):
            visit(i)
        self.order = order

    def world(self, T=None, R=None, S=None):
        T, R, S = T or self.T, R or self.R, S or self.S
        W = [None] * len(self.nodes)
        for i in self.order:
            m = np.eye(4)
            m[:3, :3] = q2m(R[i]) * S[i][None, :]
            m[:3, 3] = T[i]
            p = self.parent.get(i)
            W[i] = W[p] @ m if p is not None else m
        return W


def nrm(v):
    n = np.linalg.norm(v)
    return v / n if n > 1e-9 else v


def frame(aim, ref):
    a = nrm(aim)
    b = nrm(ref - a * np.dot(a, ref))
    return np.stack([a, b, np.cross(a, b)], axis=1)


def rot_only(m):
    r = m[:3, :3].copy()
    for k in range(3):
        r[:, k] = nrm(r[:, k])
    return r


# ── source (clip) ──
gs, bs = load_glb(SRC)
src = Skel(gs)
anim = gs['animations'][0]
times = None
tracks = {}
for ch in anim['channels']:
    smp = anim['samplers'][ch['sampler']]
    inp = acc(gs, bs, smp['input'])[:, 0]
    out = acc(gs, bs, smp['output'])
    if times is None or len(inp) > len(times):
        times = inp
    tracks[(ch['target']['node'], ch['target']['path'])] = (inp, out, smp.get('interpolation', 'LINEAR'))


def sample(node, path, t, rest):
    tr = tracks.get((node, path))
    if tr is None:
        return rest
    inp, out, interp = tr
    if interp == 'CUBICSPLINE':
        out = out[1::3]
    if t <= inp[0]:
        return out[0]
    if t >= inp[-1]:
        return out[-1]
    k = np.searchsorted(inp, t) - 1
    u = (t - inp[k]) / (inp[k + 1] - inp[k])
    a, b = out[k], out[k + 1]
    if path == 'rotation':
        if np.dot(a, b) < 0:
            b = -b
        q = a * (1 - u) + b * u
        return q / np.linalg.norm(q)
    return a * (1 - u) + b * u


def S_(name):
    return src.idx['mixamorig:' + name]


# ── cible (combattant) ──
gt, bt = load_glb(HERO)
tgt = Skel(gt)
W0 = tgt.world()
P0 = {n: W0[i][:3, 3] for n, i in tgt.idx.items() if n}
Rw0 = {n: rot_only(W0[i]) for n, i in tgt.idx.items() if n}

MAP = {
    'pelvis': 'Hips', 'spine_01': 'Spine', 'spine_02': 'Spine1', 'spine_03': 'Spine2', 'neck_01': 'Neck', 'Head': 'Head',
    'clavicle_l': 'LeftShoulder', 'upperarm_l': 'LeftArm', 'lowerarm_l': 'LeftForeArm', 'hand_l': 'LeftHand',
    'clavicle_r': 'RightShoulder', 'upperarm_r': 'RightArm', 'lowerarm_r': 'RightForeArm', 'hand_r': 'RightHand',
    'middle_01_l': 'LeftHandMiddle1', 'index_01_l': 'LeftHandIndex1', 'pinky_01_l': 'LeftHandPinky1',
    'middle_01_r': 'RightHandMiddle1', 'index_01_r': 'RightHandIndex1', 'pinky_01_r': 'RightHandPinky1',
    'thigh_l': 'LeftUpLeg', 'calf_l': 'LeftLeg', 'foot_l': 'LeftFoot', 'ball_l': 'LeftToeBase',
    'thigh_r': 'RightUpLeg', 'calf_r': 'RightLeg', 'foot_r': 'RightFoot', 'ball_r': 'RightToeBase',
}


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def frames_from(P, Rhead=None):
    """Repères anatomiques de chaque segment à partir des positions P[nom cible]."""
    F = {}
    up_p = P['spine_01'] - P['pelvis']
    left_p = P['thigh_l'] - P['thigh_r']
    left_c = P['upperarm_l'] - P['upperarm_r']
    fwd_p = nrm(np.cross(left_p, up_p))
    fwd_c = nrm(np.cross(left_c, P['neck_01'] - P['spine_03']))
    F['pelvis'] = frame(up_p, left_p)
    F['spine_01'] = frame(P['spine_02'] - P['spine_01'], nrm(left_p) + nrm(left_c))
    F['spine_02'] = frame(P['spine_03'] - P['spine_02'], left_c)
    F['spine_03'] = frame(P['neck_01'] - P['spine_03'], left_c)
    F['neck_01'] = frame(P['Head'] - P['neck_01'], left_c)
    for s in 'lr':
        F['clavicle_' + s] = frame(P['upperarm_' + s] - P['clavicle_' + s], fwd_c)
        up_a = P['lowerarm_' + s] - P['upperarm_' + s]
        lo_a = P['hand_' + s] - P['lowerarm_' + s]
        bend = np.cross(nrm(up_a), nrm(lo_a))
        fall = np.cross(nrm(up_a), fwd_c)
        w = smoothstep(0.12, 0.4, np.linalg.norm(bend))
        hinge = nrm(w * nrm(bend) + (1 - w) * nrm(fall))
        F['upperarm_' + s] = frame(up_a, hinge)
        F['lowerarm_' + s] = frame(lo_a, hinge)
        F['hand_' + s] = frame(P['middle_01_' + s] - P['hand_' + s], P['index_01_' + s] - P['pinky_01_' + s])
        th = P['calf_' + s] - P['thigh_' + s]
        sh = P['foot_' + s] - P['calf_' + s]
        bend = np.cross(nrm(th), nrm(sh))
        fall = np.cross(nrm(th), -fwd_p)
        w = smoothstep(0.12, 0.4, np.linalg.norm(bend))
        knee = nrm(w * nrm(bend) + (1 - w) * nrm(fall))
        F['thigh_' + s] = frame(th, knee)
        F['calf_' + s] = frame(sh, knee)
        F['foot_' + s] = frame(P['ball_' + s] - P['foot_' + s], knee)
    return F, fwd_p


F0, fwd0 = frames_from(P0)
print('cible : avant', np.round(fwd0, 2), '| cuisse gauche x', round(P0['thigh_l'][0], 3), '| bras gauche x', round(P0['upperarm_l'][0], 3))

# repos de la source
Ws0 = src.world()
Rhead_s0 = rot_only(Ws0[S_('Head')])
hip_h_src = Ws0[S_('Hips')][1, 3] - min(Ws0[S_('LeftToeBase')][1, 3], Ws0[S_('RightToeBase')][1, 3])
hip_h_tgt = P0['pelvis'][1] - min(P0['ball_l'][1], P0['ball_r'][1])
k_scale = hip_h_tgt / hip_h_src
hips_rest_s = Ws0[S_('Hips')][:3, 3]
Ps0 = {tn: Ws0[S_(sn)][:3, 3] for tn, sn in MAP.items()}
print('source au repos : avant', np.round(frames_from(Ps0)[1], 2), '| cuisse gauche x', round(Ps0['thigh_l'][0], 3), '| bras gauche', np.round(Ps0['lowerarm_l'] - Ps0['upperarm_l'], 2))

BONES = ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'Head',
         'clavicle_l', 'upperarm_l', 'lowerarm_l', 'hand_l', 'clavicle_r', 'upperarm_r', 'lowerarm_r', 'hand_r',
         'thigh_l', 'calf_l', 'foot_l', 'thigh_r', 'calf_r', 'foot_r']

# ── images de la source ──
fps = 30.0
T_end = float(times[-1])
n_frames = max(2, int(round(T_end * fps)) + 1)
ts = np.linspace(0, T_end, n_frames)
src_frames = []
for t in ts:
    Tn = [sample(i, 'translation', t, src.T[i]) for i in range(len(src.nodes))]
    Rn = [sample(i, 'rotation', t, src.R[i]) for i in range(len(src.nodes))]
    Sn = [sample(i, 'scale', t, src.S[i]) for i in range(len(src.nodes))]
    W = src.world(Tn, Rn, Sn)
    P = {tn: W[S_(sn)][:3, 3] for tn, sn in MAP.items()}
    src_frames.append((P, rot_only(W[S_('Head')]), W[S_('Hips')][:3, 3]))

# cap moyen de la source ramené vers +Z (le combattant regarde vers +Z)
heads = np.array([frames_from(P)[1] for P, _, _ in src_frames])
mean_fwd = nrm(np.array([heads[:, 0].mean(), 0, heads[:, 2].mean()]))
yaw = np.arctan2(mean_fwd[0], mean_fwd[2])
c, s_ = np.cos(-yaw), np.sin(-yaw)
Ry = np.array([[c, 0, s_], [0, 1, 0], [-s_, 0, c]])
print('cap moyen de la source : %.1f°' % np.degrees(yaw), '| échelle', round(k_scale, 3), '| images', n_frames)

# dérive horizontale (déplacement net sur le cycle) retirée : course sur place
hips = np.array([Ry @ (h - hips_rest_s) for _, _, h in src_frames]) * k_scale
drift = hips[-1] - hips[0]
lin = np.outer(np.linspace(0, 1, n_frames), drift)
hips[:, 0] -= lin[:, 0] + (hips[:, 0] - lin[:, 0]).mean()
hips[:, 2] -= lin[:, 2] + (hips[:, 2] - lin[:, 2]).mean()

rot_tracks = {b: [] for b in BONES}
pel_track = []
for fi, (P, Rh, _) in enumerate(src_frames):
    P = {k: Ry @ v for k, v in P.items()}
    F, _ = frames_from(P)
    Rw = {}
    for b in BONES:
        if b == 'Head':
            # tête : même rotation que la source par rapport au repos (les deux têtes sont droites, de face, au repos)
            Rw[b] = Ry @ Rh @ Rhead_s0.T @ Rw0[b]
        else:
            Rw[b] = F[b] @ F0[b].T @ Rw0[b]
    # rotations locales (parents d'abord) ; parents non animés : rotation de repos
    Wt = {}
    for i in tgt.order:
        name = tgt.nodes[i].get('name')
        p = tgt.parent.get(i)
        Rp = Wt[p] if p is not None else np.eye(3)
        if name in Rw:
            Wt[i] = Rw[name]
            loc = Rp.T @ Rw[name]
            q = m2q(loc)
            prev = rot_tracks[name][-1] if rot_tracks[name] else None
            if prev is not None and np.dot(prev, q) < 0:
                q = -q
            rot_tracks[name].append(q)
        else:
            Wt[i] = Rp @ q2m(tgt.R[i])
    # bassin : position monde → repère de son parent
    pw = P0['pelvis'] + hips[fi]
    par = tgt.parent[tgt.idx['pelvis']]
    Wp = W0[par]
    pel_track.append((np.linalg.inv(Wp) @ np.append(pw, 1.0))[:3])

# ── écriture du clip ──
blob = bytearray()
views, accs = [], []


def add(arr, typ):
    arr = np.ascontiguousarray(arr, dtype=np.float32)
    while len(blob) % 4:
        blob.append(0)
    views.append({'buffer': 0, 'byteOffset': len(blob), 'byteLength': arr.nbytes})
    blob.extend(arr.tobytes())
    a = {'bufferView': len(views) - 1, 'componentType': 5126, 'count': int(arr.shape[0]), 'type': typ}
    if typ == 'SCALAR':
        a['min'] = [float(arr.min())]
        a['max'] = [float(arr.max())]
    accs.append(a)
    return len(accs) - 1


keep = [i for i, n in enumerate(tgt.nodes) if 'mesh' not in n]
remap = {old: new for new, old in enumerate(keep)}
nodes = []
for old in keep:
    n = {k: v for k, v in tgt.nodes[old].items() if k in ('name', 'translation', 'rotation', 'scale')}
    ch = [remap[c] for c in tgt.nodes[old].get('children', []) if c in remap]
    if ch:
        n['children'] = ch
    nodes.append(n)
roots = [remap[i] for i in keep if i not in tgt.parent]
t_acc = add(ts.reshape(-1, 1), 'SCALAR')
samplers, channels = [], []
for b in BONES:
    samplers.append({'input': t_acc, 'output': add(np.array(rot_tracks[b]), 'VEC4'), 'interpolation': 'LINEAR'})
    channels.append({'sampler': len(samplers) - 1, 'target': {'node': remap[tgt.idx[b]], 'path': 'rotation'}})
samplers.append({'input': t_acc, 'output': add(np.array(pel_track), 'VEC3'), 'interpolation': 'LINEAR'})
channels.append({'sampler': len(samplers) - 1, 'target': {'node': remap[tgt.idx['pelvis']], 'path': 'translation'}})
while len(blob) % 4:
    blob.append(0)
out = {
    'asset': {'version': '2.0', 'generator': 'retarget_cmu.py', 'copyright': 'CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu)'},
    'scene': 0, 'scenes': [{'nodes': roots}], 'nodes': nodes,
    'animations': [{'name': 'clip', 'samplers': samplers, 'channels': channels}],
    'accessors': accs, 'bufferViews': views, 'buffers': [{'byteLength': len(blob)}],
}
js = json.dumps(out, separators=(',', ':')).encode()
js += b' ' * ((4 - len(js) % 4) % 4)
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(blob), 0x004E4942) + bytes(blob)
open(OUT, 'wb').write(glb)
print('écrit', OUT, len(glb), 'octets')
