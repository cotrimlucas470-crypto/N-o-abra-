#!/usr/bin/env python3
"""Gera os ícones PNG do Forge Mobile (sem dependências externas).

Desenho: bloco arredondado com gradiente laranja→rosa e um "F" vazado.
Rode com: python3 tools/make_icons.py
"""
import struct, zlib, os

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'icons')

BG = (12, 14, 18)
C1 = (255, 122, 61)
C2 = (255, 77, 109)
FG = (22, 17, 12)


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def rounded(x, y, x0, y0, x1, y1, r):
    if x < x0 or x > x1 or y < y0 or y > y1:
        return False
    for cx, cy in ((x0 + r, y0 + r), (x1 - r, y0 + r), (x0 + r, y1 - r), (x1 - r, y1 - r)):
        if (x < x0 + r or x > x1 - r) and (y < y0 + r or y > y1 - r):
            if (x - cx) ** 2 + (y - cy) ** 2 > r * r and \
               abs(x - cx) > 0 and abs(y - cy) > 0 and \
               ((x < x0 + r) == (cx == x0 + r)) and ((y < y0 + r) == (cy == y0 + r)):
                return False
    return True


def make(size, maskable=False):
    pad = int(size * 0.02) if maskable else int(size * 0.10)
    x0, y0 = pad, pad
    x1, y1 = size - pad - 1, size - pad - 1
    r = int((x1 - x0) * (0.14 if not maskable else 0.10))

    # geometria do "F"
    w = x1 - x0
    fx0 = x0 + int(w * 0.30)
    fx1 = x0 + int(w * 0.72)
    fy0 = y0 + int(w * 0.24)
    fy1 = y1 - int(w * 0.22)
    bar = max(2, int(w * 0.115))

    rows = bytearray()
    for y in range(size):
        rows.append(0)  # filtro None
        for x in range(size):
            if rounded(x, y, x0, y0, x1, y1, r):
                t = ((x - x0) + (y - y0)) / max(1, (x1 - x0) + (y1 - y0))
                col = lerp(C1, C2, t)
                in_stem = fx0 <= x < fx0 + bar and fy0 <= y <= fy1
                in_top = fy0 <= y < fy0 + bar and fx0 <= x <= fx1
                in_mid = (fy0 + fy1) // 2 - bar // 2 <= y < (fy0 + fy1) // 2 + bar - bar // 2 and fx0 <= x <= fx1 - int(w * 0.10)
                if in_stem or in_top or in_mid:
                    col = FG
            else:
                col = BG if maskable else BG
            rows += bytes(col)

    raw = zlib.compress(bytes(rows), 9)

    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
    png += chunk(b'IDAT', raw)
    png += chunk(b'IEND', b'')
    return png


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, size, mask in (('icon-192.png', 192, False), ('icon-512.png', 512, False), ('icon-maskable-512.png', 512, True)):
        path = os.path.join(OUT, name)
        with open(path, 'wb') as f:
            f.write(make(size, mask))
        print('gerado', path, os.path.getsize(path), 'bytes')
