/* ============================================================
   TAKEDA | SBAD 2026 — Apresentação executiva
   FONTE ÚNICA DE CONTEÚDO. index.html (HTML/PDF) e build/build-pptx.js
   (PPTX) leem este arquivo. Alterar números e textos SOMENTE aqui.

   Rastreabilidade (coluna "src" / campo "fontes"):
     D1  Proposta de patrocínio CCM Group, 17/04/2026
     D2  Fatura Opus 71166, hospedagem convidados, 29/04/2026
     D3  Fatura Opus 70979, hospedagem staff, 10/04/2026
     D4  Proposta Boutique Gourmet EV 3058, 14/09/2026
     D5  Convite AF 2400 (simpósios 20 e 21/11), C-APROM/BR/VPZ/0565
     I1  Arte Simpósio Satélite 19/11, C-APROM/BR/ENTY/1804
     I3  Arte Simpósio 20/11
     I2  Arte Simpósio 21/11
     I4  Arte Stand Takeda (Aulas Silenciosas), C-APROM/BR/ENTY/1804
     P1  Base de convidados Opus/Takeda (398 registros, agregados em 15/11/2026)

   Status padronizados: "confirmado" | "proposta" | "pendente"
   ============================================================ */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.DECK = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const RED = "#E1242A";

  const meta = {
    titulo: "Takeda na XXV SBAD 2026",
    subtitulo: "Semana Brasileira do Aparelho Digestivo",
    local: "Centro de Eventos do Ceará, Fortaleza",
    datas: "19 a 21 de novembro de 2026",
    versao: "v1.0",
    dataVersao: "15 de novembro de 2026",
    publico: "Apresentação interna, time Takeda",
    dMenos: "D-4",
    rodape: "Takeda | SBAD 2026 · Apresentação interna · Dados consolidados em 15/11/2026",
  };

  /* ---------- Slide 2: resumo executivo ---------- */
  const resumo = {
    kicker: "Resumo executivo",
    titulo: "Em quatro dias, 352 médicos, três simpósios e um estande de 80 m² em Fortaleza",
    numeros: [
      { valor: "352", rotulo: "médicos confirmados", sub: "de 398 convidados", src: "P1" },
      { valor: "3", rotulo: "simpósios ao meio-dia", sub: "500 + 750 + 250 lugares", src: "D1" },
      { valor: "80 m²", rotulo: "estande, espaço 04", sub: "cota Platina", src: "D1" },
      { valor: "2", rotulo: "aulas silenciosas", sub: "no estande, 19 e 20/11", src: "I4" },
      { valor: "1.500", rotulo: "atendimentos de A&B", sub: "500 por dia", src: "D4" },
    ],
    pilares: [
      { nome: "Ciência", texto: "Três simpósios satélites e duas aulas silenciosas cobrem RCU e doença ácido-péptica." },
      { nome: "Estande", texto: "80 m² que funcionam como sala de aula e ponto de hospitalidade durante os três dias." },
      { nome: "Delegação", texto: "352 médicos confirmados, 238 hospedados em três hotéis e 185 bilhetes emitidos." },
    ],
  };

  /* ---------- Slide 3: por quê ---------- */
  const porque = {
    kicker: "Por quê",
    titulo: "A SBAD é o maior palco da gastroenterologia latino-americana",
    numero: "6.000+",
    numeroRotulo: "participantes de todas as regiões do país",
    sociedades: [
      { sigla: "SOBED", nome: "Sociedade Brasileira de Endoscopia Digestiva" },
      { sigla: "FBG", nome: "Federação Brasileira de Gastroenterologia" },
      { sigla: "CBCD", nome: "Colégio Brasileiro de Cirurgia Digestiva" },
    ],
    pontos: [
      "XXV edição, de 19 a 21 de novembro, no Centro de Eventos do Ceará, em Fortaleza.",
      "Reúne gastroenterologia, endoscopia e cirurgia digestiva em um único congresso.",
      "A Takeda participa como Patrocinador Platina. O patrocínio não é exclusivo: há outros copatrocinadores.",
    ],
    src: "D1",
  };

  /* ---------- Slide 4: cota Platina ---------- */
  const cota = {
    kicker: "O quê",
    titulo: "A cota Platina compra palco, presença e visibilidade",
    valor: "R$ 1.035.000",
    valorRotulo: "investimento com desconto, pagamento a partir de maio/2026",
    colunas: [
      {
        nome: "Palco",
        itens: [
          { t: "3 simpósios satélites no intervalo do almoço", s: "confirmado" },
          { t: "Vídeo institucional de 60 s na abertura", s: "pendente", nota: "produção Takeda, layout aprovado pela comissão" },
          { t: "Vídeo de 60 s nos intervalos da programação", s: "pendente", nota: "produção Takeda" },
        ],
      },
      {
        nome: "Presença",
        itens: [
          { t: "Espaço nº 04 com 80 m² e 2 credenciais de expositor", s: "confirmado" },
          { t: "350 inscrições (Platina + 150 extras)", s: "confirmado", nota: "318 já atribuídas a confirmados" },
          { t: "KVA, limpeza, taxas, seguro e montagem à parte", s: "pendente", nota: "custos ainda não informados" },
        ],
      },
      {
        nome: "Visibilidade",
        itens: [
          { t: "4 newsletters e 4 pushs no app do evento", s: "pendente", nota: "conteúdo Takeda, aprovação da comissão científica" },
          { t: "Vídeo e banner no site oficial", s: "pendente" },
          { t: "Logo no backdrop, secretaria, site e sinalização", s: "confirmado", nota: "proporcional à cota" },
        ],
      },
    ],
    src: "D1",
  };

  /* ---------- Slide 5: agenda científica ---------- */
  const agenda = {
    kicker: "Como · Ciência",
    titulo: "Três meios-dias científicos cobrem RCU e doença ácido-péptica",
    dias: [
      {
        data: "19/11", semana: "quinta-feira", frente: "DII · RCU",
        sessoes: [
          { tipo: "Simpósio satélite", hora: "12h30 – 13h30", sala: "Sala 09", capacidade: "500 lugares",
            tema: "Treat-to-target na RCU: do STRIDE-III às novas evidências do VERDICT",
            pessoas: ["Dr. Matheus Azevedo", "Dr. Fernando Jorge", "Mod. Dr. Marcellus Souza"], src: "I1" },
          { tipo: "Aula silenciosa 1", hora: "15h30 – 16h00", sala: "Stand Takeda", capacidade: "",
            tema: "RCU: quando é hora de reavaliar a estratégia terapêutica?",
            pessoas: ["Dr. Felipe Bertollo"], src: "I4" },
        ],
      },
      {
        data: "20/11", semana: "sexta-feira", frente: "Ácido-péptica · DII",
        sessoes: [
          { tipo: "Simpósio satélite", hora: "12h30 – 13h30", sala: "Salas 08 e 09", capacidade: "750 lugares",
            tema: "Vonoprazana: o primeiro P-CAB e a evidência que define a classe",
            pessoas: ["Dr. Gerson Domingues", "Prof. Dr. Luiz J. Abrahão Jr.", "Mod. Dr. João Kleber Gentile"], src: "I3" },
          { tipo: "Aula silenciosa 2", hora: "15h30 – 16h00", sala: "Stand Takeda", capacidade: "",
            tema: "RCU: quando é hora de reavaliar a estratégia terapêutica?",
            pessoas: ["Dra. Graciana Vasconcelos"], src: "I4" },
        ],
      },
      {
        data: "21/11", semana: "sábado", frente: "Ácido-péptica",
        sessoes: [
          { tipo: "Simpósio satélite", hora: "12h30 – 13h30", sala: "Sala 08", capacidade: "250 lugares*",
            tema: "DRGE não erosiva: da caracterização fenotípica à individualização do manejo",
            pessoas: ["Prof. Dr. Luiz J. Abrahão Jr."], src: "I2" },
        ],
      },
    ],
    nota: "* Capacidade de 250 conforme a proposta CCM (17/04). A cotação de lunch box considera 750. A CCM avisou que as capacidades podem mudar: confirmar antes de fechar o lunch box.",
    materiais: "Materiais aprovados: C-APROM/BR/ENTY/1804 (RCU) e C-APROM/BR/VPZ/0565 (vonoprazana, INZELM®).",
  };

  /* ---------- Slide 6: materiais aprovados (artes reais) ---------- */
  const materiais = {
    kicker: "Como · Ciência",
    titulo: "Os convites aprovados já circulam com data, sala e palestrantes",
    itens: [
      { img: "assets/convites/convite-simposio-19-11.jpg", data: "19/11", tipo: "Simpósio satélite", tema: "Treat-to-target na RCU", codigo: "C-APROM/BR/ENTY/1804", src: "I1" },
      { img: "assets/convites/convite-simposio-20-11.jpg", data: "20/11", tipo: "Simpósio", tema: "Vonoprazana, o primeiro P-CAB", codigo: "C-APROM/BR/VPZ/0565", src: "I3" },
      { img: "assets/convites/convite-simposio-21-11.jpg", data: "21/11", tipo: "Simpósio", tema: "DRGE não erosiva", codigo: "C-APROM/BR/VPZ/0565", src: "I2" },
      { img: "assets/convites/convite-stand-aulas.jpg", data: "19 e 20/11", tipo: "Stand Takeda", tema: "Aulas silenciosas 1 e 2", codigo: "C-APROM/BR/ENTY/1804", src: "I4" },
    ],
    nota: "Artes oficiais fornecidas pelo time. Material destinado exclusivamente ao público médico; reproduzido aqui apenas para referência interna.",
  };

  /* ---------- Slide 7: estande ---------- */
  const estande = {
    kicker: "Como · Estande",
    titulo: "O estande funciona como sala de aula e ponto de hospitalidade",
    specs: [
      { k: "Espaço", v: "nº 04" },
      { k: "Área", v: "80 m²" },
      { k: "Credenciais", v: "2 de expositor" },
      { k: "Equipe A&B", v: "5 atendentes" },
      { k: "Público/dia", v: "500 pessoas" },
    ],
    periodos: ["Manhã", "Intervalo da manhã", "Tarde", "Intervalo da tarde", "15h30"],
    dias: [
      { data: "19/11", celulas: ["Cereal bar no balcão", "Tapiocaria no food cart", "Milkshake no balcão", "Bar de açaí no food cart", "Aula silenciosa 1"] },
      { data: "20/11", celulas: ["Cereal bar no balcão", "Pão de queijo de tapioca", "Sem milkshake", "DinDinLicia (geladinho)", "Aula silenciosa 2"] },
      { data: "21/11", celulas: ["Cereal bar no balcão", "Waffle bar", "Milkshake no balcão", "Sem serviço", "—"] },
    ],
    fixo: "Carta de café o dia todo: espresso, cappuccino, latte, chocolate quente. Água e suco integral em suqueiras.",
    render: "Planta, render e montadora do estande não constam nos documentos recebidos.",
    infra: [
      "Balcão com recuo de cerca de 3,50 m",
      "3 tomadas 220 V no balcão, 1 no carrinho, 3 no depósito",
      "Geladeira duplex fornecida pela montadora",
      "Depósito amplo, com prateleiras, exclusivo do buffet",
      "KVA: máquina de café 3,0 · fogão 1,8 · forno 1,8 · grill 1,8",
    ],
    src: "D1, D4, I4",
  };

  /* ---------- Slide 7: A&B ---------- */
  const aeb = {
    kicker: "Como · Hospitalidade",
    titulo: "1.500 atendimentos em três dias, com cardápio que muda a cada dia",
    status: "proposta",
    statusTexto: "Proposta Boutique Gourmet EV 3058 de 14/09, validade 25/09. Aprovação e PO não constam nos documentos.",
    volumes: [
      { valor: "500", rotulo: "pessoas por dia" },
      { valor: "1.500", rotulo: "doses de café" },
      { valor: "200 L", rotulo: "água" },
      { valor: "100 L", rotulo: "suco integral" },
      { valor: "R$ 133.278", rotulo: "com desconto (R$ 140.654 cheio)" },
    ],
    linhas: [
      { periodo: "Manhã · balcão", publico: "100/dia", d19: "Cereal bar com iogurtes, leite vegetal, caldas e complementos", d20: "Cereal bar", d21: "Cereal bar" },
      { periodo: "Intervalo da manhã · food cart", publico: "200/dia", d19: "Tapiocas na hora: queijo coalho com melaço, peito de peru, coco", d20: "Pão de queijo de tapioca com requeijão de ervas, gorgonzola, goiabada, doce de leite", d21: "Waffle bar: cogumelos, emmental com parma, stracciatella com tomate confit" },
      { periodo: "Tarde · balcão", publico: "150/dia", d19: "Milkshakes batidos na hora", d20: "Sem serviço", d21: "Milkshakes batidos na hora" },
      { periodo: "Intervalo da tarde · food cart", publico: "200/dia", d19: "Bar de açaí com granola, mel, frutas, castanhas", d20: "DinDinLicia: geladinho gourmet em 4 sabores", d21: "Sem serviço" },
    ],
    condicoes: "Pagamento 90 dias após o evento. Acréscimo de 5% se houver retenção de ISS. PO na aprovação. Excedente atendido até 10% e cobrado integralmente.",
    src: "D4",
  };

  /* ---------- Slide 8: delegação ---------- */
  const delegacao = {
    kicker: "Como · Delegação",
    titulo: "352 confirmados de 398 convidados, 151 em pacote completo",
    funil: [
      { rotulo: "Convidados", valor: 398 },
      { rotulo: "Confirmados", valor: 352 },
      { rotulo: "Com inscrição", valor: 318 },
      { rotulo: "Com hotel", valor: 238 },
      { rotulo: "Com aéreo", valor: 185 },
    ],
    recusas: { recusados: 24, declinados: 22, aguardando: 1 },
    pacotes: [
      { rotulo: "Aéreo + hotel + inscrição", valor: 151 },
      { rotulo: "Somente inscrição", valor: 86 },
      { rotulo: "Hotel + inscrição", valor: 65 },
      { rotulo: "Aéreo + inscrição", valor: 13 },
      { rotulo: "Somente hotel", valor: 12 },
      { rotulo: "Somente aéreo", valor: 6 },
      { rotulo: "Palestrantes (hotel, PAP, transfer)", valor: 6 },
      { rotulo: "Staff (Opus e Casa da Vila)", valor: 5 },
      { rotulo: "Aéreo + hotel", valor: 4 },
      { rotulo: "Pacotes com PAP", valor: 4 },
    ],
    especialidades: [
      { rotulo: "Gastroenterologia", valor: 280 },
      { rotulo: "Cirurgia do aparelho digestivo", valor: 35 },
      { rotulo: "Endoscopia", valor: 15 },
      { rotulo: "Outras / não informada", valor: 22 },
    ],
    notas: ["Cadastros de 08/07 a 11/11; última confirmação em 12/11.", "Taxa de confirmação de 88%.", "350 inscrições contratadas: 318 atribuídas, 32 sem registro na base."],
    src: "P1",
  };

  /* ---------- Slide 9: regionais e origens ---------- */
  const origem = {
    kicker: "Como · Delegação",
    titulo: "A delegação vem de 22 estados e de todas as regionais",
    regionais: [
      { rotulo: "RV100", valor: 89 },
      { rotulo: "RV600", valor: 57 },
      { rotulo: "RV200", valor: 50 },
      { rotulo: "RV500", valor: 48 },
      { rotulo: "RV300", valor: 47 },
      { rotulo: "RV400", valor: 41 },
      { rotulo: "RV800", valor: 7 },
      { rotulo: "RV700", valor: 3 },
      { rotulo: "Sem regional", valor: 10 },
    ],
    estados: [
      { uf: "SP", valor: 98 }, { uf: "RJ", valor: 40 }, { uf: "MG", valor: 29 }, { uf: "BA", valor: 26 },
      { uf: "CE", valor: 25 }, { uf: "PR", valor: 20 }, { uf: "PE", valor: 19 }, { uf: "DF", valor: 14 },
      { uf: "SC", valor: 12 }, { uf: "GO", valor: 11 }, { uf: "ES", valor: 11 }, { uf: "RS", valor: 8 },
      { uf: "MS", valor: 5 }, { uf: "MA", valor: 5 }, { uf: "RN", valor: 4 }, { uf: "PI", valor: 4 },
      { uf: "MT", valor: 4 }, { uf: "PB", valor: 3 }, { uf: "AL", valor: 3 }, { uf: "AM", valor: 3 },
      { uf: "SE", valor: 2 }, { uf: "PA", valor: 1 },
    ],
    estadosNota: "5 confirmados sem UF informada.",
    origensAereas: [
      { cidade: "São Paulo", valor: 63 }, { cidade: "Rio de Janeiro", valor: 30 }, { cidade: "Brasília", valor: 10 },
      { cidade: "Florianópolis", valor: 9 }, { cidade: "Recife", valor: 7 }, { cidade: "Porto Alegre", valor: 7 },
      { cidade: "Belo Horizonte", valor: 7 }, { cidade: "Goiânia", valor: 6 }, { cidade: "Salvador", valor: 5 },
    ],
    src: "P1",
  };

  /* ---------- Slide 10: logística ---------- */
  const logistica = {
    kicker: "Como · Logística",
    titulo: "185 bilhetes e 238 hóspedes concentrados entre 18 e 22 de novembro",
    ida: [
      { data: "14/11", valor: 1 }, { data: "17/11", valor: 4 }, { data: "18/11", valor: 174 }, { data: "19/11", valor: 5 }, { data: "22/11", valor: 1 },
    ],
    volta: [
      { data: "18/11", valor: 1 }, { data: "20/11", valor: 1 }, { data: "21/11", valor: 153 }, { data: "22/11", valor: 27 },
    ],
    aereo: { bilhetes: 185, total: "R$ 646.335", tarifa: "R$ 571.259", taxas: "R$ 19.001", fee: "R$ 56.075", cias: "LATAM, GOL e Azul, classe econômica" },
    hoteis: [
      { nome: "Oásis Atlântico", hospedes: 107, single: 83, duplo: 24, fatura: "R$ 180.180", extra: "+ R$ 25.110 staff" },
      { nome: "Comfort Fortaleza", hospedes: 71, single: 71, duplo: 0, fatura: "R$ 195.840", extra: "" },
      { nome: "Vila Galé Fortaleza", hospedes: 60, single: 60, duplo: 0, fatura: "R$ 127.410", extra: "" },
    ],
    marcos: [
      "Hospedagem faturada pela Opus em abril (venc. 11 e 18/05).",
      "206 hospedagens associadas em 22/09; demais entre 08/10 e 05/11.",
      "165 vouchers confirmados, quase todos em 04/11.",
      "Palestrantes com transfer interno; 2 com diária extra em 22/11 aprovada.",
    ],
    src: "P1, D2, D3",
  };

  /* ---------- Slide 11: cronologia ---------- */
  const cronologia = {
    kicker: "Quando",
    titulo: "Sete meses de preparação convergem para 72 horas de operação",
    macro: [
      { data: "10/04", texto: "Hospedagem de staff faturada (PO 8002125108)", src: "D3" },
      { data: "17/04", texto: "Proposta de patrocínio Platina + 150 inscrições", src: "D1" },
      { data: "29/04", texto: "Bloqueio de hospedagem em 3 hotéis faturado", src: "D2" },
      { data: "08/07", texto: "Início dos cadastros de convidados", src: "P1" },
      { data: "14/09", texto: "Proposta de A&B do estande", src: "D4" },
      { data: "22/09", texto: "206 hospedagens associadas", src: "P1" },
      { data: "04/11", texto: "Vouchers de hotel confirmados", src: "P1" },
      { data: "12/11", texto: "Última confirmação de convidado", src: "P1" },
      { data: "18/11", texto: "Chegada: 174 embarques para Fortaleza", src: "P1" },
      { data: "19–21/11", texto: "Congresso, 08h30 às 18h00", src: "D1" },
      { data: "21–22/11", texto: "Retorno: 153 e 27 embarques", src: "P1" },
    ],
    hoje: "15/11",
    diaTipico: [
      { hora: "08h30", texto: "Abertura do pavilhão; café e cereal bar no balcão" },
      { hora: "Manhã", texto: "Food cart do dia (tapioca, pão de queijo, waffle)" },
      { hora: "12h30", texto: "Simpósio satélite, 60 min, com lunch box" },
      { hora: "Tarde", texto: "Milkshake e food cart do dia (açaí, geladinho)" },
      { hora: "15h30", texto: "Aula silenciosa no estande (19 e 20/11)" },
      { hora: "18h00", texto: "Encerramento do dia" },
    ],
    pendente: "Montagem e desmontagem: cronograma e horários de acesso não constam nos documentos.",
  };

  /* ---------- Slide 12: responsabilidades ---------- */
  const quem = {
    kicker: "Quem",
    titulo: "Cada frente tem um responsável nomeado, e duas ainda não têm",
    frentes: [
      { frente: "Coordenação geral e orçamento", resp: "Takeda Eventos", detalhe: "Felipe Martignon, contato em todas as propostas", s: "confirmado" },
      { frente: "Patrocínio, salas, inscrições e visibilidade", resp: "CCM Group", detalhe: "Dayse Freitas, Comercial", s: "confirmado" },
      { frente: "Aéreo, hospedagem, vouchers e RSVP", resp: "Opus Viagens e Eventos", detalhe: "3 staffs onsite", s: "confirmado" },
      { frente: "A&B do estande e lunch box", resp: "Boutique Gourmet", detalhe: "5 atendentes; nomes para credencial 7 dias antes", s: "proposta" },
      { frente: "Conteúdo científico e materiais aprovados", resp: "Takeda Marketing e Médico", detalhe: "Códigos C-APROM ENTY/1804 e VPZ/0565", s: "confirmado" },
      { frente: "Relacionamento com convidados", resp: "GRs e consultores", detalhe: "Regionais RV100 a RV800", s: "confirmado" },
      { frente: "Montagem, KVA, geladeira e depósito", resp: "Montadora", detalhe: "Não identificada nos documentos", s: "pendente" },
      { frente: "Apoio onsite", resp: "Casa da Vila", detalhe: "2 staffs na base; escopo não documentado", s: "pendente" },
    ],
    src: "D1–D4, P1",
  };

  /* ---------- Slide 13: investimento ---------- */
  const investimento = {
    kicker: "Investimento",
    titulo: "O investimento documentado soma R$ 2,34 milhões, com o lunch box ainda em aberto",
    linhas: [
      { rotulo: "Patrocínio Platina + 150 inscrições", valor: 1035000, s: "proposta", nota: "CCM, 17/04. Contratação evidenciada pela execução", src: "D1" },
      { rotulo: "Aéreo emitido (185 bilhetes, com fee)", valor: 646335, s: "confirmado", nota: "Soma da base Opus", src: "P1" },
      { rotulo: "Hospedagem de convidados, 3 hotéis", valor: 503430, s: "confirmado", nota: "Fatura 71166, venc. 18/05", src: "D2" },
      { rotulo: "A&B do estande", valor: 133278, s: "proposta", nota: "Boutique Gourmet, validade 25/09", src: "D4" },
      { rotulo: "Hospedagem de staff", valor: 25110, s: "confirmado", nota: "Fatura 70979, PO 8002125108", src: "D3" },
    ],
    total: 2343153,
    totalTexto: "R$ 2.343.153",
    lunchbox: { min: 314092, max: 532969, texto: "R$ 314 a 533 mil", nota: "3 simpósios em 500 / 750 / 750 unidades, da opção Pizza Hut à Outback" },
    naoDocumentado: ["KVA, limpeza, taxas e seguro do estande", "Montagem e cenografia", "Palestrantes e cabine de tradução", "Transfers e produção de vídeo"],
    src: "D1–D4, P1",
  };

  /* ---------- Slide 14: decisões ---------- */
  const decisoes = {
    kicker: "O que exige atenção",
    titulo: "Cinco decisões fecham o plano antes de 19 de novembro",
    itens: [
      { n: "01", titulo: "Escolher o lunch box dos três simpósios", texto: "Opção e volumes (500 / 750 / 750 ou 250 no sábado). O buffet nega alterações a menos de 72 h: o prazo real para o dia 19 é 16/11.", dono: "Takeda Eventos + Boutique Gourmet", prazo: "16/11" },
      { n: "02", titulo: "Confirmar a capacidade do simpósio de 21/11", texto: "CCM contratou 250 lugares na Sala 08; a cotação de lunch box considera 750.", dono: "CCM Group", prazo: "16/11" },
      { n: "03", titulo: "Garantir a infraestrutura do estande", texto: "KVA (8,4 kVA só no A&B), tomadas, geladeira duplex, depósito exclusivo e balcão de 3,50 m dependem da montadora.", dono: "Montadora (a definir)", prazo: "montagem" },
      { n: "04", titulo: "Regularizar a proposta de A&B", texto: "Validade vencida em 25/09, PO exigida na aprovação e lista de nomes da equipe para credenciais.", dono: "Takeda Eventos", prazo: "imediato" },
      { n: "05", titulo: "Entregar os ativos de visibilidade", texto: "Vídeo de 60 s, 4 newsletters e 4 pushs dependem de produção Takeda e aprovação da comissão.", dono: "Marketing + CCM", prazo: "antes da abertura" },
    ],
    secundarios: ["1 convidado aguardando aprovação do cliente", "30 cadastros sem aceite LGPD registrado", "24 quartos duplos no Oásis a conferir na rooming list"],
  };

  /* ---------- Apêndice ---------- */
  const apendice = {
    cardapio: {
      titulo: "Apêndice A1 · Cardápio completo do estande por dia",
      colunas: ["Serviço", "Público", "19/11 quinta", "20/11 sexta", "21/11 sábado"],
      linhas: [
        ["Carta de café (balcão)", "1.500 doses no total", "Espresso, cappuccino cremoso e italiano, carioquinha, chocolate quente, latte e macchiato", "Idem", "Idem"],
        ["Acompanhamentos do café", "alternados", "Amanteigados, petit four salgado, grissini de parmesão, dadinhos de cocada, mexedor de biscoito", "Idem", "Idem"],
        ["Bebidas frias", "200 L água · 100 L suco", "Água natural e suco integral em suqueiras", "Idem", "Idem"],
        ["Cereal bar (manhã, balcão)", "100 pessoas/dia", "Iogurtes e leite vegetal; caldas de frutas vermelhas, chocolate e mel; frutas secas, granola, aveia, chia e linhaça", "Idem", "Idem"],
        ["Food cart da manhã", "200 pessoas/dia", "Tapiocaria: queijo coalho com melaço, peito de peru com requeijão, coco com leite condensado", "Pão de queijo de tapioca: requeijão de ervas, manteiga de gorgonzola, goiabada, doce de leite", "Waffle bar: cogumelos com tomilho, creme de emmental com parma, stracciatella com tomate confit"],
        ["Milkshake (tarde, balcão)", "150 doses/dia", "Chocolate, flocos, morango", "Sem serviço", "Chocolate, flocos, morango"],
        ["Food cart da tarde", "200 pessoas/dia", "Bar de açaí: granola, mel, fruta, leite condensado, leite em pó, xerém de castanhas", "DinDinLicia: açaí com ninho, iogurte com morango, mousse de cajá, trufa", "Sem serviço"],
      ],
      src: "D4",
    },
    lunchbox: {
      titulo: "Apêndice A2 · Cotações de lunch box para os simpósios",
      colunas: ["Opção", "Composição", "500 unidades", "750 unidades"],
      linhas: [
        ["Pizza Hut", "450 pepperoni + 50 marguerita, mini alfajor, refrigerante, kit higiene", "R$ 81.710", "R$ 116.191"],
        ["Marmita Boutique Gourmet", "1 prato quente à escolha, sobremesa no pote, suco ou refrigerante", "R$ 89.915", "R$ 122.855"],
        ["Johnny Rockets", "450 Original + 50 Streamliner (veg.), mini alfajor, refrigerante", "R$ 103.460", "R$ 144.638"],
        ["Outback (brownie do Luiz)", "450 Outback Burger + 50 Aussie Plant (veg.), brownie, refrigerante", "R$ 123.630", "R$ 173.762"],
        ["Coco Bambu", "450 carne de sol + 50 lasanha de berinjela, mini cocada, refrigerante", "R$ 135.825", "R$ 190.535"],
        ["Outback (brownie Outback)", "Idem, com brownie Outback", "R$ 140.071", "R$ 196.449"],
      ],
      nota: "Simpósios cotados para 500 (19/11), 750 (20/11) e 750 (21/11) pessoas. Itens terceirizados sem garantia de exclusividade; disponibilidade confirmada após aprovação. Logística e atendentes de entrega inclusos.",
      src: "D4",
    },
    condicoes: {
      titulo: "Apêndice A3 · Condições contratuais da proposta de A&B",
      blocos: [
        { t: "Confirmação", itens: ["Contrato assinado ou e-mail de confirmação com acordo comercial prévio.", "Alterações após aprovação sujeitas ao aceite do buffet.", "Pedidos com menos de 72 h são negados automaticamente."] },
        { t: "Pagamento", itens: ["90 dias após o evento.", "Acréscimo de 5% em caso de retenção de ISS.", "PO enviada no momento da aprovação."] },
        { t: "Excedente e perdas", itens: ["Atende até 10% acima do contratado, cobrado integralmente em 48 h.", "Acima de 10%: multa de 50% por convidado extra.", "Quebras e perdas apuradas na recontagem ao final."] },
        { t: "Cancelamento (fora de SP)", itens: ["Mais de 30 dias: 20% do valor.", "30 a 21 dias: 50%.", "20 a 10 dias: 75%.", "Menos de 10 dias: 100%."] },
        { t: "Equipe e credenciais", itens: ["5 atendentes, 8 a 9 h/dia com 1 h de almoço; até 2 h extras.", "Nomes enviados 7 dias antes; credenciais e taxas por conta da contratante.", "Alimentação da equipe por conta do buffet."] },
      ],
      src: "D4",
    },
    infra: {
      titulo: "Apêndice A4 · Infraestrutura exigida no estande e salas",
      blocos: [
        { t: "Estande (A&B)", itens: ["Balcão com recuo de cerca de 3,50 m", "3 tomadas 220 V no balcão", "1 tomada no ponto do carrinho", "3 tomadas 220 V no depósito", "Geladeira duplex (montadora)", "Depósito amplo com prateleiras, exclusivo do buffet"] },
        { t: "Carga elétrica a solicitar à montadora", itens: ["Máquina de café + moinho: 3,00 kVA", "Fogão elétrico: 1,80 kVA", "Forno elétrico: 1,80 kVA", "Grill: 1,80 kVA", "Geladeira duplex: a cargo da montadora"] },
        { t: "Patrocínio (CCM)", itens: ["Espaço nº 04, 80 m², 2 credenciais de expositor", "KVA, limpeza e taxas da prefeitura cobrados à parte", "Seguro e montagem não inclusos", "Palestrante, cabine de tradução e lunch box por conta do patrocinador"] },
        { t: "Salas dos simpósios", itens: ["19/11: Sala 09, 500 pessoas", "20/11: Salas 08 e 09, 750 pessoas", "21/11: Sala 08, 250 pessoas (pode mudar)"] },
      ],
      src: "D1, D4",
    },
    fontes: {
      titulo: "Apêndice A5 · Fontes documentais e critérios",
      colunas: ["Código", "Documento", "Emissor", "Data", "Natureza"],
      linhas: [
        ["D1", "Proposta SBAD 2026", "CCM Group", "17/04/2026", "Proposta de patrocínio"],
        ["D2", "Fatura 71166, hospedagens", "Opus Viagens", "29/04/2026", "Documento fiscal"],
        ["D3", "Fatura 70979, hospedagens staff", "Opus Viagens", "10/04/2026", "Documento fiscal"],
        ["D4", "EV 3058, A&B e lunch box", "Boutique Gourmet", "14/09/2026", "Proposta comercial"],
        ["D5", "AF 2400, convite simpósios 20 e 21/11", "Takeda", "nov/2026", "Material aprovado"],
        ["I1–I4", "Artes dos simpósios e do estande", "Takeda", "nov/2026", "Material aprovado"],
        ["P1", "Base de convidados (398 registros)", "Opus / Takeda", "08/07 a 12/11/2026", "Operacional, uso agregado"],
      ],
      criterios: ["Confirmado: fatura, material aprovado ou registro na base operacional.", "Proposta: documento comercial sem aprovação registrada.", "Pendente: informação ausente dos documentos ou dependente de decisão.", "Nenhum dado pessoal da base de convidados foi reproduzido."],
    },
  };

  return { RED, meta, resumo, porque, cota, agenda, materiais, estande, aeb, delegacao, origem, logistica, cronologia, quem, investimento, decisoes, apendice };
});
