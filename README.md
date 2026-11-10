# Projeto 01: Estúdio de Linguagens Regulares (LFC / UFPB)

Aplicação web interativa desenvolvida para a Unidade 1 da disciplina **Linguagens Formais e Computabilidade** (Prof. Andrei Formiga, UFPB), cobrindo os conceitos e algoritmos de **Autômatos Finitos (Determinísticos e Não-Determinísticos)** e **Expressões Regulares**.

---

## Funcionalidades Implementadas (Mapeamento com o PDF)

1. **Simuladores de AFD e AFN (`src/core/simulator.ts`, Seção 2.1):**
   - **Simulador de AFD:** mantém e exibe explicitamente (1) o estado atual do autômato e (2) os símbolos restantes da cadeia de entrada, avançando símbolo a símbolo pela função de transição $\delta(q, a)$.
   - **Simulador de AFN / AFN-$\varepsilon$:** mantém a lista explícita de **cópias paralelas do autômato** em execução (incluindo o fecho-$\varepsilon$), mostrando a criação e o histórico de cada cópia a cada símbolo lido.
   - **Importação e Exportação JSON:** compatível diretamente com o formato especificado na página 3 do PDF:
     ```json
     {
       "q0" : { "a" : "q1", "b" : "q0" },
       "q1" : { "a" : "q0", "b" : "q1" }
     }
     ```
     Esse formato não diz qual estado é inicial nem quais são de aceitação. Na importação, o primeiro estado vira o inicial e o último vira o de aceitação; dá para mudar no editor, ou declarar no próprio JSON com os campos opcionais `"_initial": "q0"` e `"_accepting": ["q1"]`. Para AFN, o destino pode ser uma lista (`"a": ["q0", "q1"]`) e `"ε"` é aceito como símbolo.

2. **Editor Gráfico para Autômatos (`src/components/AutomatonCanvas.tsx` & `src/core/svgExport.ts`, Seção 2.2):**
   - Criação visual de estados, adição de transições (incluindo movimentos vazios $\varepsilon$), marcação de estado inicial e estados de aceitação, e reposicionamento por arrasto ou *Auto-Layout*.
   - Exportação em **JSON** (formato do PDF) e **SVG vetorial** (pronto para uso em documentos e relatórios).

3. **Conversão de AFN para AFD (`src/core/nfaToDfa.ts`, Seção 2.3):**
   - Dividida nos dois algoritmos clássicos:
     1. **Remoção de movimentos vazios ($\varepsilon$-transições):** calcula $\varepsilon\text{-fecho}(q)$ para cada estado e gera um AFN equivalente sem $\varepsilon$.
     2. **Construção de Subconjuntos (Rabin-Scott):** converte o AFN sem $\varepsilon$ para um AFD equivalente, exibindo a tabela de macro-estados e verificando a equivalência sobre uma bateria de cadeias de teste.

4. **Minimização de AFDs (`src/core/minimizeDfa.ts`, Seção 2.4):**
   - Remove estados inalcançáveis via busca em largura (BFS).
   - Executa o refinamento sucessivo de partições ($P_0, P_1, \dots$) e gera a tabela de pares distinguíveis (Myhill-Nerode), exibindo o AFD original e o AFD minimizado lado a lado.

5. **Conversão de Expressões Regulares para AFN (`src/core/regexToNfa.ts`, Seção 2.5):**
   - Parser com inserção explícita de concatenação (`.`), conversão para notação pós-fixa (*Shunting-Yard*) e árvore sintática (AST).
   - **Construção de Thompson** passo a passo ($\text{ER} \to \text{AFN-}\varepsilon$).

6. **Conversão de AFN para Expressão Regular (`src/core/nfaToRegex.ts`, Seção 2.6):**
   - Algoritmo de **Eliminação de Estados** em AFN Generalizado (GNFA), exibindo a fórmula $R'_{ij} = R_{ij} \cup R_{ik}(R_{kk})^*R_{kj}$ a cada estado eliminado.

7. **Implementação de Expressões Regulares (`src/core/regexEngine.ts`, Seção 2.7):**
   - Implementa e compara na mesma tela as **duas técnicas** descritas na página 5 do PDF:
     1. **Sequência de conversões:** $\text{ER} \to \text{AFN-}\varepsilon \to \text{AFN} \to \text{AFD} \to \text{AFD Minimizado}$ + simulação direta em tempo $O(|w|)$ sem backtracking.
     2. **Interpretação direta da ER com Backtracking:** registra cada tentativa e cada recuo (*backtrack*) realizado na árvore da expressão.
   - Inclui ferramenta de **busca de padrões em texto livre** com destaque visual dos casamentos.

---

## Como Executar e Testar

```bash
# Instalar dependências
bun install

# Rodar a suíte de testes automatizados
bun test

# Iniciar o servidor de desenvolvimento web
bun run dev
```

## Uso de Ferramentas Baseadas em LLMs (Seção 1.1)

Todo o código deste repositório (algoritmos em `src/core/`, interface em `src/components/` e
testes) foi gerado com um agente de codificação baseado em LLM, a partir de pedidos e revisões do
grupo. O papel do grupo foi escolher o escopo entre as sugestões do enunciado, conferir os
resultados e estudar os algoritmos para explicá-los.

A verificação não depende só de exemplos escolhidos à mão: `src/core/equivalence.test.ts` compara
cinco caminhos (AFN de Thompson, AFD por subconjuntos, AFD minimizado, interpretador com
backtracking e a ER obtida de volta por eliminação de estados) contra o `RegExp` nativo do
JavaScript, em todas as cadeias sobre {a, b} até tamanho 6, para 13 ERs fixas e 200 aleatórias.

O roteiro do vídeo não foi gerado por LLM (recomendação da Seção 1.1).

