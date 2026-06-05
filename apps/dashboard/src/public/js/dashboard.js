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
  addTimeInput();
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
        checkbox.addEventListener("change", updateDynamicFormState);
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
 MOTOR DINÂMICO DE INTERFACE
 =========================
*/
function updateDynamicFormState() {
  const numberInput = document.getElementById("number").value;
  const btn = document.getElementById("dynamicSubmitBtn");
  const title = document.getElementById("formTitle");
  const isScheduling = document.getElementById("scheduleCheck").checked;

  // Limpa e conta os números
  const numbers = numberInput
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  const checkedGroups = document.querySelectorAll(
    ".group-checkbox:checked",
  ).length;

  // Regra de Negócio: É Campanha se tiver grupos, múltiplos números ou se for um agendamento.
  const isCampaign = checkedGroups > 0 || numbers.length > 1 || isScheduling;

  if (isCampaign) {
    title.innerText = "Configurar Campanha";
    btn.innerText = isScheduling ? "Agendar Campanha" : "Enviar Campanha";
    btn.className = "btn-campaign"; // Classe do CSS para cor diferente se quiser
  } else {
    title.innerText = "Enviar Mensagem";
    btn.innerText = "Enviar Mensagem Direta";
    btn.className = "";
  }
}

/*
 =========================
 GERENCIADOR DE AGENDAMENTOS
 =========================
*/
function toggleScheduleContainer() {
  const container = document.getElementById("scheduleContainer");
  const isChecked = document.getElementById("scheduleCheck").checked;

  if (isChecked) {
    container.classList.remove("hidden");
  } else {
    container.classList.add("hidden");
  }
}

function addTimeInput() {
  const list = document.getElementById("timeInputsList");
  const row = document.createElement("div");
  row.className = "time-input-row";
  row.innerHTML = `
    <input type="datetime-local" class="schedule-time-input" />
    <button class="remove-time-btn" onclick="this.parentElement.remove()">X</button>
  `;
  list.appendChild(row);
}

/*
 =========================
 ROTEADOR DE DISPARO (SUBMIT)
 =========================
*/
async function handleDynamicSubmit() {
  const token = localStorage.getItem("token");
  const apiUrl = window.APP_CONFIG.API_URL;
  const result = document.getElementById("result");

  // Coleta de Dados Base
  const name =
    document.getElementById("campaignName").value ||
    `Campanha ${new Date().toLocaleString()}`;
  const message = document.getElementById("message").value;
  const image = document.getElementById("image").files[0];
  const isScheduling = document.getElementById("scheduleCheck").checked;
  const isTemplate = document.getElementById("saveTemplate").checked; // Pode ser tratado no backend depois

  // Coleta de Destinatários
  const rawNumbers = document
    .getElementById("number")
    .value.split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  const selectedGroups = [
    ...document.querySelectorAll(".group-checkbox:checked"),
  ].map((cb) => cb.value);
  const allRecipients = [...rawNumbers, ...selectedGroups];

  if (allRecipients.length === 0) {
    result.innerText = "Adicione um número ou selecione um grupo.";
    return;
  }
  if (!message) {
    result.innerText = "A mensagem não pode estar vazia.";
    return;
  }

  // Determina o Modo (1:1 ou Campanha/Agendamento)
  const isCampaign =
    selectedGroups.length > 0 || rawNumbers.length > 1 || isScheduling;

  try {
    result.innerText = "Processando...";

    if (isScheduling) {
      // MODO: AGENDAMENTO DE CAMPANHA (Usa JSON por causa dos arrays)
      const timeInputs = [...document.querySelectorAll(".schedule-time-input")]
        .map((inp) => inp.value)
        .filter(Boolean);

      if (timeInputs.length === 0) {
        result.innerText = "Adicione ao menos um horário para o agendamento.";
        return;
      }

      // Converte para ISO String para o backend
      const sendAtList = timeInputs.map((time) => new Date(time).toISOString());

      const payload = {
        name,
        text: message,
        recipients: allRecipients,
        sendAtList,
      };

      const response = await fetch(`${apiUrl}/schedules/campaigns`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      result.innerText = data.success
        ? "Campanha agendada com sucesso!"
        : "Erro ao agendar.";
    } else if (isCampaign) {
      // MODO: CAMPANHA IMEDIATA (Usando FormData por causa da Imagem)
      const formData = new FormData();
      allRecipients.forEach((rec) => formData.append("groups", rec)); // O backend original aceita 'groups' como array
      formData.append("message", message);
      if (image) formData.append("image", image);

      const response = await fetch(`${apiUrl}/whatsapp/send-campaign`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();
      result.innerText = data.success
        ? "Campanha iniciada com sucesso!"
        : "Erro na campanha.";
    } else {
      // MODO: MENSAGEM ÚNICA IMEDIATA
      const formData = new FormData();
      formData.append("number", rawNumbers[0]);
      formData.append("message", message);
      if (image) formData.append("image", image);

      const response = await fetch(`${apiUrl}/whatsapp/send-message`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();
      result.innerText = data.success
        ? "Mensagem enviada com sucesso!"
        : "Erro no envio.";
    }
  } catch (error) {
    result.innerText = "Erro crítico ao conectar com a API.";
    console.error(error);
  }
}

// Globaliza a função de Select All para ela também disparar a atualização de botões
async function toggleSelectAll() {
  const checkboxes = document.querySelectorAll(".group-checkbox");
  const allChecked = [...checkboxes].every((cb) => cb.checked);

  checkboxes.forEach((cb) => {
    cb.checked = !allChecked;
  });

  updateDynamicFormState();
}
