# Prompts para Copilot Premium / Claude no Excel — NEC Eventos
**Arquivo-alvo:** NEC_Eventos_Reestruturado_v4.xlsx
**Como usar:** copie cada prompt e cole no Copilot (painel lateral do Excel) ou no add-in do Claude no Excel, com o arquivo aberto.

> Copilot é melhor para **ações** (Tabelas Dinâmicas, gráficos, preencher células).
> Claude no Excel é melhor para **raciocínio** (auditoria, fórmulas, explicações).
> Os prompts abaixo funcionam nos dois.

---

## 1. ⭐ PRIORIDADE — Preencher a coluna Prazo automaticamente

A coluna Prazo (F) de DB_ATIVIDADES está vazia e agora é um campo de data.
Deixe a IA calcular os prazos retrocedendo a partir da data do evento.

> ✅ JÁ APLICADO no arquivo atual: 78 prazos preenchidos automaticamente
> (perfil "Mais folga"). Use este prompt apenas para REPROCESSAR ou para
> novos eventos adicionados depois.

```
Na aba DB_ATIVIDADES, preencha a coluna "Prazo" (coluna F) de cada atividade.
Para cada linha, encontre a "Data Início" do evento correspondente na aba
DB_EVENTOS (correspondência pelo nome do Evento). Calcule o prazo conforme a
Etapa (negativo = antes do evento, positivo = depois):
- Planejamento: 90 dias antes
- VEEVA: 75 dias antes
- Sociedade / Contrapartidas / Cota / Patrocínio: 60 dias antes
- Agência / Ag. Logística / Produção / RSVP: 45 dias antes
- Simpósio / Palestrantes: 30 dias antes
- Alinhamentos Finais: 14 dias antes
- Stand / Buffet / Staff / Credenciais / Logomarcas: 21 dias antes
- Pós-Evento: 15 dias DEPOIS do evento
Não altere linhas cujo Status seja "CONCLUÍDO". Preencha apenas onde o Prazo
estiver vazio. Use o formato de data DD/MM/AAAA.
```

> Depois de preencher, a formatação condicional já existente acende
> automaticamente: vermelho (vencido), laranja (7 dias), amarelo (pendente).

---

## 2. Relatório executivo semanal (alternativa nativa ao Office Script)

```
Analise as abas DB_EVENTOS, DB_ATIVIDADES e DB_FINANCEIRO e gere um resumo
executivo em tabelas com:
1) Eventos com Status "a Realizar" nos próximos 30 dias (nome, BU, cidade, data)
2) Atividades atrasadas: Status diferente de "CONCLUÍDO" e Prazo anterior a hoje
3) Pagamentos com "Status Pag." igual a "Pendente" ou "A preencher" (evento,
   fornecedor, orçamento previsto)
Inclua no topo os totais de cada categoria.
```

---

## 3. Auditoria de consistência entre as tabelas

```
Verifique inconsistências de dados nas abas:
1) Atividades em DB_ATIVIDADES cujo "Evento" não existe na coluna "Evento" de
   DB_EVENTOS
2) Lançamentos em DB_FINANCEIRO cujo "Evento" não existe em DB_EVENTOS
3) Eventos em DB_EVENTOS que não têm nenhuma atividade em DB_ATIVIDADES
4) Eventos com a coluna "Solicitante" vazia
Liste cada problema encontrado com a linha e o valor.
```

---

## 4. Tabelas Dinâmicas e gráficos para o DASHBOARD (Copilot)

```
A partir da tabela TblEventos, crie uma Tabela Dinâmica e um gráfico de colunas
mostrando a contagem de eventos por "BU" e por "Trimestre". Coloque em uma nova
aba chamada PIVOT_EVENTOS.
```

```
A partir da tabela TblFinanceiro, crie uma Tabela Dinâmica somando "Orç. Previsto"
e "Total Evento" por "Evento", e um gráfico de barras comparando previsto x
realizado. Nova aba: PIVOT_FINANCEIRO.
```

---

## 5. Perguntas ad-hoc (forte no Copilot)

```
Qual o orçamento total previsto por BU? Mostre em tabela ordenada do maior
para o menor.
```

```
Quantos eventos cada Solicitante tem com Status "a Realizar"? E qual cidade
concentra mais eventos?
```

```
Some o "Total Evento" de todos os pagamentos ainda com Status Pag. "Pendente".
```

---

## 6. Gerar fórmulas (forte no Claude no Excel)

```
Escreva uma fórmula para a aba ⚡ ALERTAS que conte quantas atividades em
TblAtividades estão atrasadas: Status diferente de "CONCLUÍDO" E coluna Prazo
preenchida E Prazo anterior a hoje. Explique a fórmula.
```

---

## Onde a IA NÃO ajuda (precisa de você / fonte real)

- **Inventar dados reais:** CNPJ e e-mails em DB_FORNECEDORES, números de EM,
  POs. A IA não deve preencher isso — só você tem a fonte correta. Peça para
  ela apenas *apontar* o que está como "A preencher".
- **Criar/rodar os fluxos Power Automate:** precisa ser feito no portal
  make.powerautomate.com (ver pa_flows_nec.md) e depende da liberação de rede
  pela TI. Copilot/Claude no Excel não criam fluxos.

---

## Fluxo de trabalho sugerido

1. Rode o **prompt 1** (preencher Prazo) → a base de alertas fica funcional.
2. Rode o **prompt 3** (auditoria) → corrija as inconsistências apontadas.
3. Use o **prompt 2** toda segunda-feira → relatório da semana.
4. Use os **prompts 4** uma vez → dashboards visuais prontos.
5. Prompts 5 e 6 conforme a necessidade do dia a dia.
