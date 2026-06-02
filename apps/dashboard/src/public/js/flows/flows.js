// Inicialização agora atrelada ao ecossistema unificado da SPA
window.initFlowsView = async function () {
  console.log("[Flows] Carregando módulo de fluxos automáticos...");

  const currentToken = localStorage.getItem("token");

  // Reutiliza e valida o status específico para a aba de fluxos
  const whatsappConnected = await getFlowsWhatsAppStatus(currentToken);
  if (!whatsappConnected) {
    window.location.href = "/qr";
    return;
  }

  // Carrega os dados estruturais dos fluxos para renderização
  await loadFlows();
};

/*
 =========================
 STATUS (Isolado e protegido para a view de fluxos)
 =========================
 */
async function getFlowsWhatsAppStatus(token) {
  const statusElement = document.getElementById("status");
  const apiUrl = window.APP_CONFIG.API_URL;

  try {
    const response = await fetch(`${apiUrl}/status`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

    const data = await response.json();
    const estado = data.status ? data.status.toLowerCase() : "unknown";

    if (statusElement) {
      statusElement.innerText = data.status || "DISCONNECTED";
    }

    return estado === "open" || estado === "connected";
  } catch (error) {
    if (statusElement) statusElement.innerText = "Erro";
    console.error("Erro ao obter status do WhatsApp em Flows:", error);
    return false;
  }
}

async function loadFlows() {
  // Assume a existência da sua função auxiliar de renderização contida nos submódulos
  const container = getFlowsContainer();
  showLoading(container);

  try {
    const flows = await fetchFlows();
    renderFlows(flows);
  } catch (error) {
    showError(container);
    console.error("[Flows Engine Error]:", error);
  }
}
