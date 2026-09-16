# Macro Epic Seven — Iniciar Batalha + Auto (modo história)

Macro que controla o celular por **ADB**: toca em *Iniciar Batalha*, liga o **Auto**,
espera a batalha acabar, recolhe as recompensas e vai para o próximo estágio — em ciclo.

> ## ⚠ Leia antes
> Os **Termos de Serviço do Epic Seven (Smilegate) proíbem macro e automação**. Contas
> flagradas podem ser suspensas ou **banidas em definitivo**, e não existe forma de
> automatizar sem esse risco. Este script não esconde nada de ninguém e não tenta burlar
> detecção — ele só repete toques que você faria com o dedo. O risco é todo seu.
>
> Alternativa sem risco: o próprio jogo tem **Repetir Batalha** (auto-repetição nativa)
> para farmar estágios já liberados. Para *avançar* no modo história é que não existe
> função nativa — que é exatamente o buraco que este macro preenche.

---

## 1. O que ele faz

Ciclo do perfil `historia`:

```
Iniciar Batalha → Iniciar (formação) → [espera a tela mudar]
→ toca em Auto → [espera a batalha terminar] → toques nas recompensas
→ Próximo estágio → (opcional) pular diálogo
```

Três coisas que fazem diferença na prática:

* **Nada de coordenadas chutadas.** Você calibra uma vez tocando em cada botão no próprio
  celular; o script lê o toque pelo `getevent` e converte para a resolução da sua tela.
* **Fim de batalha detectado de verdade.** Em vez de um `sleep` fixo, ele tira prints e
  espera a região central da tela *parar de mudar* — batalha curta não desperdiça tempo,
  batalha longa não é cortada no meio.
* **Parada de segurança.** Se a tela esperada não aparecer no tempo limite, o macro **para**
  em vez de sair tocando às cegas. É o que evita toque acidental em loja, invocação ou
  qualquer confirmação que gaste recurso.

## 2. Ativar no celular com um toque (Termux)

Sem PC. Instala, cria o comando `e7` e coloca três ícones na tela inicial do Android.

**Uma vez só:**

1. Instale o **Termux** e o **Termux:Widget** (F-Droid — a versão da Play Store é antiga).
2. Copie a pasta do macro para o celular e, no Termux:

   ```bash
   cd ~/storage/downloads/e7-macro      # ou onde você descompactou
   bash mobile/instalar.sh
   ```

   (se for a primeira vez no Termux, rode `termux-setup-storage` antes para enxergar a pasta Downloads)

3. Ligue em *Configurações → Opções do desenvolvedor*:
   **Depuração sem fio** e, na Xiaomi/POCO, **Depuração USB (Configurações de segurança)**.

4. Ainda no Termux:

   ```bash
   e7 conectar --parear   # informe a porta de pareamento e o código de 6 dígitos
   e7 calibrar            # toque em cada botão quando ele pedir
   ```

   O botão **Auto** precisa ser calibrado com você **dentro de uma batalha**.

5. Segure um espaço vazio da tela inicial → *Widgets* → **Termux:Widget** → escolha o atalho.

**Do dia a dia em diante:**

| Ícone | O que faz |
|---|---|
| **E7 Macro** | abre o menu numérico (conectar, calibrar, rodar, ensaio) |
| **E7 Historia** | conecta, dá 10 s para você abrir o jogo e roda 20 batalhas |
| **E7 Parar** | para o macro na hora — o laço checa esse pedido a cada segundo, mesmo no meio da batalha |

Também dá para usar só o comando: `e7` (menu), `e7 rodar --perfil historia --ciclos 30`.

> O Termux precisa continuar vivo em segundo plano enquanto você joga: os atalhos já
> chamam `termux-wake-lock`, e na notificação do Termux existe *Acquire wakelock*.
> Nas configurações de bateria do Android, deixe o Termux como **sem restrições**.

---

## 3. O que você precisa

* Python 3.8+
* `adb` (Android platform-tools)
* Depuração USB (ou sem fio) ligada no celular

### Opção A — pelo PC

1. Celular: *Configurações → Sobre o telefone* → toque 7× em **Versão do MIUI/HyperOS**
   para liberar as Opções do desenvolvedor.
2. *Opções do desenvolvedor* → ligue **Depuração USB** (na Xiaomi/POCO, também
   **Depuração USB (Configurações de segurança)** se for usar toques via ADB).
3. Conecte o cabo, aceite o aviso "Permitir depuração USB" no celular.
4. No PC: `adb devices` tem que listar o aparelho como `device`.

### Opção B — só no celular (o instalador acima já faz isso)

Funciona no Android 11+ (inclui HyperOS 2):

