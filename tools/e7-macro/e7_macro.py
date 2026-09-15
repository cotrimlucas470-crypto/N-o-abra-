#!/usr/bin/env python3
"""
Macro para Epic Seven via ADB — modo história com Iniciar Batalha + Auto.

AVISO: usar macro/automação viola os Termos de Serviço do Epic Seven (Smilegate).
Contas flagradas podem ser suspensas ou banidas em definitivo. Use por sua conta e risco.

Como funciona
-------------
O script conversa com o celular pelo ADB (USB ou depuração sem fio). Ele:
  1. descobre a resolução real da tela;
  2. aprende onde ficam os botões (você toca uma vez em cada, no próprio celular);
  3. executa um perfil (lista de passos em JSON) em ciclo: Iniciar → Auto → esperar
     a batalha acabar → recolher recompensas → próximo estágio.

Segurança embutida (importante): se uma tela esperada não aparecer dentro do tempo,
o macro PARA em vez de continuar tocando às cegas — isso evita toques aleatórios em
lojas, invocações e confirmações de gasto de recursos.

Dependências: só a biblioteca padrão do Python 3.8+ e o `adb` no PATH.
"""

from __future__ import annotations

import argparse
import json
import os
import random
import re
import shutil
import signal
import struct
import subprocess
import sys
import time
import zlib
from pathlib import Path

VERSAO = "1.0.0"
PASTA_PADRAO = Path(os.environ.get("E7_MACRO_DIR", Path.home() / ".e7-macro"))
PASTA_PERFIS = Path(__file__).resolve().parent / "perfis"

# ----------------------------------------------------------------------------- 
# ADB
# -----------------------------------------------------------------------------


class ErroADB(RuntimeError):
    pass


class ADB:
    """Camada fina sobre o executável adb."""

    def __init__(self, serial: str | None = None, adb: str = "adb", seco: bool = False):
        self.adb = adb
        self.serial = serial
        self.seco = seco          # modo simulação: não envia toques
        self.toques = 0
        if not shutil.which(adb) and not Path(adb).exists():
            raise ErroADB(
                f"'{adb}' não encontrado no PATH. Instale o platform-tools "
                f"(PC) ou 'pkg install android-tools' (Termux)."
            )

    def _base(self) -> list[str]:
        cmd = [self.adb]
        if self.serial:
            cmd += ["-s", self.serial]
        return cmd

    def run(self, *args: str, binario: bool = False, timeout: int = 40) -> bytes | str:
        proc = subprocess.run(
            self._base() + list(args),
            capture_output=True,
            timeout=timeout,
        )
        if proc.returncode != 0:
            erro = proc.stderr.decode("utf-8", "replace").strip()
            raise ErroADB(f"adb {' '.join(args)} falhou: {erro or proc.returncode}")
        return proc.stdout if binario else proc.stdout.decode("utf-8", "replace")

    def shell(self, comando: str, timeout: int = 40) -> str:
        return self.run("shell", comando, timeout=timeout)

    # --------------------------------------------------------------- consultas

    def dispositivos(self) -> list[tuple[str, str]]:
        saida = self.run("devices")
        out = []
        for linha in saida.splitlines()[1:]:
            partes = linha.split()
            if len(partes) >= 2:
                out.append((partes[0], partes[1]))
        return out

    def tamanho_tela(self) -> tuple[int, int]:
        saida = self.shell("wm size")
        # "Override size" manda quando existe (resolução efetiva do app)
        achados = re.findall(r"(?:Physical|Override) size:\s*(\d+)x(\d+)", saida)
        if not achados:
            raise ErroADB(f"não consegui ler a resolução da tela: {saida!r}")
        larg, alt = achados[-1]
        return int(larg), int(alt)

    def screencap(self) -> bytes:
        """PNG cru da tela. Usa exec-out; cai para shell + conserto de CRLF."""
        try:
            dados = self.run("exec-out", "screencap -p", binario=True)
            if dados[:8] == b"\x89PNG\r\n\x1a\n":
                return dados
        except ErroADB:
            pass
        dados = self.run("shell", "screencap -p", binario=True)
        if dados[:8] != b"\x89PNG\r\n\x1a\n":
            dados = dados.replace(b"\r\n", b"\n")
        return dados

    # ----------------------------------------------------------------- entrada

    def tocar(self, x: int, y: int) -> None:
        self.toques += 1
        if self.seco:
            print(f"    [simulação] tocaria em ({x}, {y})")
            return
        self.shell(f"input tap {int(x)} {int(y)}")

    def deslizar(self, x1: int, y1: int, x2: int, y2: int, ms: int = 300) -> None:
        if self.seco:
            print(f"    [simulação] deslizaria ({x1},{y1}) → ({x2},{y2})")
            return
        self.shell(f"input swipe {int(x1)} {int(y1)} {int(x2)} {int(y2)} {int(ms)}")

    def tecla(self, codigo: str) -> None:
        if self.seco:
            print(f"    [simulação] tecla {codigo}")
            return
        self.shell(f"input keyevent {codigo}")

    def app_em_primeiro_plano(self) -> str:
        try:
            saida = self.shell("dumpsys window | grep -E 'mCurrentFocus|mFocusedApp'")
        except ErroADB:
            return ""
        m = re.search(r"([A-Za-z0-9_.]+)/[A-Za-z0-9_.]+", saida)
        return m.group(1) if m else ""


