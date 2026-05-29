const token = localStorage.getItem("token");
let qrInterval = null;
let ultimoQrExibido = "";
let jaRedirecionando = false;

document.addEventListener("DOMContentLoaded", () => {
  initQrHandler();
});

async function initQrHandler() {
  await verificarStatusSessao();
  qrInterval = setInterval(verificarStatusSessao, 4000);
}

async function verificarStatusSessao() {
  if (jaRedirecionando) return;

  if (!token) {
    window.location.href = "/login";
    return;
  }

  try {
    const response = await fetch(`${window.APP_CONFIG.API_URL}/status`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    // 🎯 REMOVIDO o redirecionamento por 401/403 para não confundir erro do Baileys com token expirado
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const data = await response.json();
    atualizarInterface(data.status, data.qr);
  } catch (error) {
    console.error("Erro ao consultar status do WhatsApp:", error);
    definirEstadoUI("error", "Erro ao conectar com o servidor");
  }
}

function atualizarInterface(status, qr) {
  const statusText = document.getElementById("connection-status");
  const statusDot = document.getElementById("status-dot");
  const qrBox = document.getElementById("qr-box");

  const estadoAtual = status ? status.toLowerCase() : "unknown";

  if (estadoAtual === "open" || estadoAtual === "connected") {
    clearInterval(qrInterval);

    if (!jaRedirecionando) {
      jaRedirecionando = true;
      statusDot.className = "status-dot connected";
      statusText.innerText = "WhatsApp Conectado!";
      iniciarContagemRegressiva(5);
    }
    return;
  }

  if (estadoAtual === "connecting" && !qr) {
    statusDot.className = "status-dot pulsing";
    statusDot.style.background = "#3498db";
    statusText.innerText = "Inicializando modem do WhatsApp...";
    qrBox.innerHTML = '<div class="spinner"></div>';
    return;
  }

  if (qr) {
    statusDot.className = "status-dot pulsing";
    statusDot.style.background = "#e1b12c";
    statusText.innerText = "Aguardando escaneamento...";

    if (qr !== ultimoQrExibido) {
      ultimoQrExibido = qr;

      if (qr.startsWith("data:image")) {
        qrBox.innerHTML = `<img src="${qr}" alt="WhatsApp QR Code" style="max-width: 100%; height: auto;" />`;
      } else {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=230x230&data=${encodeURIComponent(qr)}`;
        qrBox.innerHTML = `<img src="${qrUrl}" alt="WhatsApp QR Code" style="max-width: 100%; height: auto;" />`;
      }
    }
    return;
  }

  statusDot.className = "status-dot disconnected";
  statusText.innerText = "Sessão Desconectada";
  qrBox.innerHTML = `
    <p style="color: #666; font-size: 14px; padding: 10px;">
      Nenhum código gerado.<br>Clique no botão abaixo para tentar novamente.
    </p>
  `;
}

function definirEstadoUI(tipo, mensagem) {
  const statusText = document.getElementById("connection-status");
  const statusDot = document.getElementById("status-dot");

  if (tipo === "error") {
    statusDot.className = "status-dot disconnected";
    statusText.innerText = mensagem;
  }
}

async function gerarNovoQrCode() {
  if (jaRedirecionando) return;
  const qrBox = document.getElementById("qr-box");
  qrBox.innerHTML = '<div class="spinner"></div>';
  ultimoQrExibido = "";
  await verificarStatusSessao();
}

function iniciarContagemRegressiva(segundos) {
  const qrBox = document.getElementById("qr-box");
  const btnRefresh = document.getElementById("btn-refresh");

  if (btnRefresh) {
    btnRefresh.disabled = true;
    btnRefresh.style.opacity = "0.5";
    btnRefresh.style.cursor = "not-allowed";
  }

  atualizarTextoContador(segundos);

  const timer = setInterval(() => {
    segundos--;

    if (segundos <= 0) {
      clearInterval(timer);
      window.location.href = "/";
      return;
    }

    atualizarTextoContador(segundos);
  }, 1000);

  function atualizarTextoContador(seg) {
    qrBox.innerHTML = `
      <div class="success-message" style="color: #18eb35; font-weight: bold; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="margin-bottom: 10px;">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <p style="font-size: 18px; margin-bottom: 5px; color: white;">Pronto para uso!</p>
        <p style="color: #a0a0a0; font-size: 13px; font-weight: normal;">
          Redirecionando em <span style="color: #18eb35; font-weight: bold;">${seg}</span>s...
        </p>
      </div>
    `;
  }
}
