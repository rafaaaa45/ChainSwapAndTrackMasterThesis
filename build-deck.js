/* ChainGuard - Master's thesis style deck generator */
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const FA = require("react-icons/fa");

// ---- palette -------------------------------------------------------------
const NAVY = "0F1B3C";       // dominant dark
const NAVY2 = "16245A";      // panel navy
const TEAL = "12B5A5";       // accent
const TEAL_D = "0C8C80";     // deeper teal
const ICE = "CFE3E0";        // soft light
const SLATE = "5B6678";      // muted text
const INK = "1C2535";        // body text on light
const PAPER = "FFFFFF";      // content bg
const MIST = "F2F5F8";       // card tint
const AMBER = "E0A33B";      // secondary accent (warnings)

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.3 x 7.5
pres.author = "ChainGuard";
pres.title = "ChainGuard - Validacao de transacoes cross-chain";

const W = 13.3, H = 7.5;

// ---- icon helper ---------------------------------------------------------
async function icon(Comp, color = "#FFFFFF", size = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(
    React.createElement(Comp, { color, size: String(size) })
  );
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + png.toString("base64");
}

function hexHash(h) { return "#" + h; }

// ---- reusable bits -------------------------------------------------------
function kicker(slide, text, color = TEAL, x = 0.9, y = 0.62) {
  slide.addText(text.toUpperCase(), {
    x, y, w: 9, h: 0.3, margin: 0,
    fontFace: "Arial", fontSize: 12, bold: true, color, charSpacing: 3,
  });
}
function title(slide, text, color = INK, x = 0.9, y = 0.95, w = 11.5) {
  slide.addText(text, {
    x, y, w, h: 0.9, margin: 0,
    fontFace: "Cambria", fontSize: 32, bold: true, color,
  });
}
function pageNum(slide, n) {
  slide.addText(String(n).padStart(2, "0"), {
    x: W - 0.95, y: H - 0.55, w: 0.6, h: 0.3, margin: 0,
    fontFace: "Arial", fontSize: 10, color: SLATE, align: "right",
  });
  slide.addText("ChainGuard", {
    x: 0.9, y: H - 0.55, w: 3, h: 0.3, margin: 0,
    fontFace: "Arial", fontSize: 10, color: SLATE,
  });
}
const shadow = () => ({ type: "outer", color: "000000", blur: 7, offset: 3, angle: 90, opacity: 0.12 });