```bash
pkg install android-tools python
# Opções do desenvolvedor → Depuração sem fio → Parear dispositivo com código
adb pair 127.0.0.1:PORTA_DE_PAREAMENTO      # digite o código de 6 dígitos
adb connect 127.0.0.1:PORTA_DA_DEPURACAO    # porta da tela "Depuração sem fio"
adb devices
```

Depois é só rodar o script dentro do Termux, com o jogo aberto em outra janela/aplicativo.

## 4. Uso (linha de comando)

```bash
cd tools/e7-macro

# 1) confere a conexão e a resolução
python3 e7_macro.py dispositivos

# 2) calibra os botões (abra o Epic Seven na tela do estágio)
python3 e7_macro.py calibrar --perfil historia
#    → ele pede um botão por vez; toque nele NA TELA DO CELULAR
#    → para o botão "Auto" você precisa estar DENTRO de uma batalha

# 3) confere o que foi calibrado (e testa um toque)
python3 e7_macro.py testar
python3 e7_macro.py testar --tocar iniciar_batalha

# 4) ensaio sem tocar em nada
python3 e7_macro.py --simular rodar --perfil historia --ciclos 2

# 5) valendo
python3 e7_macro.py rodar --perfil historia --ciclos 20
```

**Parar:** `Ctrl+C` (para no fim do passo atual) ou crie o arquivo de parada —
útil quando o macro roda em outra sessão do Termux:

```bash
touch ~/.e7-macro/PARAR
```

### Opções do `rodar`

| Opção | Para quê |
|---|---|
| `--perfil historia` / `--perfil repetir` | avançar estágios ou farmar o mesmo estágio |
| `--ciclos N` | quantas batalhas no máximo (padrão 10) |
| `--nao-ligar-auto` | não tocar no botão Auto — use se o jogo já mantém o Auto ligado, senão o macro **desligaria** |
| `--simular` | mostra os toques sem executar |
| `--arquivo-parada CAMINHO` | arquivo cuja existência interrompe o laço |
| `--serial XXXX` | escolher o aparelho quando há mais de um |
| `--silencioso` | menos log |
| `--esperar-jogo 10` | conta 10 s antes de começar, para você trocar para o jogo |

### Ajuste fino

O arquivo `~/.e7-macro/config.json` guarda pontos, regiões e:

```json
"opcoes": {
  "ligar_auto": true,
  "jitter": 0.18,              // variação dos tempos (carregamentos não são constantes)
  "espera_max_batalha": 300,   // segundos até a parada de segurança
  "estavel_por": 2.5,          // quanto tempo a tela precisa ficar parada p/ contar como "acabou"
  "intervalo_amostra": 1.0,    // de quanto em quanto tempo tira print
  "pausa_entre_ciclos": 1.5
}
```

Os perfis (`perfis/*.json`) são listas de passos legíveis — dá para reordenar, mudar
esperas ou criar o seu (`--perfil caminho/do/meu.json`). Ações disponíveis:
`tocar`, `tocar_repetido`, `esperar`, `esperar_mudanca`, `esperar_estavel`, `log`.

## 5. Problemas comuns

| Sintoma | Causa provável |
|---|---|
| `adb devices` vazio | depuração USB desligada, cabo só de carga, ou autorização não aceita |
| Toques não acontecem (Xiaomi/POCO) | falta ligar **Depuração USB (Configurações de segurança)** nas Opções do desenvolvedor |
| "não achei o dispositivo de toque" | use `calibrar --manual` e informe as coordenadas (ligue *Opções do desenvolvedor → Local do ponteiro* para lê-las na tela) |
| Para sempre na mesma etapa | o ponto está calibrado no lugar errado: `calibrar --refazer`, ou aumente o tempo no perfil |
| Acaba a energia no meio | o macro para sozinho pela checagem de tela; ele **não** compra energia nem confirma gastos |
| Batalha longa cortada | aumente `espera_max_batalha` |
| Fim de batalha detectado cedo demais | aumente `estavel_por` (ex.: 4.0) ou diminua `tolerancia` no perfil |

## 6. Testes

Há um `adb` falso que responde como um aparelho real, para validar sem celular:

```bash
bash testes/rodar_testes.sh
```

Verifica a conversão das coordenadas do `getevent` (0x800/0x400 em 4095 → 610,678 em
1220×2712), a sequência de toques do ciclo e a parada de segurança quando a tela não muda.

## 7. Sem ADB (alternativa no dedo)

Se não quiser mexer com ADB: um app de auto-clique por acessibilidade (MacroDroid,
Auto Clicker, Tasker + AutoInput) grava a mesma sequência de toques. Fica mais frágil
(tempo fixo, sem detectar fim de batalha, sem parada de segurança) e a exposição em
relação aos Termos de Serviço é exatamente a mesma.
