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

/**
 * Abre o modal de criação de Fluxo e reseta os inputs
 */
function promptAddFlow() {
  document.getElementById("modal-flow-name-input").value = "";
  document.getElementById("modal-flow-id-input").value = "";
  document.getElementById("modal-flow-initial-step").value = "inicio";
  document.getElementById("modal-flow-message-input").value = "";

  document.getElementById("flow-create-modal").classList.remove("hidden");
}

/**
 * Fecha o modal de Fluxo
 */
function closeFlowModal() {
  document.getElementById("flow-create-modal").classList.add("hidden");
}

/**
 * Normaliza o Nome Amigável em tempo real para gerar o ID do Fluxo
 */
function handleFlowNameAutoFill(nameValue) {
  if (!nameValue) {
    document.getElementById("modal-flow-id-input").value = "";
    return;
  }

  const normalizedId = nameValue
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9\s-_]/g, "") // Remove pontuações e parênteses
    .trim()
    .replace(/\s+/g, "_"); // Troca espaços por _

  document.getElementById("modal-flow-id-input").value = normalizedId;
}

/**
 * Coleta os dados do Modal e envia para a API usando o endpoint do antigo wizard
 */
document.getElementById("btn-modal-flow-save").onclick = async () => {
  const flowId = document.getElementById("modal-flow-id-input").value.trim();
  const initialStep = document
    .getElementById("modal-flow-initial-step")
    .value.trim();
  const stepMessage = document
    .getElementById("modal-flow-message-input")
    .value.trim();

  const saveBtn = document.getElementById("btn-modal-flow-save");

  // Validações idênticas as do antigo wizard.js
  if (!flowId) {
    alert("O Nome do fluxo é obrigatório.");
    return;
  }
  if (!initialStep) {
    alert("Por favor, defina o ID do passo inicial (Ex: inicio).");
    return;
  }
  if (!stepMessage) {
    alert("Por favor, digite a mensagem do passo inicial.");
    return;
  }

  const token = localStorage.getItem("token");
  const originalText = saveBtn.innerHTML;

  // Feedback visual e trava contra clique duplo
  saveBtn.innerHTML = "Criando...";
  saveBtn.disabled = true;

  try {
    const apiUrl = window.APP_CONFIG?.API_URL || API_URL;

    // Substituindo a requisição antiga do wizard para ficar reativa
    const response = await fetch(`${apiUrl}/flows/addflow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        flowId: flowId,
        initialStep: initialStep,
        stepMessage: stepMessage,
      }),
    });

    if (!response.ok) {
      const textoErro = await response.text();
      throw new Error(`Erro do servidor (${response.status}): ${textoErro}`);
    }

    const data = await response.json();

    if (data.success || data.status === "success" || response.ok) {
      closeFlowModal();

      // Atualiza a árvore reativamente na tela chamando a função pai de flows.js
      if (typeof loadFlows === "function") {
        await loadFlows();
      }
    } else {
      throw new Error(data.message || "Falha desconhecida no retorno da API.");
    }
  } catch (error) {
    console.error("Falha ao salvar o fluxo:", error);
    alert(`Erro ao criar o fluxo: ${error.message}`);
  } finally {
    saveBtn.innerHTML = originalText;
    saveBtn.disabled = false;
  }
};