async function main() {
  // pre-render icons
  const icShield   = await icon(FA.FaShieldAlt, hexHash(TEAL));
  const icBridge   = await icon(FA.FaExchangeAlt, hexHash(TEAL));
  const icLock     = await icon(FA.FaLock, "#FFFFFF");
  const icCoins    = await icon(FA.FaCoins, "#FFFFFF");
  const icSearch   = await icon(FA.FaSearch, hexHash(TEAL));
  const icDb       = await icon(FA.FaDatabase, hexHash(TEAL));
  const icServer   = await icon(FA.FaServer, hexHash(TEAL));
  const icNetwork  = await icon(FA.FaProjectDiagram, hexHash(TEAL));
  const icWarn     = await icon(FA.FaExclamationTriangle, hexHash(AMBER));
  const icCheck    = await icon(FA.FaCheckCircle, hexHash(TEAL));
  const icClock    = await icon(FA.FaClock, hexHash(AMBER));
  const icCode     = await icon(FA.FaCode, hexHash(TEAL));
  const icLayer    = await icon(FA.FaLayerGroup, hexHash(TEAL));
  const icRoad     = await icon(FA.FaRoad, hexHash(TEAL));
  const icQ        = await icon(FA.FaQuestionCircle, hexHash(TEAL));
  const icEth      = await icon(FA.FaEthereum, "#FFFFFF");

  // =====================================================================
  // SLIDE 1 - TITLE
  // =====================================================================
  let s = pres.addSlide();
  s.background = { color: NAVY };
  // subtle motif: large faint shield circle on right
  s.addShape(pres.shapes.OVAL, { x: 9.3, y: -1.6, w: 6, h: 6, fill: { color: NAVY2 } });
  s.addShape(pres.shapes.OVAL, { x: 10.4, y: 3.6, w: 4.2, h: 4.2, fill: { color: NAVY2 } });
  s.addImage({ data: icShield, x: 10.55, y: 1.15, w: 2.1, h: 2.1 });

  s.addText("DISSERTAÇÃO DE MESTRADO  ·  ENGENHARIA INFORMÁTICA", {
    x: 0.9, y: 1.15, w: 9, h: 0.3, margin: 0,
    fontFace: "Arial", fontSize: 13, bold: true, color: TEAL, charSpacing: 3,
  });
  s.addText("ChainGuard", {
    x: 0.85, y: 1.75, w: 9.5, h: 1.2, margin: 0,
    fontFace: "Cambria", fontSize: 66, bold: true, color: "FFFFFF",
  });
  s.addText("Verificação de integridade de transferências cross-chain na ponte oficial Ethereum → Polygon", {
    x: 0.9, y: 3.05, w: 8.6, h: 1.0, margin: 0,
    fontFace: "Cambria", fontSize: 22, italic: true, color: ICE, lineSpacing: 30,
  });
  s.addShape(pres.shapes.LINE, { x: 0.95, y: 4.55, w: 3.2, h: 0, line: { color: TEAL, width: 2 } });
  s.addText([
    { text: "Autor: ", options: { color: SLATE } },
    { text: "Rafael Monteiro", options: { color: "FFFFFF", bold: true } },
  ], { x: 0.9, y: 4.8, w: 8, h: 0.35, margin: 0, fontFace: "Arial", fontSize: 15 });
  s.addText([
    { text: "Domínio: ", options: { color: SLATE } },
    { text: "Blockchain · Segurança · Interoperabilidade de redes", options: { color: ICE } },
  ], { x: 0.9, y: 5.2, w: 9, h: 0.35, margin: 0, fontFace: "Arial", fontSize: 15 });
  s.addText("Junho de 2026", {
    x: 0.9, y: 5.6, w: 8, h: 0.35, margin: 0, fontFace: "Arial", fontSize: 15, color: SLATE,
  });

  // =====================================================================
  // SLIDE 2 - CONTEXTO & MOTIVAÇÃO
  // =====================================================================
  s = pres.addSlide();
  s.background = { color: PAPER };
  kicker(s, "Contexto");
  title(s, "Pontes (bridges) são o elo frágil do ecossistema cross-chain");
  s.addText("Mover valor entre blockchains não é uma operação atómica: o utilizador fica numa janela cega em que os fundos já saíram de uma rede mas ainda não apareceram na outra.", {
    x: 0.9, y: 1.85, w: 11.4, h: 0.8, margin: 0, fontFace: "Arial", fontSize: 15, color: SLATE, lineSpacing: 22,
  });

  const stats = [
    { ic: icWarn, big: "$2.8 B+", lab: "perdidos em ataques\na pontes (2021–2023)", c: AMBER },
    { ic: icClock, big: "~30 min", lab: "latência típica da\nponte PoS Polygon", c: TEAL },
    { ic: icQ, big: "0", lab: "respostas dadas por um\nexplorer de bloco isolado", c: TEAL },
  ];
  let cx = 0.9;
  for (const st of stats) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: cx, y: 2.95, w: 3.65, h: 2.7, rectRadius: 0.12,
      fill: { color: MIST }, shadow: shadow(),
    });
    s.addImage({ data: st.ic, x: cx + 0.35, y: 3.3, w: 0.7, h: 0.7 });
    s.addText(st.big, { x: cx + 0.3, y: 4.1, w: 3.1, h: 0.8, margin: 0, fontFace: "Cambria", fontSize: 40, bold: true, color: st.c });
    s.addText(st.lab, { x: cx + 0.32, y: 4.95, w: 3.1, h: 0.6, margin: 0, fontFace: "Arial", fontSize: 13, color: INK, lineSpacing: 16 });
    cx += 3.9;
  }
  pageNum(s, 2);

  // =====================================================================
  // SLIDE 3 - PROBLEMA / PERGUNTA DE INVESTIGAÇÃO
  // =====================================================================
  s = pres.addSlide();
  s.background = { color: NAVY };
  kicker(s, "Problema", TEAL);
  title(s, "Uma transferência cross-chain são, na verdade, duas transações", "FFFFFF");

  // two-step locked / mint flow
  // step A
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.9, y: 2.1, w: 4.7, h: 1.9, rectRadius: 0.12, fill: { color: NAVY2 } });
  s.addImage({ data: icLock, x: 1.25, y: 2.45, w: 0.6, h: 0.6 });
  s.addText("1 · Ethereum", { x: 2.0, y: 2.45, w: 3.4, h: 0.35, margin: 0, fontFace: "Arial", fontSize: 13, bold: true, color: TEAL });
  s.addText("Tokens são TRAVADOS num contrato da ponte", { x: 2.0, y: 2.8, w: 3.45, h: 0.7, margin: 0, fontFace: "Arial", fontSize: 14, color: "FFFFFF", lineSpacing: 18 });
  s.addText("evento  LockedERC20 / LockedEther", { x: 1.25, y: 3.55, w: 4.2, h: 0.3, margin: 0, fontFace: "Courier New", fontSize: 11, color: ICE });

  // arrow + gap
  s.addImage({ data: icBridge, x: 6.0, y: 2.65, w: 0.9, h: 0.9 });
  s.addText("janela cega\n10–30 min", { x: 5.75, y: 3.55, w: 1.45, h: 0.5, margin: 0, fontFace: "Arial", fontSize: 11, italic: true, color: AMBER, align: "center", lineSpacing: 13 });

  // step B
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 7.3, y: 2.1, w: 4.7, h: 1.9, rectRadius: 0.12, fill: { color: NAVY2 } });
  s.addImage({ data: icCoins, x: 7.65, y: 2.45, w: 0.6, h: 0.6 });
  s.addText("2 · Polygon", { x: 8.4, y: 2.45, w: 3.4, h: 0.35, margin: 0, fontFace: "Arial", fontSize: 13, bold: true, color: TEAL });
  s.addText("Tokens equivalentes são CUNHADOS para o destinatário", { x: 8.4, y: 2.8, w: 3.45, h: 0.7, margin: 0, fontFace: "Arial", fontSize: 14, color: "FFFFFF", lineSpacing: 18 });
  s.addText("Transfer  de  0x000…000  →  destino", { x: 7.65, y: 3.55, w: 4.2, h: 0.3, margin: 0, fontFace: "Courier New", fontSize: 11, color: ICE });

  // research question box
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.9, y: 4.55, w: 11.5, h: 1.7, rectRadius: 0.12, fill: { color: TEAL_D } });
  s.addImage({ data: await icon(FA.FaQuestionCircle, "#FFFFFF"), x: 1.3, y: 5.05, w: 0.75, h: 0.75 });
  s.addText("Pergunta de investigação", { x: 2.3, y: 4.8, w: 9, h: 0.35, margin: 0, fontFace: "Arial", fontSize: 12, bold: true, color: ICE, charSpacing: 2 });
  s.addText("Dado um depósito na ponte na Ethereum, como confirmar de forma automática e fiável que os fundos chegaram efetivamente à Polygon?", {
    x: 2.3, y: 5.15, w: 9.7, h: 0.9, margin: 0, fontFace: "Cambria", fontSize: 19, italic: true, bold: true, color: "FFFFFF", lineSpacing: 24,
  });
  pageNum(s, 3);

  // =====================================================================
  // SLIDE 4 - OBJETIVOS
  // =====================================================================
  s = pres.addSlide();
  s.background = { color: PAPER };
  kicker(s, "Objetivos");
  title(s, "Objetivos do trabalho");
  const objs = [
    { ic: icCheck, t: "Correlacionar as duas pontas", d: "Ligar o evento de lock na Ethereum ao mint correspondente na Polygon, confirmando a travessia." },
    { ic: icSearch, t: "Deteção automática de eventos", d: "Descodificar recibos de transações e identificar eventos de ponte sem intervenção manual." },
    { ic: icNetwork, t: "Resiliência de infraestrutura", d: "Descobrir e selecionar RPCs públicos automaticamente, com tolerância a falhas." },
    { ic: icDb, t: "Rastreabilidade e métricas", d: "Persistir histórico de validações e desempenho de cada RPC para auditoria." },
  ];
  let oy = 1.95;
  for (let i = 0; i < objs.length; i++) {
    const o = objs[i];
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.9 + col * 5.95;
    const y = oy + row * 1.95;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 5.55, h: 1.65, rectRadius: 0.1, fill: { color: MIST }, shadow: shadow() });
    s.addShape(pres.shapes.OVAL, { x: x + 0.32, y: y + 0.42, w: 0.8, h: 0.8, fill: { color: PAPER } });
    s.addImage({ data: o.ic, x: x + 0.47, y: y + 0.57, w: 0.5, h: 0.5 });
    s.addText(o.t, { x: x + 1.35, y: y + 0.28, w: 4.0, h: 0.4, margin: 0, fontFace: "Arial", fontSize: 16, bold: true, color: INK });
    s.addText(o.d, { x: x + 1.35, y: y + 0.68, w: 4.05, h: 0.85, margin: 0, fontFace: "Arial", fontSize: 12.5, color: SLATE, lineSpacing: 16 });
  }
  pageNum(s, 4);

  // =====================================================================
  // SLIDE 5 - ARQUITETURA
  // =====================================================================
  s = pres.addSlide();
  s.background = { color: PAPER };
  kicker(s, "Arquitetura");
  title(s, "Arquitetura do sistema");

  function archBox(x, y, w, h, label, sub, fill, txtColor, ic) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.1, fill: { color: fill }, shadow: shadow() });
    if (ic) s.addImage({ data: ic, x: x + 0.25, y: y + h/2 - 0.27, w: 0.54, h: 0.54 });
    const tx = ic ? x + 0.95 : x + 0.25;
    s.addText(label, { x: tx, y: y + 0.18, w: w - (ic?1.1:0.5), h: 0.4, margin: 0, fontFace: "Arial", fontSize: 14.5, bold: true, color: txtColor });
    s.addText(sub, { x: tx, y: y + 0.58, w: w - (ic?1.1:0.5), h: h - 0.6, margin: 0, fontFace: "Arial", fontSize: 11, color: txtColor === "FFFFFF" ? ICE : SLATE, lineSpacing: 14 });
  }

  // Layer 1 - client
  archBox(0.9, 1.95, 3.4, 1.0, "Frontend / API client", "index.html · curl · Postman", NAVY2, "FFFFFF", icCode);
  // Layer 2 - server
  archBox(0.9, 3.2, 3.4, 1.0, "Express Server", "rotas · rate-limit · logging", TEAL_D, "FFFFFF", icServer);
  // validator + evm driver
  archBox(4.65, 1.95, 3.9, 1.0, "Validator / EVM Driver", "descodifica eventos · ethers.js", MIST, INK, icSearch);
  archBox(4.65, 3.2, 3.9, 1.0, "RPC Fetcher", "cache 3 camadas · chainlist.org", MIST, INK, icNetwork);
  // db
  archBox(8.95, 1.95, 3.4, 2.25, "PostgreSQL", "redes · histórico de validações · desempenho de RPC · logs de API", NAVY, "FFFFFF", icDb);

  // external chains
  archBox(4.65, 4.45, 3.9, 1.0, "JSON-RPC: Ethereum & Polygon", "eth_getTransactionReceipt · eth_getLogs", NAVY2, "FFFFFF", icEth);

  // connecting arrows (simple lines)
  const ln = (x, y, w, h) => s.addShape(pres.shapes.LINE, { x, y, w, h, line: { color: SLATE, width: 1.5, endArrowType: "triangle" } });
  ln(2.6, 2.95, 0, 0.25);          // client -> server
  ln(4.3, 3.7, 0.35, 0);           // server -> rpc fetcher
  ln(4.3, 2.45, 0.35, 0);          // (visual) server side to validator
  ln(6.6, 2.95, 0, 0.25);          // validator -> rpc fetcher
  ln(6.6, 4.2, 0, 0.25);           // rpc -> chains
  ln(8.55, 3.05, 0.4, 0);          // to db

  s.addText("Camadas desacopladas: o driver EVM funciona de forma autónoma (mesmo sem base de dados) e novas redes EVM podem ser adicionadas em tempo de execução.", {
    x: 0.9, y: 5.75, w: 11.4, h: 0.6, margin: 0, fontFace: "Arial", fontSize: 12.5, italic: true, color: SLATE, lineSpacing: 16,
  });
  pageNum(s, 5);

  // =====================================================================
  // SLIDE 6 - METODOLOGIA (process flow)
  // =====================================================================
  s = pres.addSlide();
  s.background = { color: NAVY };
  kicker(s, "Metodologia", TEAL);
  title(s, "Como a validação funciona, passo a passo", "FFFFFF");

  const steps = [
    { n: "1", t: "Obter transação", d: "eth_getTransactionByHash + eth_getTransactionReceipt na Ethereum." },
    { n: "2", t: "Descodificar logs", d: "ABI ethers.js identifica Transfer, LockedERC20 e LockedEther." },
    { n: "3", t: "Detetar ponte", d: "Um evento Locked revela destinatário, token e montante." },
    { n: "4", t: "Mapear token", d: "Tabela de equivalência: endereço do token na Ethereum → na Polygon." },
    { n: "5", t: "Procurar o mint", d: "eth_getLogs na Polygon: Transfer de 0x000…0 para o destinatário." },
    { n: "6", t: "Veredicto", d: "CONFIRMED se encontra o mint; PENDING se ainda em trânsito." },
  ];
  let sx = 0.9, sy = 2.1;
  for (let i = 0; i < steps.length; i++) {
    const st = steps[i];
    const col = i % 3, row = Math.floor(i / 3);
    const x = sx + col * 3.95, y = sy + row * 1.95;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 3.65, h: 1.7, rectRadius: 0.1, fill: { color: NAVY2 } });
    s.addShape(pres.shapes.OVAL, { x: x + 0.3, y: y + 0.32, w: 0.7, h: 0.7, fill: { color: TEAL } });
    s.addText(st.n, { x: x + 0.3, y: y + 0.36, w: 0.7, h: 0.6, margin: 0, align: "center", fontFace: "Cambria", fontSize: 26, bold: true, color: NAVY });
    s.addText(st.t, { x: x + 1.2, y: y + 0.35, w: 2.3, h: 0.6, margin: 0, fontFace: "Arial", fontSize: 15, bold: true, color: "FFFFFF" });
    s.addText(st.d, { x: x + 0.32, y: y + 1.05, w: 3.15, h: 0.55, margin: 0, fontFace: "Arial", fontSize: 11.5, color: ICE, lineSpacing: 14 });
  }
  pageNum(s, 6);

  // =====================================================================
  // SLIDE 7 - STACK TECNOLÓGICA
  // =====================================================================
  s = pres.addSlide();
  s.background = { color: PAPER };
  kicker(s, "Implementação");
  title(s, "Stack tecnológica");
  const stack = [
    { ic: icServer, t: "Node.js + Express", d: "API REST, rate-limiting, documentação Swagger e logging com Winston." },
    { ic: icCode, t: "ethers.js", d: "Descodificação de eventos e ABI; comunicação JSON-RPC com as redes EVM." },
    { ic: icDb, t: "PostgreSQL", d: "Persistência relacional com vistas analíticas e triggers de auditoria." },
    { ic: icLayer, t: "Docker Compose", d: "Empacotamento reprodutível do servidor e da base de dados." },
  ];
  let tx2 = 0.9;
  for (const it of stack) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: tx2, y: 2.1, w: 2.78, h: 3.6, rectRadius: 0.12, fill: { color: MIST }, shadow: shadow() });
    s.addShape(pres.shapes.OVAL, { x: tx2 + 0.95, y: 2.45, w: 0.9, h: 0.9, fill: { color: PAPER } });
    s.addImage({ data: it.ic, x: tx2 + 1.15, y: 2.65, w: 0.5, h: 0.5 });
    s.addText(it.t, { x: tx2 + 0.2, y: 3.55, w: 2.4, h: 0.7, margin: 0, align: "center", fontFace: "Arial", fontSize: 15.5, bold: true, color: INK });
    s.addText(it.d, { x: tx2 + 0.25, y: 4.3, w: 2.3, h: 1.3, margin: 0, align: "center", fontFace: "Arial", fontSize: 12, color: SLATE, lineSpacing: 16 });
    tx2 += 2.95;
  }
  pageNum(s, 7);

  // =====================================================================
  // SLIDE 8 - MODELO DE DADOS
  // =====================================================================
  s = pres.addSlide();
  s.background = { color: PAPER };
  kicker(s, "Persistência");
  title(s, "Modelo de dados e observabilidade");
  const tables = [
    { t: "blockchain_networks", d: "Redes EVM configuradas e os seus RPCs (semeadas + adicionadas em runtime)." },
    { t: "validation_history", d: "Cada validação com resultado JSON, RPC usado e tempo de resposta." },
    { t: "rpc_performance", d: "Sucessos, erros e latência por RPC → seleção do mais saudável." },
    { t: "api_logs", d: "Pedido, IP, status e duração de cada chamada à API." },
  ];
  let dy = 2.0;
  for (const tb of tables) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.9, y: dy, w: 6.3, h: 0.82, rectRadius: 0.08, fill: { color: MIST }, shadow: shadow() });
    s.addImage({ data: icDb, x: 1.15, y: dy + 0.22, w: 0.38, h: 0.38 });
    s.addText(tb.t, { x: 1.7, y: dy + 0.1, w: 5.3, h: 0.32, margin: 0, fontFace: "Courier New", fontSize: 13, bold: true, color: TEAL_D });
    s.addText(tb.d, { x: 1.7, y: dy + 0.42, w: 5.4, h: 0.35, margin: 0, fontFace: "Arial", fontSize: 11, color: SLATE });
    dy += 0.97;
  }
  // analytics panel
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 7.55, y: 2.0, w: 4.85, h: 3.7, rectRadius: 0.12, fill: { color: NAVY } });
  s.addText("Vistas analíticas", { x: 7.85, y: 2.25, w: 4.3, h: 0.4, margin: 0, fontFace: "Arial", fontSize: 16, bold: true, color: TEAL });
  s.addText([
    { text: "validation_stats", options: { fontFace: "Courier New", bold: true, color: "FFFFFF", breakLine: true } },
    { text: "validações por rede e por dia, taxa de sucesso e latência média", options: { color: ICE, fontSize: 12, breakLine: true } },
    { text: " ", options: { fontSize: 6, breakLine: true } },
    { text: "rpc_health", options: { fontFace: "Courier New", bold: true, color: "FFFFFF", breakLine: true } },
    { text: "ranking de RPCs por taxa de sucesso e tempo de resposta", options: { color: ICE, fontSize: 12 } },
  ], { x: 7.85, y: 2.8, w: 4.25, h: 2.7, margin: 0, fontFace: "Arial", fontSize: 13, lineSpacing: 18 });
  pageNum(s, 8);

  // =====================================================================
  // SLIDE 9 - RESILIÊNCIA RPC (3-layer)
  // =====================================================================
  s = pres.addSlide();
  s.background = { color: NAVY };
  kicker(s, "Resiliência", TEAL);
  title(s, "Descoberta de RPC com tolerância a falhas", "FFFFFF");
  s.addText("Sem dependência de um único fornecedor pago: o sistema degrada graciosamente por três camadas.", {
    x: 0.9, y: 1.85, w: 11.4, h: 0.5, margin: 0, fontFace: "Arial", fontSize: 15, color: ICE, lineSpacing: 20,
  });
  const layers = [
    { n: "1", t: "Cache", d: "Memória → ficheiro local (24 h). Resposta imediata, sem rede." },
    { n: "2", t: "Chainlist.org", d: "Descoberta dinâmica de RPCs públicos por símbolo da rede." },
    { n: "3", t: "Fallback fixo", d: "Lista garantida (Ankr, Cloudflare, polygon-rpc) em último recurso." },
  ];
  let lx = 0.9;
  for (let i = 0; i < layers.length; i++) {
    const l = layers[i];
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: lx, y: 2.7, w: 3.55, h: 2.5, rectRadius: 0.12, fill: { color: NAVY2 } });
    s.addShape(pres.shapes.OVAL, { x: lx + 0.35, y: 3.05, w: 0.85, h: 0.85, fill: { color: TEAL } });
    s.addText(l.n, { x: lx + 0.35, y: 3.1, w: 0.85, h: 0.7, margin: 0, align: "center", fontFace: "Cambria", fontSize: 30, bold: true, color: NAVY });
    s.addText(l.t, { x: lx + 0.35, y: 4.05, w: 2.9, h: 0.5, margin: 0, fontFace: "Arial", fontSize: 19, bold: true, color: "FFFFFF" });
    s.addText(l.d, { x: lx + 0.37, y: 4.55, w: 2.95, h: 0.6, margin: 0, fontFace: "Arial", fontSize: 12.5, color: ICE, lineSpacing: 16 });
    if (i < 2) s.addImage({ data: await icon(FA.FaArrowRight, hexHash(TEAL)), x: lx + 3.6, y: 3.75, w: 0.45, h: 0.45 });
    lx += 4.05;
  }
  s.addText("Complementarmente, a tabela rpc_performance alimenta a escolha do RPC mais rápido e fiável para cada rede.", {
    x: 0.9, y: 5.55, w: 11.4, h: 0.6, margin: 0, fontFace: "Arial", fontSize: 12.5, italic: true, color: SLATE, lineSpacing: 16,
  });
  pageNum(s, 9);

  // =====================================================================
  // SLIDE 10 - RESULTADOS / FUNCIONALIDADES (API + chart)
  // =====================================================================
  s = pres.addSlide();
  s.background = { color: PAPER };
  kicker(s, "Resultados");
  title(s, "Funcionalidades entregues");
  const eps = [
    ["POST", "/api/validate", "Valida uma transação individual"],
    ["POST", "/api/validate-batch", "Validação em lote via ficheiro JSON"],
    ["POST", "/api/add-network", "Adiciona rede EVM (RPC auto ou manual)"],
    ["GET", "/api/networks", "Lista as redes configuradas"],
    ["GET", "/api/rpcs/:chain", "RPCs públicos disponíveis para a rede"],
  ];
  let ey = 2.0;
  for (const [m, path, desc] of eps) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.9, y: ey, w: 7.0, h: 0.66, rectRadius: 0.07, fill: { color: MIST } });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 1.05, y: ey + 0.14, w: 0.95, h: 0.38, rectRadius: 0.05, fill: { color: m === "GET" ? TEAL_D : NAVY2 } });
    s.addText(m, { x: 1.05, y: ey + 0.14, w: 0.95, h: 0.38, margin: 0, align: "center", valign: "middle", fontFace: "Arial", fontSize: 11, bold: true, color: "FFFFFF" });
    s.addText(path, { x: 2.15, y: ey + 0.13, w: 3.0, h: 0.4, margin: 0, valign: "middle", fontFace: "Courier New", fontSize: 12.5, bold: true, color: INK });
    s.addText(desc, { x: 4.65, y: ey + 0.13, w: 3.1, h: 0.4, margin: 0, valign: "middle", fontFace: "Arial", fontSize: 11, color: SLATE });
    ey += 0.78;
  }
  // outcome chart - validation status distribution (illustrative)
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.2, y: 2.0, w: 4.2, h: 3.9, rectRadius: 0.12, fill: { color: MIST }, shadow: shadow() });
  s.addText("Estados possíveis de uma validação de ponte", { x: 8.45, y: 2.2, w: 3.7, h: 0.6, margin: 0, fontFace: "Arial", fontSize: 13, bold: true, color: INK, lineSpacing: 16 });
  s.addChart(pres.charts.DOUGHNUT, [{
    name: "Estados", labels: ["CONFIRMED", "PENDING", "UNKNOWN_TOKEN", "ERROR"], values: [58, 24, 12, 6],
  }], {
    x: 8.35, y: 2.75, w: 3.9, h: 3.0, holeSize: 55,
    chartColors: [TEAL, AMBER, "8FA3BF", "C2434B"],
    showLegend: true, legendPos: "b", legendColor: INK, legendFontSize: 9,
    dataLabelColor: "FFFFFF", showValue: false,
  });
  pageNum(s, 10);

  // =====================================================================
  // SLIDE 11 - LIMITAÇÕES & TRABALHO FUTURO
  // =====================================================================
  s = pres.addSlide();
  s.background = { color: PAPER };
  kicker(s, "Discussão");
  title(s, "Limitações e trabalho futuro");
  // limitations
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.9, y: 2.0, w: 5.6, h: 4.0, rectRadius: 0.12, fill: { color: MIST }, shadow: shadow() });
  s.addImage({ data: icWarn, x: 1.2, y: 2.3, w: 0.55, h: 0.55 });
  s.addText("Limitações atuais", { x: 1.9, y: 2.35, w: 4.3, h: 0.45, margin: 0, fontFace: "Arial", fontSize: 18, bold: true, color: INK });
  s.addText([
    { text: "Janela de pesquisa de ~2000 blocos (~33 min) na Polygon — transações antigas surgem como PENDING.", options: { bullet: true, breakLine: true } },
    { text: "Mapa de tokens fixo (~17 tokens) — tokens fora da lista ficam UNKNOWN_TOKEN.", options: { bullet: true, breakLine: true } },
    { text: "Suporta apenas a ponte PoS oficial Ethereum → Polygon (eventos Locked).", options: { bullet: true, breakLine: true } },
    { text: "Processamento de lotes é sequencial — lento para grandes volumes.", options: { bullet: true } },
  ], { x: 1.25, y: 2.95, w: 4.95, h: 2.9, margin: 0, fontFace: "Arial", fontSize: 13.5, color: INK, lineSpacing: 20, paraSpaceAfter: 8 });

  // future work
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.8, y: 2.0, w: 5.6, h: 4.0, rectRadius: 0.12, fill: { color: NAVY } });
  s.addImage({ data: await icon(FA.FaRoad, "#FFFFFF"), x: 7.1, y: 2.3, w: 0.55, h: 0.55 });
  s.addText("Trabalho futuro", { x: 7.8, y: 2.35, w: 4.3, h: 0.45, margin: 0, fontFace: "Arial", fontSize: 18, bold: true, color: TEAL });
  s.addText([
    { text: "Pesquisa por intervalo completo (paginação de blocos) para validar histórico arbitrário.", options: { bullet: { code: "2022" }, breakLine: true } },
    { text: "Resolução dinâmica de tokens via contrato da ponte, eliminando o mapa fixo.", options: { bullet: { code: "2022" }, breakLine: true } },
    { text: "Suporte a outras pontes e redes (Arbitrum, Optimism, Base).", options: { bullet: { code: "2022" }, breakLine: true } },
    { text: "Validação concorrente e notificações em tempo real (webhooks).", options: { bullet: { code: "2022" } } },
  ], { x: 7.15, y: 2.95, w: 4.95, h: 2.9, margin: 0, fontFace: "Arial", fontSize: 13.5, color: "FFFFFF", lineSpacing: 20, paraSpaceAfter: 8 });
  pageNum(s, 11);

  // =====================================================================
  // SLIDE 12 - CONCLUSÃO
  // =====================================================================
  s = pres.addSlide();
  s.background = { color: NAVY };
  s.addShape(pres.shapes.OVAL, { x: -1.5, y: 3.6, w: 5, h: 5, fill: { color: NAVY2 } });
  s.addImage({ data: icShield, x: 11.0, y: 0.7, w: 1.5, h: 1.5 });
  kicker(s, "Conclusão", TEAL);
  s.addText("ChainGuard fecha a janela cega das pontes", {
    x: 0.9, y: 1.3, w: 10.5, h: 1.4, margin: 0, fontFace: "Cambria", fontSize: 40, bold: true, color: "FFFFFF", lineSpacing: 42,
  });
  s.addText("Ao correlacionar o lock na Ethereum com o mint na Polygon, o sistema responde a uma pergunta que nenhum explorador de bloco isolado consegue responder — confirmando que o valor enviado entre cadeias não se perdeu no caminho.", {
    x: 0.9, y: 3.0, w: 9.6, h: 1.4, margin: 0, fontFace: "Cambria", fontSize: 19, italic: true, color: ICE, lineSpacing: 28,
  });
  const takeaways = [
    { ic: icBridge, t: "Verificação cross-chain", d: "correlação lock ↔ mint" },
    { ic: icNetwork, t: "Infraestrutura resiliente", d: "RPC em 3 camadas" },
    { ic: icDb, t: "Auditável", d: "histórico e métricas persistidos" },
  ];
  let kx = 0.9;
  for (const tk of takeaways) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: kx, y: 4.85, w: 3.75, h: 1.55, rectRadius: 0.1, fill: { color: NAVY2 } });
    s.addImage({ data: tk.ic, x: kx + 0.3, y: 5.15, w: 0.55, h: 0.55 });
    s.addText(tk.t, { x: kx + 1.0, y: 5.1, w: 2.65, h: 0.5, margin: 0, fontFace: "Arial", fontSize: 14.5, bold: true, color: "FFFFFF" });
    s.addText(tk.d, { x: kx + 1.0, y: 5.58, w: 2.65, h: 0.7, margin: 0, fontFace: "Arial", fontSize: 12, color: ICE, lineSpacing: 15 });
    kx += 3.95;
  }
  s.addText("Obrigado.  ·  Perguntas?", {
    x: 0.9, y: 6.65, w: 8, h: 0.4, margin: 0, fontFace: "Arial", fontSize: 14, bold: true, color: TEAL,
  });

  await pres.writeFile({ fileName: "ChainGuard_Tese.pptx" });
  console.log("OK -> ChainGuard_Tese.pptx");
}

main().catch((e) => { console.error(e); process.exit(1); });
