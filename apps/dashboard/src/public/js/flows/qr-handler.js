// Recupera o token do LocalStorage conforme o padrão do seu ecossistema
const token = localStorage.getItem("token");
let qrInterval = null;
let ultimoQrExibido = "";
let jaRedirecionando = false; // Flag para evitar duplicar o timer de redirecionamento

// Inicializa o script assim que a página terminar de carregar o DOM
document.addEventListener("DOMContentLoaded", () => {
  initQrHandler();
});

/**
 * Controla a inicialização da tela e o ciclo do Polling
 */
async function initQrHandler() {
  // Executa uma checagem imediata ao entrar na página
  await verificarStatusSessao();

  // Configura a checagem cíclica a cada 4 segundos (tempo ideal para não estressar o Baileys)
  qrInterval = setInterval(verificarStatusSessao, 4000);
}

/**
 * Consome o endpoint do NFlow Core de forma segura
 */
async function verificarStatusSessao() {
  // Se já iniciou o fluxo de ir para a home, não faz mais nada
  if (jaRedirecionando) return;

  // Redireciona se o usuário perdeu a sessão local
  if (!token) {
    window.location.href = "/login";
    return;
  }

  try {
    const response = await fetch(`${API_URL}/whatsapp/status`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    // Se a rota falhar por falta de autorização, limpa e desloga
    if (response.status === 401 || response.status === 403) {
      clearInterval(qrInterval);
      localStorage.removeItem("token");
      window.location.href = "/login";
      return;
    }

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const data = await response.json();

    // Atualiza a interface com base no retorno do backend
    atualizarInterface(data.status, data.qr);
  } catch (error) {
    console.error("Erro ao consultar status do WhatsApp:", error);
    definirEstadoUI("error", "Erro ao conectar com o servidor");
  }
}

/**
 * Gerencia todas as mutações visuais do HTML baseando-se no Estado da Sessão
 */
function atualizarInterface(status, qr) {
  const statusText = document.getElementById("connection-status");
  const statusDot = document.getElementById("status-dot");
  const qrBox = document.getElementById("qr-box");

  // Normaliza strings para evitar quebras por Case Sensitivity (Maiúsculas/Minúsculas)
  const estadoAtual = status ? status.toLowerCase() : "unknown";

  // CASO 1: Sessão Conectada com Sucesso (Baileys 'open')
  if (estadoAtual === "open" || estadoAtual === "connected") {
    clearInterval(qrInterval); // Para o polling imediatamente

    if (!jaRedirecionando) {
      jaRedirecionando = true;

      statusDot.className = "status-dot connected";
      statusText.innerText = "WhatsApp Conectado!";

      // Dispara a contagem de 5 segundos injetando a atualização no HTML
      iniciarContagemRegressiva(5);
    }
    return;
  }

  // CASO 2: Backend processando ou inicializando a sessão
  if (estadoAtual === "connecting" && !qr) {
    statusDot.className = "status-dot pulsing";
    statusDot.style.background = "#e1b12c"; // Amarelo
    statusText.innerText = "Inicializando modem do WhatsApp...";
    qrBox.innerHTML = '<div class="spinner"></div>';
    return;
  }

  // CASO 3: QR Code disponível para leitura (Aguardando escaneamento)
  if (qr) {
    statusDot.className = "status-dot pulsing";
    statusDot.style.background = "#e1b12c";
    statusText.innerText = "Aguardando escaneamento...";

    // Evita re-renderizar a imagem se o QR Code retornado for exatamente idêntico ao atual
    if (qr !== ultimoQrExibido) {
      ultimoQrExibido = qr;

      // Valida se o backend enviou uma imagem Base64 pronta ou a string pura do QR
      if (qr.startsWith("data:image")) {
        qrBox.innerHTML = `<img src="${qr}" alt="WhatsApp QR Code" />`;
      } else {
        // Se for a string pura (Padrão do Baileys), gera o QR usando uma API externa de alta performance e sem dependências locais
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qr)}`;
        qrBox.innerHTML = `<img src="${qrUrl}" alt="WhatsApp QR Code" />`;
      }
    }
    return;
  }

  // CASO 4: Qualquer outro estado de desconexão ou fechamento ('close')
  statusDot.className = "status-dot disconnected";
  statusText.innerText = "Sessão Desconectada";
  qrBox.innerHTML = `
    <p style="color: #666; font-size: 14px; padding: 10px;">
      Nenhum código gerado.<br>Clique no botão abaixo para tentar novamente.
    </p>
  `;
}

/**
 * Função utilitária para forçar estados de erro visual
 */
function definirEstadoUI(tipo, mensagem) {
  const statusText = document.getElementById("connection-status");
  const statusDot = document.getElementById("status-dot");

  if (tipo === "error") {
    statusDot.className = "status-dot disconnected";
    statusText.innerText = message; // Proteção simples de escopo de variável
  }
}

/**
 * Ação manual ligada ao botão 'Atualizar QR Code'
 */
async function gerarNovoQrCode() {
  if (jaRedirecionando) return; // Bloqueia cliques se já estiver saindo da página

  const qrBox = document.getElementById("qr-box");
  qrBox.innerHTML = '<div class="spinner"></div>';
  ultimoQrExibido = ""; // Reseta o cache de validação visual

  await verificarStatusSessao();
}

/**
 * Controla o contador regressivo visual na tela e executa o redirecionamento
 */
function iniciarContagemRegressiva(segundos) {
  const qrBox = document.getElementById("qr-box");
  const btnRefresh = document.getElementById("btn-refresh");

  // Desabilita o botão de atualizar para evitar requisições fantasmas
  if (btnRefresh) {
    btnRefresh.disabled = true;
    btnRefresh.style.opacity = "0.5";
    btnRefresh.style.cursor = "not-allowed";
  }

  const timer = setInterval(() => {
    qrBox.innerHTML = `
      <div class="success-message" style="color: #18eb35; font-weight: bold; text-align: center;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="margin-bottom: 10px;">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <p style="font-size: 18px; margin-bottom: 5px;">Pronto para uso!</p>
        <p style="color: #a0a0a0; font-size: 13px; font-weight: normal;">
          Redirecionando em <span style="color: #18eb35; font-weight: bold;">${segundos}</span>s...
        </p>
      </div>
    `;

    if (segundos <= 0) {
      clearInterval(timer);
      window.location.href = "/"; // Redireciona para a raiz estabelecida
    }

    segundos--;
  }, 1000);
}
