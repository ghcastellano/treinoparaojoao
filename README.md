# Mundo do João

Aplicativo familiar de brincadeiras educativas, pensado inicialmente para 4 anos e 9 meses. Sete atividades, incluindo soma/subtração e introdução posterior a agrupamentos e divisão igualitária. Não é um teste de QI, instrumento de identificação de altas habilidades ou intervenção clinicamente validada.

## Executar

Node.js 22 ou superior.

```sh
npm ci
cp .env.example .env.local
# Configure DATABASE_URL, SESSION_SECRET e FAMILY_PASSWORD em .env.local.
npm run db:migrate
npm run dev
```

A senha deve ter ao menos 12 caracteres. SESSION_SECRET deve ser aleatório, com pelo menos 32 caracteres. Nunca use as credenciais de QA em produção. O acesso adulto expira em 15 minutos; o acesso infantil no dispositivo, em 30 dias. Para revogar todos os acessos, rotacione SESSION_SECRET. Não há cadastro público.

Para desenvolvimento sem Neon: remova DATABASE_URL e configure ENABLE_LOCAL_STORE=true. Esse modo é explicitamente identificado na interface e bloqueado na Vercel. O histórico fica em `.local-data/`, ignorado pelo git. `/dev-preview` fornece uma sessão de QA exclusivamente em NODE_ENV=development, fora da Vercel e com armazenamento local habilitado. `/dev-qa` contém frames para inspeção responsiva, somente no desenvolvimento. Ambos retornam 404 em produção.

## Arquitetura

- Next.js App Router, React, TypeScript; backend no mesmo projeto.
- Neon via driver HTTP; credenciais apenas no servidor.
- Uma família por implantação; não é uma plataforma multiusuário.
- Uma tabela `family_state`, com JSONB e controle otimista por versão. Cada mutação lê a versão, valida a ação e salva com compare-and-swap, com repetição limitada em caso de concorrência.
- Essa estrutura deliberadamente pequena atende ao escopo familiar. Histórico muito extenso exigirá normalização/paginação; nenhuma estatística é apagada automaticamente.
- Os itens são gerados e corrigidos no servidor. O cliente recebe opções e enunciado, sem gabarito, até concluir a tentativa.
- Envios duplicados de resposta e avanço são idempotentes. Pistas e ajuda de adulto são persistidas antes de aparecerem.
- Cookies HttpOnly, SameSite=Strict, Secure em produção; verificação de origem, limitação de tentativas e autenticação separada para o painel adulto.
- Sem anúncios, analítica de terceiros, microfone, câmera ou chat de IA.

## Progressão

Estágios independentes por atividade. Nos primeiros dois estágios, três respostas independentes em ao menos três variações permitem avançar. Do terceiro em diante, ao menos quatro respostas independentes, três variações e dois dias diferentes são necessários. Duas tentativas com apoio/erro ajustam a dificuldade para baixo; isso não é apresentado à criança como punição. No último estágio, o adulto vê indicação de que o conteúdo atual foi explorado.

Tempo não determina habilidade. A sessão oferece encerramento após cinco atividades ou ao terminar a atividade atual depois do intervalo configurado (3–15 minutos, padrão 8). Essas regras são heurísticas educativas próprias, não normas de desenvolvimento nem critérios diagnósticos.

## Verificações

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

`docs/VERIFICATION.md` diferencia o que foi verificado localmente do que ainda depende de infraestrutura e dispositivos reais.

## Publicar em ghcastellano / Vercel / Neon

1. Criar repositório privado `ghcastellano/treinoparaojoao` e enviar a branch `main`.
2. Criar projeto Neon exclusivo, sem apagar projetos antigos apenas pela data. Preferir banco/branch de preview separado de produção.
3. Configurar `DATABASE_URL` (aplicação), `DATABASE_URL_UNPOOLED` (migração), `SESSION_SECRET`, `FAMILY_PASSWORD` e `HOUSEHOLD_ID=joao` na Vercel. Preview usa banco/segredos separados e HOUSEHOLD_ID=preview.
4. Executar a migração versionada. O script usa a URL direta quando disponível.
5. Importar o repositório na Vercel, framework Next.js, Node 22+, instalar via `npm ci`, compilar via `npm run build`.
6. Atribuir `treinoparaojoao.vercel.app` se disponível e verificar o deploy Ready.
7. Verificar login, início, pista, resposta, retomada em outro aparelho, painel e exportação com Neon real. Confirmar que `/dev-preview` e `/dev-qa` retornam 404.
8. Fazer observação breve de João em tablet/celular: entende a voz? encontra as ações? precisa arrastar? fica frustrado? Interromper quando quiser. Emulação não comprova usabilidade infantil.

## Referências pedagógicas

- IES/WWC, Teaching Math to Young Children (2013): https://ies.ed.gov/ncee/wwc/practiceguide/18
- Skene et al., Child Development (2022), guided play: https://doi.org/10.1111/cdev.13730
- NAGC, Assessments & Tests: https://www.nagc.org/assessments-and-tests
- OMS, atividade física, sono e telas abaixo de 5 anos (2019): https://www.who.int/news/item/24-04-2019-to-grow-up-healthy-children-need-to-sit-less-and-play-more

Brincadeira guiada nos estudos não equivale a uso autônomo deste app. Incluímos atividades presenciais e sugestões para um adulto. A qualidade de resposta em uma atividade educativa não estabelece superdotação.
