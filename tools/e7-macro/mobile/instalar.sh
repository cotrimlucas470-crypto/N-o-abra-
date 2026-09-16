#!/usr/bin/env bash
# Instala o macro no celular (Termux) e cria os atalhos da tela inicial.
#
#   bash mobile/instalar.sh            instala tudo
#   bash mobile/instalar.sh --sem-pacotes   pula o 'pkg install'
#
# Depois disso o macro liga de três formas:
#   · widget "E7 Macro"    → menu na tela
#   · widget "E7 História" → já começa a rodar
#   · widget "E7 Parar"    → para o que estiver rodando
set -euo pipefail

ORIGEM="$(cd "$(dirname "$0")/.." && pwd)"
DESTINO="$HOME/e7-macro"
ATALHOS="$HOME/.shortcuts"
SEM_PACOTES=0
[ "${1:-}" = "--sem-pacotes" ] && SEM_PACOTES=1

ehTermux=0
[ -n "${PREFIX:-}" ] && [ -d "${PREFIX:-/nao}/bin" ] && case "$PREFIX" in *com.termux*) ehTermux=1;; esac

echo "▸ Instalando o macro em $DESTINO"

if [ "$ehTermux" = 1 ] && [ "$SEM_PACOTES" = 0 ]; then
  echo "▸ Instalando dependências (python, android-tools)…"
  pkg install -y python android-tools >/dev/null || {
    echo "  não consegui instalar automaticamente. Rode à mão:"
    echo "    pkg install python android-tools"
  }
fi

command -v python3 >/dev/null || { echo "✗ python3 não encontrado."; exit 1; }
command -v adb     >/dev/null || echo "⚠ 'adb' não encontrado — instale com: pkg install android-tools"

mkdir -p "$DESTINO"
cp -r "$ORIGEM/e7_macro.py" "$ORIGEM/perfis" "$ORIGEM/README.md" "$DESTINO/"
chmod +x "$DESTINO/e7_macro.py"

# comando curto: basta digitar  e7
BIN="${PREFIX:-$HOME/.local}/bin"
mkdir -p "$BIN"
cat > "$BIN/e7" <<'SH'
#!/usr/bin/env bash
cd "$HOME/e7-macro" || exit 1
exec python3 e7_macro.py "${@:-menu}"
SH
chmod +x "$BIN/e7"
echo "▸ Comando criado: digite 'e7' para abrir o menu"

# atalhos do Termux:Widget (ícones na tela inicial)
mkdir -p "$ATALHOS"

cat > "$ATALHOS/E7 Macro.sh" <<'SH'
#!/usr/bin/env bash
# Abre o menu do macro.
termux-wake-lock 2>/dev/null || true
cd "$HOME/e7-macro" && python3 e7_macro.py menu
termux-wake-unlock 2>/dev/null || true
SH

cat > "$ATALHOS/E7 Historia.sh" <<'SH'
#!/usr/bin/env bash
# Um toque: conecta, espera 10s para você abrir o jogo e roda 20 batalhas da história.
termux-wake-lock 2>/dev/null || true
cd "$HOME/e7-macro" || exit 1
python3 e7_macro.py conectar >/dev/null 2>&1 || true
python3 e7_macro.py rodar --perfil historia --ciclos 20 --esperar-jogo 10
echo; read -r -p "fim — ENTER para fechar " _
termux-wake-unlock 2>/dev/null || true
SH

cat > "$ATALHOS/E7 Parar.sh" <<'SH'
#!/usr/bin/env bash
# Para o macro que estiver rodando (o laço checa este arquivo a cada segundo).
mkdir -p "$HOME/.e7-macro" && touch "$HOME/.e7-macro/PARAR"
echo "■ parada solicitada."
sleep 1
SH

chmod +x "$ATALHOS"/E7*.sh
echo "▸ Atalhos criados em $ATALHOS: E7 Macro · E7 Historia · E7 Parar"

cat <<'FIM'

──────────────────────────────────────────────
PRÓXIMOS PASSOS (uma vez só)

1. Celular → Configurações → Opções do desenvolvedor:
     • Depuração sem fio: LIGADA
     • (Xiaomi/POCO) Depuração USB (Configurações de segurança): LIGADA

2. No Termux:
     e7 conectar --parear      (primeira vez: porta + código de pareamento)
     e7 calibrar               (toque em cada botão do jogo quando pedir;
                                o botão AUTO precisa ser calibrado dentro de uma batalha)

3. Instale o app "Termux:Widget" (F-Droid), segure a tela inicial do Android →
   Widgets → Termux:Widget → escolha "E7 Macro", "E7 Historia" ou "E7 Parar".

Daí em diante: um toque no ícone e pronto.
Lembrete: automação viola os Termos de Serviço do Epic Seven e pode gerar banimento.
──────────────────────────────────────────────
FIM
