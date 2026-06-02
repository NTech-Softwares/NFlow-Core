// Mapeamento de Elementos do DOM
const schedulesGrid = document.getElementById("schedulesGrid");
const scheduleForm = document.getElementById("scheduleForm");

/**
 * 🔄 INICIALIZAÇÃO: Atrelada ao controle de navegação da SPA
 */
window.initScheduleView = async function () {
  console.log("[Scheduler View] Inicializando dados de agendamentos reais...");
  await loadSchedules();
};

// Vincula o evento de submit do formulário de forma isolada
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("scheduleForm");
  if (form) {
    form.removeEventListener("submit", handleCreateSchedule); // Evita duplicidade de listeners
    form.addEventListener("submit", handleCreateSchedule);
  }
});

/**
 * 📥 BUSCAR: Puxa os agendamentos usando os Headers de Autenticação
 */
async function loadSchedules() {
  try {
    // O backend agora identifica o usuário pelo Token enviado no Header
    const response = await fetch(`${API_URL}/schedules`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    const result = await response.json();

    if (!response.ok) throw new Error(result.error || "Erro ao buscar dados.");

    // Se o seu backend retornar o array dentro de uma propriedade 'data', usamos result.data, caso contrário result
    const schedulesList = Array.isArray(result) ? result : result.data || [];
    renderSchedules(schedulesList);
  } catch (error) {
    console.error("[Front] Erro ao carregar agendamentos:", error);
    if (schedulesGrid) {
      schedulesGrid.innerHTML = `<p class="error-msg">⚠️ Falha ao carregar agendamentos: ${error.message}</p>`;
    }
  }
}

/**
 * 🎨 RENDERIZAR: Monta o HTML dinâmico dos itens (Mantendo o Design Compacto)
 */
function renderSchedules(schedules) {
  if (!schedulesGrid) return;
  schedulesGrid.innerHTML = "";

  if (!schedules || schedules.length === 0) {
    schedulesGrid.innerHTML = `<p class="empty-msg">Nenhum agendamento pendente por aqui.</p>`;
    return;
  }

  // Clona e inverte para exibir os mais recentes primeiro
  [...schedules].reverse().forEach((schedule) => {
    const card = document.createElement("div");
    card.className = `schedule-card status-${schedule.status}`;

    const dateOptions = {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    };
    const formattedDate = new Date(schedule.scheduledAt).toLocaleDateString(
      "pt-BR",
      dateOptions,
    );

    const deleteButton =
      schedule.status === "pending"
        ? `<button class="btn-delete" onclick="handleDeleteSchedule('${schedule.id}')"><i class="fas fa-times"></i> Cancelar</button>`
        : "";

    // Truncamento seguro da primeira linha da mensagem
    const messageText = schedule.message?.text || schedule.text || "";
    const cleanFirstLine = messageText.split("\n")[0] || "";

    // Formata o número de destino para exibição limpa
    const displayPhone = schedule.remoteJid
      ? schedule.remoteJid.split("@")[0]
      : "Desconhecido";

    card.innerHTML = `
            <div>
                <div class="schedule-header">
                    <span class="schedule-target">
                        <i class="fas fa-user"></i> ${displayPhone}
                    </span>
                    <span class="status-badge ${schedule.status}">${translateStatus(schedule.status)}</span>
                </div>
                <div class="schedule-body">${escapeHTML(cleanFirstLine)}</div>
            </div>
            <div class="schedule-footer">
                <span class="schedule-time">
                    <i class="fas fa-clock"></i> ${formattedDate}
                </span>
                ${deleteButton}
            </div>
        `;

    schedulesGrid.appendChild(card);
  });
}

/**
 * ➕ CRIAR: Dispara o POST injetando getAuthHeaders()
 */
async function handleCreateSchedule(event) {
  event.preventDefault();

  const remoteJidInput = document.getElementById("remoteJid");
  const scheduledAtInput = document.getElementById("scheduledAt");
  const textInput = document.getElementById("messageText");

  if (!remoteJidInput || !scheduledAtInput || !textInput) return;

  let jid = remoteJidInput.value.trim();
  if (!jid.endsWith("@s.whatsapp.net") && !jid.endsWith("@g.us")) {
    jid = `${jid}@s.whatsapp.net`;
  }

  // Payload limpo: sem propriedades mockadas de User ou Session
  const payload = {
    remoteJid: jid,
    text: textInput.value,
    scheduledAt: new Date(scheduledAtInput.value).toISOString(),
  };

  try {
    const response = await fetch(`${API_URL}/schedules`, {
      method: "POST",
      headers: getAuthHeaders(), // Fornece Content-Type e Authorization Bearer Token
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok)
      throw new Error(result.error || "Erro ao registrar agendamento.");

    // Reseta o formulário e atualiza a fila
    scheduleForm.reset();
    await loadSchedules();
  } catch (error) {
    alert(`❌ Erro ao agendar: ${error.message}`);
  }
}

/**
 * ❌ REMOVER: Dispara o DELETE na rota REST padrão utilizando o Token
 */
async function handleDeleteSchedule(scheduleId) {
  if (!confirm("Tem certeza que deseja cancelar este agendamento?")) return;

  try {
    const response = await fetch(`${API_URL}/schedules/${scheduleId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    const result = await response.json();

    if (!response.ok) throw new Error(result.error || "Erro ao cancelar.");

    // Atualiza a listagem imediatamente
    await loadSchedules();
  } catch (error) {
    alert(`❌ Erro ao cancelar: ${error.message}`);
  }
}

/**
 * Auxiliares estruturais de tratamento de dados
 */
function translateStatus(status) {
  const translations = {
    pending: "Pendente",
    sent: "Enviado",
    canceled: "Cancelado",
    failed: "Falhou",
  };
  return translations[status] || status;
}

function escapeHTML(str) {
  return str.replace(
    /[&<>'"]/g,
    (tag) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        tag
      ] || tag,
  );
}
