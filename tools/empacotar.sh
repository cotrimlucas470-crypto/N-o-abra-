set -e
RAIZ=/home/user/N-o-abra-
SAI=$RAIZ/v74.zip
TMP=/tmp/claude-0/-home-user-N-o-abra-/49d84cda-7adf-5e47-9e63-bc3774aaa498/scratchpad/pacote
rm -rf "$TMP" "$SAI"; mkdir -p "$TMP"
cd "$RAIZ"
# o jogo e os blocos
cp index.html "$TMP/"
cp *.js "$TMP/"
cp sw.js "$TMP/" 2>/dev/null || true
cp manifest.json "$TMP/" 2>/dev/null || true
cp *.png "$TMP/" 2>/dev/null || true
cp *.mp3 "$TMP/" 2>/dev/null || true
cp *.md "$TMP/" 2>/dev/null || true
# audio, se existir como pasta
[ -d audio ] && cp -r audio "$TMP/"
# a documentacao que explica as decisoes
mkdir -p "$TMP/docs" "$TMP/tools/testes"
cp docs/*.md "$TMP/docs/" 2>/dev/null || true
cp docs/showcase.html "$TMP/docs/" 2>/dev/null || true
cp -r docs/imagens "$TMP/docs/" 2>/dev/null || true
# o video NAO vai no zip: sao 22 dos 28 MB e ele ja foi entregue a parte
# os testes, pra quem quiser rodar
cp tools/testes/*.mjs "$TMP/tools/testes/" 2>/dev/null || true
cp tools/testes/LEIA-ME.md "$TMP/tools/testes/" 2>/dev/null || true
cp tools/*.mjs "$TMP/tools/" 2>/dev/null || true
cd "$TMP" && zip -qr "$SAI" . && cd "$RAIZ"
echo "pacote: $(du -h "$SAI" | cut -f1) · $(unzip -l "$SAI" | tail -1 | awk '{print $2}') arquivos"
