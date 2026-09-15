#!/usr/bin/env bash
# Testa o macro sem celular, usando um "adb" falso que responde como um aparelho real.
set -euo pipefail
cd "$(dirname "$0")"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$TMP/bin" "$TMP/estado"
cp adb_falso.py "$TMP/bin/adb"
chmod +x "$TMP/bin/adb"
export PATH="$TMP/bin:$PATH" FAKE_ADB_DIR="$TMP/estado"
CFG="$TMP/config.json"

echo "== dispositivos =="
python3 ../e7_macro.py --config "$CFG" dispositivos

echo; echo "== calibração por toque (getevent) =="
python3 ../e7_macro.py --config "$CFG" calibrar --perfil perfil_teste.json </dev/null >/dev/null
python3 - "$CFG" <<'PY'
import json, sys
c = json.load(open(sys.argv[1]))
assert c["pontos"]["iniciar_batalha"] == [610, 678], c["pontos"]
assert c["resolucao"] == [1220, 2712], c["resolucao"]
c["pontos"] = {"iniciar_batalha": [1100, 2500], "confirmar_equipe": [1000, 2400],
               "auto": [1150, 300], "recompensa": [610, 1400], "proximo": [900, 2550]}
c["opcoes"]["jitter"] = 0
c["opcoes"]["pausa_entre_ciclos"] = 0.05
json.dump(c, open(sys.argv[1], "w"), indent=2)
print("  ✓ coordenadas do toque convertidas corretamente")
PY

echo; echo "== execução (1 ciclo real + parada de segurança no 2º) =="
set +e
python3 ../e7_macro.py --config "$CFG" rodar --perfil perfil_teste.json --ciclos 2 >"$TMP/saida.txt" 2>&1
codigo=$?
set -e
grep -q "PARADA DE SEGURANÇA" "$TMP/saida.txt" || { echo "FALHOU: sem parada de segurança"; cat "$TMP/saida.txt"; exit 1; }
[ "$codigo" = "2" ] || { echo "FALHOU: código de saída $codigo (esperado 2)"; exit 1; }
esperado="1100 2500
1000 2400
1150 300
610 1400
610 1400
610 1400
900 2550
1100 2500
1000 2400"
obtido="$(sed 's/.*input tap //' "$TMP/estado/toques.log")"
[ "$obtido" = "$esperado" ] || { echo "FALHOU: sequência de toques"; diff <(echo "$esperado") <(echo "$obtido"); exit 1; }
echo "  ✓ sequência de toques correta (iniciar → equipe → auto → recompensas → próximo)"
echo "  ✓ parada de segurança quando a tela não muda"
echo; echo "TODOS OS TESTES PASSARAM"
