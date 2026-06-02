// Removemos o escopo global do token e do listener automático.
// Agora a inicialização é controlada pelo navigation.js

window.initDashboardView = async function () {
  console.log("[Dashboard] Inicializando painel de métricas...");

  // Garante a captura atualizada do token gerido pelo auth.js
  const currentToken = localStorage.getItem("token");

  // Verifica o status do WhatsApp de forma isolada nesta janela
  const whatsappConnected = await getDashboardWhatsAppStatus(currentToken);
  if (!whatsappConnected) {
    console.log("[Dashboard] WhatsApp desconectado. Redirecionando para QR...");
    window.location.href = "/qr";
    return;
  }

  // Se estiver conectado, popula a lista de grupos para campanhas
  await listGroups(currentToken);
};

/*
 =========================
 STATUS (Exclusivo da View Dashboard)
 =========================
 */
async function getDashboardWhatsAppStatus(token) {
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
    console.error("Erro ao obter status do WhatsApp no Dashboard:", error);
    return false;
  }
}

/*
 =========================
 INPUT STATE
 =========================
*/
async function updateNumberInputState() {
  const numberInput = document.getElementById("number");
  const sendMsgBtn = document.getElementById("sendMessage");
  const sendCpmgBtn = document.getElementById("sendCampaign");
  const checkedGroups = document.querySelectorAll(".group-checkbox:checked");
  const hasSelectedGroups = checkedGroups.length > 0;

  if (hasSelectedGroups) {
    numberInput.disabled = true;
    numberInput.value = "";
    numberInput.placeholder = "Desabilitado ao selecionar grupos";
    sendMsgBtn.disabled = true;
    sendMsgBtn.style.backgroundColor = "#096315";
    sendCpmgBtn.disabled = false;
    sendCpmgBtn.style.backgroundColor = "#18eb35";
  } else {
    numberInput.disabled = false;
    numberInput.placeholder = "5585999999999";
    sendMsgBtn.disabled = false;
    sendMsgBtn.style.backgroundColor = "#18eb35";
    sendCpmgBtn.disabled = true;
    sendCpmgBtn.style.backgroundColor = "#096315";
  }
}

/*
 =========================
 ENVIAR MENSAGEM
 =========================
*/
async function sendMessage() {
  const token = localStorage.getItem("token");
  const number = document.getElementById("number").value;
  const message = document.getElementById("message").value;
  const image = document.getElementById("image").files[0];
  const result = document.getElementById("result");
  const apiUrl = window.APP_CONFIG.API_URL;

  result.innerText = "Enviando...";

  try {
    const formData = new FormData();
    formData.append("number", number);
    formData.append("message", message);

    if (image) formData.append("image", image);

    const response = await fetch(`${apiUrl}/whatsapp/send-message`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await response.json();
    result.innerText = data.success
      ? "Mensagem adicionada na fila com sucesso!"
      : "Erro ao enviar mensagem";
  } catch (error) {
    result.innerText = "Erro ao conectar com a API";
    console.error(error);
  }
}

/*
 =========================
 LISTAR GRUPOS
 =========================
*/
async function listGroups(token) {
  const groupsContainer = document.getElementById("groups");
  if (!groupsContainer) return;

  groupsContainer.innerHTML = "";
  const resultGroup = document.getElementById("resultGroup");
  const apiUrl = window.APP_CONFIG.API_URL;

  if (resultGroup) resultGroup.innerText = "Listando...";

  try {
    const response = await fetch(`${apiUrl}/whatsapp/list-groups`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();

    if (data.success && resultGroup) {
      resultGroup.innerText = "Download de lista de grupos concluído...";
    } else if (resultGroup) {
      resultGroup.innerText = "Erro ao listar grupos";
    }

    if (data.array && Array.isArray(data.array)) {
      data.array.forEach((group) => {
        const groupItem = document.createElement("div");
        groupItem.classList.add("group-item");
        groupItem.innerHTML = `
          <div class="group-left">
            <input type="checkbox" class="group-checkbox" value="${group.id}">
            <div class="group-info">
              <span class="group-name">${group.name}</span>
              <span class="group-members">${group.participants} participantes</span>
            </div>
          </div>
        `;

        const checkbox = groupItem.querySelector(".group-checkbox");
        checkbox.addEventListener("change", updateNumberInputState);
        groupsContainer.appendChild(groupItem);
      });
    }
  } catch (error) {
    if (resultGroup) resultGroup.innerText = "Erro ao conectar com a API";
    console.error(error);
  }
}

/*
 =========================
 SELECIONAR TODOS
 =========================
*/
async function toggleSelectAll() {
  const checkboxes = document.querySelectorAll(".group-checkbox");
  const allChecked = [...checkboxes].every((cb) => cb.checked);

  checkboxes.forEach((cb) => {
    cb.checked = !allChecked;
  });

  updateNumberInputState();
}

/*
 =========================
 ENVIAR CAMPANHA
 =========================
*/
async function sendCampaign() {
  const token = localStorage.getItem("token");
  const apiUrl = window.APP_CONFIG.API_URL;
  const selectedGroups = [
    ...document.querySelectorAll(".group-checkbox:checked"),
  ].map((cb) => cb.value);
  const image = document.getElementById("image").files[0];
  const result = document.getElementById("result");

  result.innerText = "Enviando Campanha...";

  try {
    const formData = new FormData();
    selectedGroups.forEach((group) => formData.append("groups", group));
    formData.append("message", document.getElementById("message").value);

    if (image) formData.append("image", image);

    const response = await fetch(`${apiUrl}/whatsapp/send-campaign`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await response.json();
    result.innerText = data.success
      ? "Campanha adicionada na fila com sucesso!"
      : "Erro ao enviar campanha";
  } catch (error) {
    result.innerText = "Erro ao conectar com a API";
    console.error(error);
  }
}