# -----------------------------------------------------------------------------
# PNG mínimo (sem Pillow/OpenCV) — só o necessário para ler screencap
# -----------------------------------------------------------------------------


class Imagem:
    def __init__(self, largura: int, altura: int, canais: int, pixels: bytearray):
        self.largura = largura
        self.altura = altura
        self.canais = canais
        self.pixels = pixels

    def cor(self, x: int, y: int) -> tuple[int, int, int]:
        x = max(0, min(self.largura - 1, int(x)))
        y = max(0, min(self.altura - 1, int(y)))
        i = (y * self.largura + x) * self.canais
        p = self.pixels
        if self.canais >= 3:
            return p[i], p[i + 1], p[i + 2]
        v = p[i]
        return v, v, v

    def cor_media(self, x: int, y: int, larg: int, alt: int, passo: int = 4) -> tuple[int, int, int]:
        r = g = b = n = 0
        for yy in range(int(y), int(y + alt), passo):
            for xx in range(int(x), int(x + larg), passo):
                cr, cg, cb = self.cor(xx, yy)
                r += cr; g += cg; b += cb; n += 1
        if not n:
            return (0, 0, 0)
        return (r // n, g // n, b // n)


def decodificar_png(dados: bytes) -> Imagem:
    """Decodifica PNG 8/16 bits, não entrelaçado (o formato que o screencap gera)."""
    if dados[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("isso não é um PNG (screenshot falhou?)")
    pos = 8
    largura = altura = prof = tipo = 0
    idat = bytearray()
    while pos < len(dados):
        (tam,) = struct.unpack(">I", dados[pos:pos + 4])
        tag = dados[pos + 4:pos + 8]
        corpo = dados[pos + 8:pos + 8 + tam]
        pos += 12 + tam
        if tag == b"IHDR":
            largura, altura, prof, tipo, _comp, _filtro, entrelace = struct.unpack(">IIBBBBB", corpo)
            if entrelace:
                raise ValueError("PNG entrelaçado não suportado")
        elif tag == b"IDAT":
            idat += corpo
        elif tag == b"IEND":
            break

    canais = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[tipo]
    if tipo == 3:
        raise ValueError("PNG com paleta não suportado")
    bytes_px = canais * (2 if prof == 16 else 1)
    linha_bytes = largura * bytes_px
    cru = zlib.decompress(bytes(idat))

    saida = bytearray(largura * altura * canais)
    anterior = bytearray(linha_bytes)
    p = 0
    for y in range(altura):
        filtro = cru[p]; p += 1
        linha = bytearray(cru[p:p + linha_bytes]); p += linha_bytes
        if filtro == 1:
            for i in range(bytes_px, linha_bytes):
                linha[i] = (linha[i] + linha[i - bytes_px]) & 0xFF
        elif filtro == 2:
            for i in range(linha_bytes):
                linha[i] = (linha[i] + anterior[i]) & 0xFF
        elif filtro == 3:
            for i in range(linha_bytes):
                esq = linha[i - bytes_px] if i >= bytes_px else 0
                linha[i] = (linha[i] + ((esq + anterior[i]) >> 1)) & 0xFF
        elif filtro == 4:
            for i in range(linha_bytes):
                a = linha[i - bytes_px] if i >= bytes_px else 0
                b = anterior[i]
                c = anterior[i - bytes_px] if i >= bytes_px else 0
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                linha[i] = (linha[i] + pr) & 0xFF
        elif filtro != 0:
            raise ValueError(f"filtro PNG desconhecido: {filtro}")
        anterior = linha

        base = y * largura * canais
        if prof == 16:
            for i in range(largura * canais):
                saida[base + i] = linha[i * 2]      # descarta o byte baixo
        else:
            saida[base:base + largura * canais] = linha
    return Imagem(largura, altura, canais, saida)


def distancia_cor(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    return max(abs(a[0] - b[0]), abs(a[1] - b[1]), abs(a[2] - b[2]))


# -----------------------------------------------------------------------------
# Configuração
# -----------------------------------------------------------------------------


class Config:
    def __init__(self, caminho: Path):
        self.caminho = caminho
        self.dados = {
            "versao": VERSAO,
            "resolucao": None,
            "pontos": {},
            "regioes": {},
            "opcoes": {
                "ligar_auto": True,
                "jitter": 0.18,
                "espera_max_batalha": 300,
                "estavel_por": 2.5,
                "intervalo_amostra": 1.0,
                "pausa_entre_ciclos": 1.5,
            },
        }
        if caminho.exists():
            self.dados.update(json.loads(caminho.read_text("utf-8")))

    def salvar(self) -> None:
        self.caminho.parent.mkdir(parents=True, exist_ok=True)
        self.caminho.write_text(json.dumps(self.dados, indent=2, ensure_ascii=False), "utf-8")

    @property
    def pontos(self) -> dict:
        return self.dados["pontos"]

    @property
    def regioes(self) -> dict:
        return self.dados["regioes"]

    @property
    def opcoes(self) -> dict:
        return self.dados["opcoes"]


def carregar_perfil(nome: str) -> dict:
    caminho = Path(nome)
    if not caminho.exists():
        caminho = PASTA_PERFIS / f"{nome}.json"
    if not caminho.exists():
        disponiveis = ", ".join(p.stem for p in PASTA_PERFIS.glob("*.json"))
        raise SystemExit(f"perfil '{nome}' não encontrado. Disponíveis: {disponiveis}")
    return json.loads(caminho.read_text("utf-8"))


# -----------------------------------------------------------------------------
# Calibração
# -----------------------------------------------------------------------------


def achar_touchscreen(adb: ADB) -> tuple[str, int, int]:
    """Descobre /dev/input/eventN da tela e os valores máximos de X e Y."""
    saida = adb.shell("getevent -p", timeout=20)
    dispositivo = None
    atual = None
    max_x = max_y = None
    achados = {}
    for linha in saida.splitlines():
        m = re.search(r"add device \d+:\s*(\S+)", linha)
        if m:
            atual = m.group(1)
            achados[atual] = {}
            continue
        if atual is None:
            continue
        mx = re.search(r"0035\s*:\s*value.*?max\s+(\d+)", linha)
        my = re.search(r"0036\s*:\s*value.*?max\s+(\d+)", linha)
        if mx:
            achados[atual]["x"] = int(mx.group(1))
        if my:
            achados[atual]["y"] = int(my.group(1))
    for dev, vals in achados.items():
        if "x" in vals and "y" in vals:
            dispositivo, max_x, max_y = dev, vals["x"], vals["y"]
            break
    if not dispositivo:
        raise ErroADB("não achei o dispositivo de toque (getevent -p sem ABS_MT_POSITION).")
    return dispositivo, max_x, max_y


def ler_um_toque(adb: ADB, dispositivo: str, max_x: int, max_y: int,
                 tela: tuple[int, int], timeout: int = 60) -> tuple[int, int]:
    """Bloqueia até o usuário tocar na tela do celular e devolve a coordenada."""
    proc = subprocess.Popen(
        adb._base() + ["shell", f"getevent -l {dispositivo}"],
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, bufsize=1,
    )
    x = y = None
    limite = time.time() + timeout
    try:
        for linha in proc.stdout:
            if time.time() > limite:
                raise ErroADB("tempo esgotado esperando o toque.")
            if "ABS_MT_POSITION_X" in linha:
                x = int(linha.split()[-1], 16)
            elif "ABS_MT_POSITION_Y" in linha:
                y = int(linha.split()[-1], 16)
            elif ("BTN_TOUCH" in linha and "UP" in linha) or "ffffffff" in linha:
                if x is not None and y is not None:
                    break
    finally:
        proc.kill()
    if x is None or y is None:
        raise ErroADB("não consegui ler o toque.")
    larg, alt = tela
    return (
        int(round(x * (larg - 1) / max(1, max_x))),
        int(round(y * (alt - 1) / max(1, max_y))),
    )


def calibrar(adb: ADB, cfg: Config, perfil: dict, manual: bool, refazer: bool) -> None:
    tela = adb.tamanho_tela()
    cfg.dados["resolucao"] = list(tela)
    print(f"Tela detectada: {tela[0]}x{tela[1]}")

    dispositivo = max_x = max_y = None
    if not manual:
        try:
            dispositivo, max_x, max_y = achar_touchscreen(adb)
            print(f"Touchscreen: {dispositivo} (max {max_x}x{max_y})")
        except ErroADB as e:
            print(f"[aviso] {e}\n  → caindo para calibração manual.")
            manual = True

    necessarios = perfil.get("pontos", [])
    for item in necessarios:
        nome, descricao = item["nome"], item["descricao"]
        opcional = item.get("opcional", False)
        if nome in cfg.pontos and not refazer:
            print(f"  · {nome}: já calibrado em {cfg.pontos[nome]} (use --refazer para trocar)")
            continue

        print(f"\n▸ {descricao}")
        if opcional:
            print("  (opcional — ENTER em branco para pular)")

        if manual:
            resp = input(f"  coordenadas de '{nome}' como 'x y' (ou vazio p/ pular): ").strip()
            if not resp:
                if opcional:
                    continue
                raise SystemExit("ponto obrigatório não informado.")
            px, py = (int(v) for v in resp.replace(",", " ").split()[:2])
        else:
            if opcional and input("  calibrar este? [s/N]: ").strip().lower() not in ("s", "sim", "y"):
                continue
            print("  toque AGORA nesse botão na tela do celular…")
            px, py = ler_um_toque(adb, dispositivo, max_x, max_y, tela)
            print(f"  ✓ registrado em ({px}, {py})")
        cfg.pontos[nome] = [px, py]

    for item in perfil.get("regioes", []):
        nome, descricao = item["nome"], item["descricao"]
        if nome in cfg.regioes and not refazer:
            print(f"  · região {nome}: já definida em {cfg.regioes[nome]}")
            continue
        if item.get("padrao_central"):
            larg, alt = tela
            w, h = int(larg * 0.5), int(alt * 0.22)
            cfg.regioes[nome] = [int((larg - w) / 2), int(alt * 0.38), w, h]
            print(f"  · região {nome}: usando padrão central {cfg.regioes[nome]} ({descricao})")

    cfg.salvar()
    print(f"\nConfiguração salva em {cfg.caminho}")


# -----------------------------------------------------------------------------
# Execução dos passos
# -----------------------------------------------------------------------------


class ParadaSegura(RuntimeError):
    """Levantada quando a tela esperada não apareceu — melhor parar do que tocar às cegas."""


class Executor:
    def __init__(self, adb: ADB, cfg: Config, verboso: bool = True):
        self.adb = adb
        self.cfg = cfg
        self.verboso = verboso
        self.parar = False
        self.ciclo = 0

    # ------------------------------------------------------------------ helpers

    def _jitter(self, segundos: float) -> float:
        j = float(self.cfg.opcoes.get("jitter", 0.15))
        if segundos <= 0 or j <= 0:
            return max(0.0, segundos)
        # variação pequena: tempos de carregamento e animação não são constantes
        return max(0.05, segundos * random.uniform(1 - j, 1 + j))

    def dormir(self, segundos: float) -> None:
        alvo = time.time() + self._jitter(segundos)
        while time.time() < alvo:
            if self.parar:
                raise KeyboardInterrupt
            time.sleep(min(0.2, max(0.0, alvo - time.time())))

    def ponto(self, nome: str) -> tuple[int, int]:
        if nome not in self.cfg.pontos:
            raise ParadaSegura(f"ponto '{nome}' não calibrado. Rode: e7_macro.py calibrar")
        x, y = self.cfg.pontos[nome]
        return int(x), int(y)

    def regiao(self, nome: str) -> tuple[int, int, int, int]:
        if nome not in self.cfg.regioes:
            larg, alt = self.cfg.dados["resolucao"]
            w, h = int(larg * 0.5), int(alt * 0.22)
            return int((larg - w) / 2), int(alt * 0.38), w, h
        x, y, w, h = self.cfg.regioes[nome]
        return int(x), int(y), int(w), int(h)

    def log(self, texto: str) -> None:
        if self.verboso:
            print(f"  {texto}", flush=True)

    def cor_regiao(self, nome: str) -> tuple[int, int, int]:
        img = decodificar_png(self.adb.screencap())
        x, y, w, h = self.regiao(nome)
        return img.cor_media(x, y, w, h)

    # -------------------------------------------------------------------- ações

    def acao_tocar(self, passo: dict) -> None:
        if passo.get("se_opcao") and not self.cfg.opcoes.get(passo["se_opcao"], True):
            self.log(f"↷ pulando '{passo['ponto']}' (opção {passo['se_opcao']} desligada)")
            return
        nome = passo["ponto"]
        if passo.get("opcional") and nome not in self.cfg.pontos:
            self.log(f"↷ '{nome}' não calibrado (opcional) — pulando")
            return
        x, y = self.ponto(nome)
        self.log(f"→ toque em {nome} ({x}, {y})")
        self.adb.tocar(x, y)
        self.dormir(passo.get("depois", 0.6))

    def acao_tocar_repetido(self, passo: dict) -> None:
        nome = passo["ponto"]
        if passo.get("opcional") and nome not in self.cfg.pontos:
            return
        x, y = self.ponto(nome)
        vezes = int(passo.get("vezes", 5))
        self.log(f"→ {vezes}× toque em {nome} ({x}, {y})")
        for _ in range(vezes):
            self.adb.tocar(x, y)
            self.dormir(passo.get("intervalo", 0.8))

    def acao_esperar(self, passo: dict) -> None:
        s = float(passo.get("segundos", 1))
        self.log(f"… esperando {s:.1f}s ({passo.get('motivo', 'pausa')})")
        self.dormir(s)

    def acao_esperar_estavel(self, passo: dict) -> None:
        """Espera a região parar de mudar — é assim que detectamos o fim da batalha."""
        nome = passo.get("regiao", "centro")
        timeout = float(passo.get("timeout", self.cfg.opcoes.get("espera_max_batalha", 300)))
        estavel_por = float(passo.get("estavel_por", self.cfg.opcoes.get("estavel_por", 2.5)))
        intervalo = float(passo.get("intervalo", self.cfg.opcoes.get("intervalo_amostra", 1.0)))
        tolerancia = float(passo.get("tolerancia", 6))
        minimo = float(passo.get("minimo", 0))

        self.log(f"… aguardando o fim da batalha (região {nome}, até {timeout:.0f}s)")
        inicio = time.time()
        if minimo:
            self.dormir(minimo)
        ultima = None
        estavel_desde = None
        while time.time() - inicio < timeout:
            if self.parar:
                raise KeyboardInterrupt
            try:
                atual = self.cor_regiao(nome)
            except Exception as e:                       # screenshot pode falhar pontualmente
                self.log(f"[aviso] screenshot falhou ({e}); tentando de novo")
                time.sleep(intervalo)
                continue
            if ultima is not None and distancia_cor(atual, ultima) <= tolerancia:
                estavel_desde = estavel_desde or time.time()
                if time.time() - estavel_desde >= estavel_por:
                    self.log(f"✓ tela estabilizou após {time.time() - inicio:.0f}s")
                    return
            else:
                estavel_desde = None
            ultima = atual
            time.sleep(intervalo)
        raise ParadaSegura(
            f"a batalha não terminou em {timeout:.0f}s. Parando para não tocar às cegas."
        )

    def acao_esperar_mudanca(self, passo: dict) -> None:
        """Espera a região MUDAR (ex.: sair do menu e entrar no carregamento)."""
        nome = passo.get("regiao", "centro")
        timeout = float(passo.get("timeout", 30))
        tolerancia = float(passo.get("tolerancia", 12))
        intervalo = float(passo.get("intervalo", 0.7))
        base = self.cor_regiao(nome)
        inicio = time.time()
        while time.time() - inicio < timeout:
            if self.parar:
                raise KeyboardInterrupt
            time.sleep(intervalo)
            if distancia_cor(self.cor_regiao(nome), base) > tolerancia:
                self.log(f"✓ tela mudou após {time.time() - inicio:.1f}s")
                return
        if passo.get("obrigatorio", True):
            raise ParadaSegura(f"a tela não mudou em {timeout:.0f}s ({passo.get('motivo', nome)}).")
        self.log("↷ tela não mudou, mas o passo é opcional — seguindo")

    def acao_log(self, passo: dict) -> None:
        self.log(passo.get("texto", ""))

    ACOES = {
        "tocar": acao_tocar,
        "tocar_repetido": acao_tocar_repetido,
        "esperar": acao_esperar,
        "esperar_estavel": acao_esperar_estavel,
        "esperar_mudanca": acao_esperar_mudanca,
        "log": acao_log,
    }

    # -------------------------------------------------------------------- laço

    def rodar(self, perfil: dict, ciclos: int, arquivo_parada: Path | None) -> int:
        passos = perfil["passos"]
        feitos = 0
        for i in range(1, ciclos + 1):
            if self.parar:
                break
            if arquivo_parada and arquivo_parada.exists():
                print(f"\n■ arquivo de parada encontrado ({arquivo_parada}) — encerrando.")
                break
            self.ciclo = i
            print(f"\n── ciclo {i}/{ciclos} ─────────────────────────────")
            for passo in passos:
                if self.parar:
                    break
                acao = self.ACOES.get(passo.get("acao"))
                if not acao:
                    raise SystemExit(f"ação desconhecida no perfil: {passo.get('acao')!r}")
                acao(self, passo)
            feitos += 1
            self.dormir(self.cfg.opcoes.get("pausa_entre_ciclos", 1.5))
        return feitos


# -----------------------------------------------------------------------------
# CLI
# -----------------------------------------------------------------------------


def cmd_dispositivos(args, adb: ADB, cfg: Config) -> int:
    disp = adb.dispositivos()
    if not disp:
        print("Nenhum dispositivo. Confira: depuração USB ligada, cabo conectado e "
              "autorização aceita no celular (ou 'adb pair' para depuração sem fio).")
        return 1
    for serial, estado in disp:
        print(f"  {serial}\t{estado}")
    try:
        print(f"\nResolução: {'x'.join(map(str, adb.tamanho_tela()))}")
        print(f"App em foco: {adb.app_em_primeiro_plano() or '—'}")
    except ErroADB as e:
        print(f"[aviso] {e}")
    return 0


def cmd_calibrar(args, adb: ADB, cfg: Config) -> int:
    perfil = carregar_perfil(args.perfil)
    print(f"Calibrando para o perfil '{perfil.get('nome', args.perfil)}'.")
    print("Deixe o Epic Seven aberto na tela do estágio antes de começar.\n")
    calibrar(adb, cfg, perfil, manual=args.manual, refazer=args.refazer)
    return 0


def cmd_testar(args, adb: ADB, cfg: Config) -> int:
    if not cfg.pontos:
        print("Nada calibrado ainda. Rode 'calibrar' primeiro.")
        return 1
    print("Pontos calibrados:")
    for nome, (x, y) in cfg.pontos.items():
        print(f"  {nome:<20} ({x}, {y})")
    print("\nRegiões:")
    for nome, r in cfg.regioes.items():
        print(f"  {nome:<20} {r}")
    try:
        img = decodificar_png(adb.screencap())
        print(f"\nScreenshot lido: {img.largura}x{img.altura}, {img.canais} canais")
        for nome in cfg.regioes:
            ex = Executor(adb, cfg)
            print(f"  cor média de '{nome}': {ex.cor_regiao(nome)}")
    except Exception as e:
        print(f"[aviso] não consegui ler a tela: {e}")
        return 1
    if args.tocar:
        x, y = cfg.pontos[args.tocar]
        print(f"\nTocando em '{args.tocar}' ({x}, {y})…")
        adb.tocar(x, y)
    return 0


def cmd_rodar(args, adb: ADB, cfg: Config) -> int:
    perfil = carregar_perfil(args.perfil)
    if not cfg.dados.get("resolucao"):
        cfg.dados["resolucao"] = list(adb.tamanho_tela())
    faltando = [
        p["nome"] for p in perfil.get("pontos", [])
        if not p.get("opcional") and p["nome"] not in cfg.pontos
    ]
    if faltando:
        print(f"Faltam pontos calibrados: {', '.join(faltando)}\nRode: e7_macro.py calibrar")
        return 1

    if args.ligar_auto is not None:
        cfg.opcoes["ligar_auto"] = args.ligar_auto

    if not args.pular_checagem_app:
        foco = adb.app_em_primeiro_plano()
        if foco and "stove" not in foco.lower() and "epic7" not in foco.lower():
            print(f"[aviso] app em foco: {foco} — não parece o Epic Seven.")
            if input("continuar mesmo assim? [s/N]: ").strip().lower() not in ("s", "sim", "y"):
                return 1

    executor = Executor(adb, cfg, verboso=not args.silencioso)

    def parar(_sig, _frm):
        print("\n■ parada solicitada — terminando o passo atual…")
        executor.parar = True
    signal.signal(signal.SIGINT, parar)

    arquivo_parada = Path(args.arquivo_parada) if args.arquivo_parada else None
    print(f"Perfil: {perfil.get('nome', args.perfil)} · ciclos: {args.ciclos} · "
          f"auto: {'ligado' if cfg.opcoes.get('ligar_auto') else 'não mexer'}"
          f"{' · SIMULAÇÃO' if adb.seco else ''}")
    print("Ctrl+C para parar com segurança.")

    inicio = time.time()
    codigo = 0
    try:
        feitos = executor.rodar(perfil, args.ciclos, arquivo_parada)
    except ParadaSegura as e:
        print(f"\n⚠ PARADA DE SEGURANÇA: {e}")
        feitos = executor.ciclo - 1
        codigo = 2
    except KeyboardInterrupt:
        feitos = executor.ciclo - 1
        print("\n■ interrompido pelo usuário.")
    minutos = (time.time() - inicio) / 60
    print(f"\nCiclos completos: {feitos} · tempo: {minutos:.1f} min · toques: {adb.toques}")
    return codigo


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(
        prog="e7_macro.py",
        description="Macro do Epic Seven via ADB (Iniciar Batalha + Auto, em ciclo).",
        epilog="Aviso: automação viola os Termos de Serviço do jogo e pode levar a banimento.",
    )
    p.add_argument("--adb", default=os.environ.get("ADB", "adb"), help="caminho do executável adb")
    p.add_argument("--serial", help="serial do dispositivo (quando há mais de um)")
    p.add_argument("--config", default=str(PASTA_PADRAO / "config.json"), help="arquivo de configuração")
    p.add_argument("--simular", action="store_true", help="não envia toques; só mostra o que faria")
    p.add_argument("--versao", action="version", version=f"e7_macro {VERSAO}")
    sub = p.add_subparsers(dest="comando", required=True)

    s = sub.add_parser("dispositivos", help="lista dispositivos ADB e a resolução")
    s.set_defaults(func=cmd_dispositivos)

    s = sub.add_parser("calibrar", help="aprende a posição dos botões")
    s.add_argument("--perfil", default="historia")
    s.add_argument("--manual", action="store_true", help="digitar coordenadas em vez de tocar")
    s.add_argument("--refazer", action="store_true", help="recalibrar pontos já salvos")
    s.set_defaults(func=cmd_calibrar)

    s = sub.add_parser("testar", help="mostra a calibração e lê a tela")
    s.add_argument("--tocar", help="dispara um toque de teste no ponto indicado")
    s.set_defaults(func=cmd_testar)

    s = sub.add_parser("rodar", help="executa o macro em ciclo")
    s.add_argument("--perfil", default="historia")
    s.add_argument("--ciclos", type=int, default=10)
    s.add_argument("--arquivo-parada", default=str(PASTA_PADRAO / "PARAR"),
                   help="criar esse arquivo interrompe o macro")
    s.add_argument("--ligar-auto", dest="ligar_auto", action="store_true", default=None,
                   help="tocar no botão Auto a cada batalha")
    s.add_argument("--nao-ligar-auto", dest="ligar_auto", action="store_false",
                   help="não tocar no Auto (use se o jogo já mantém ligado)")
    s.add_argument("--pular-checagem-app", action="store_true")
    s.add_argument("--silencioso", action="store_true")
    s.set_defaults(func=cmd_rodar)

    args = p.parse_args(argv)
    try:
        adb = ADB(serial=args.serial, adb=args.adb, seco=args.simular)
    except ErroADB as e:
        print(f"Erro: {e}")
        return 1
    cfg = Config(Path(args.config))
    try:
        return args.func(args, adb, cfg)
    except ErroADB as e:
        print(f"Erro de ADB: {e}")
        return 1
    except ParadaSegura as e:
        print(f"⚠ {e}")
        return 2


if __name__ == "__main__":
    sys.exit(main())
