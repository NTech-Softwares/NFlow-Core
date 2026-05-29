const token = localStorage.getItem("token");

document.addEventListener("DOMContentLoaded", () => {
  init();
});

async function init() {
  // O auth.js global já valida o token aqui. Focamos apenas na regra de negócio:
  const whatsappConnected = await getStatus();
  if (!whatsappConnected) {
    window.location.href = "/qr";
    return;
  }

  await loadFlows();
}

/*
 =========================
 STATUS (Corrigido para a Rota Nova /status)
 =========================
 */
async function getStatus() {
  const statusElement = document.getElementById("status");

  try {
    const response = await fetch(`${window.APP_CONFIG.API_URL}/status`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const data = await response.json();
    const estado = data.status ? data.status.toLowerCase() : "unknown";

    if (statusElement) {
      statusElement.innerText = data.status || "DISCONNECTED";
    }

    if (estado === "open" || estado === "connected") {
      return true;
    }

    return false;
  } catch (error) {
    if (statusElement) {
      statusElement.innerText = "Erro";
    }
    console.log("Erro ao obter status do WhatsApp em Flows:", error);
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
