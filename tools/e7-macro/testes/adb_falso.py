#!/usr/bin/env python3
"""adb falso para testar o macro sem celular."""
import os, sys, struct, zlib, pathlib
BASE = pathlib.Path(os.environ["FAKE_ADB_DIR"])
BASE.mkdir(parents=True, exist_ok=True)
args = sys.argv[1:]
while args and args[0] in ("-s",):
    args = args[2:]

def png(cor):
    linhas = bytearray()
    for _ in range(40):
        linhas.append(0)
        linhas += bytes(cor) * 40
    raw = zlib.compress(bytes(linhas), 6)
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 40, 40, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", raw) + chunk(b"IEND", b""))

if args[:1] == ["devices"]:
    print("List of devices attached"); print("FAKE123\tdevice"); sys.exit(0)

cmd = " ".join(args[1:]) if args and args[0] in ("shell", "exec-out") else ""

if "screencap" in cmd:
    contador_f = BASE / "contador"
    n = int(contador_f.read_text()) if contador_f.exists() else 0
    contador_f.write_text(str(n + 1))
    # muda de cor nas 6 primeiras leituras (batalha), depois estabiliza (tela de resultado)
    cor = (10 + (n * 37) % 200, 30, 40) if n < 6 else (200, 180, 90)
    out = png(cor)
    sys.stdout.buffer.write(out); sys.exit(0)

if cmd.startswith("wm size"):
    print("Physical size: 1220x2712"); sys.exit(0)

if cmd.startswith("dumpsys window"):
    print("  mCurrentFocus=Window{a1b2 u0 com.stove.epic7.google/com.epic7.MainActivity}"); sys.exit(0)

if cmd.startswith("input tap"):
    x, y = args[-2], args[-1]
    with (BASE / "toques.log").open("a") as f:
        f.write(f"{x} {y}\n")
    sys.exit(0)

if cmd.startswith("getevent -p"):
    print("""add device 1: /dev/input/event2
  name:     "gpio-keys"
  events:
    KEY (0001): 0072  0073
add device 2: /dev/input/event4
  name:     "fts_ts"
  events:
    ABS (0003): 0035  : value 0, min 0, max 4095, fuzz 0, flat 0, resolution 0
                0036  : value 0, min 0, max 4095, fuzz 0, flat 0, resolution 0
                0039  : value 0, min 0, max 9, fuzz 0, flat 0, resolution 0""")
    sys.exit(0)

if cmd.startswith("getevent -l"):
    print("EV_ABS       ABS_MT_TRACKING_ID   00000001")
    print("EV_ABS       ABS_MT_POSITION_X    00000800")
    print("EV_ABS       ABS_MT_POSITION_Y    00000400")
    print("EV_SYN       SYN_REPORT           00000000")
    print("EV_ABS       ABS_MT_TRACKING_ID   ffffffff")
    print("EV_SYN       SYN_REPORT           00000000")
    sys.exit(0)

sys.exit(0)
