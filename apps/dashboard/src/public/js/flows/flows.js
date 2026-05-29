const token = localStorage.getItem("token");

init();

async function init() {
  const authenticated = await checkAuthentication();
  if (!authenticated) return;

  const whatsappConnected = await getStatus();
  if (!whatsappConnected) {
    window.location.href = "/qr";
    return;
  }

  await loadFlows();
}

/*
 =========================
 STATUS (Atualizado para retornar booleano)
 =========================
*/
async function getStatus() {
  const statusElement = document.getElementById("status");

  try {
    // Utiliza o endpoint padronizado do ecossistema
    const response = await fetch(`${API_URL}/whatsapp/status`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const data = await response.json();

    // Normaliza o status vindo do backend
    const estado = data.status ? data.status.toLowerCase() : "unknown";

    // Injeta o texto legível na sua UI se o elemento existir na tela
    if (statusElement) {
      statusElement.innerText = data.status || "DISCONNECTED";
    }

    console.log("-----------------------------------------");
    console.log("WhatsApp Status Data:", data);

    // Retorna verdadeiro SOMENTE se estiver pronto para uso
    if (estado === "open" || estado === "connected" || estado === "connected") {
      return true;
    }

    return false;
  } catch (error) {
    if (statusElement) {
      statusElement.innerText = "Erro";
    }
    console.log("Erro ao obter status do WhatsApp:", error);
    return false;
  }
}

async function loadFlows() {
  const container = getFlowsContainer();

  showLoading(container);

  try {
    const flows = await fetchFlows();

    renderFlows(flows);
  } catch (error) {
    showError(container);

    console.log(error);
  }
}
