const pendingSchedulesGrid = document.getElementById("pendingSchedulesGrid");
const historySchedulesGrid = document.getElementById("historySchedulesGrid");
const scheduleForm = document.getElementById("scheduleForm");

/**
 * 🔄 INICIALIZAÇÃO SPA
 */
window.initScheduleView = async function () {
  console.log("[Scheduler View] Inicializando dados de agendamentos reais...");
  await window.refreshScheduleView();
};

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("scheduleForm");
  if (form) {
    form.removeEventListener("submit", handleCreateSchedule);
    form.addEventListener("submit", handleCreateSchedule);
  }
});

/**
 * 📥 ASSINATURA GLOBAL: O motor de Polling chama esta função a cada 5s
 */
window.refreshScheduleView = async function () {
  window.showGlobalRefreshIndicator(); // 🚀 Liga o relógio global
  try {
    const response = await fetch(`${API_URL}/schedules`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    const result = await response.json();

    if (!response.ok) throw new Error(result.error || "Erro ao buscar dados.");

    const schedulesList = Array.isArray(result) ? result : result.data || [];
    renderSchedules(schedulesList);
  } catch (error) {
    console.error("[Front] Erro ao carregar agendamentos:", error);
    const errorHTML = `<p class="error-msg">⚠️ Falha ao carregar agendamentos: ${error.message}</p>`;
    if (pendingSchedulesGrid) pendingSchedulesGrid.innerHTML = errorHTML;
    if (historySchedulesGrid) historySchedulesGrid.innerHTML = errorHTML;
  } finally {
    window.hideGlobalRefreshIndicator(); // 🔒 Desliga o relógio global
  }
};

/**
 * 🎨 RENDERIZAR: Divide e distribui as mensagens nos seus respectivos Cards
 */
function renderSchedules(schedules) {
  if (!pendingSchedulesGrid || !historySchedulesGrid) return;

  pendingSchedulesGrid.innerHTML = "";
  historySchedulesGrid.innerHTML = "";

  const safeSchedules = schedules || [];

  const pendingList = safeSchedules.filter((s) => s.status === "pending");
  const historyList = safeSchedules.filter((s) => s.status !== "pending");

  // --- RENDER CARD PENDENTES ---
  if (pendingList.length === 0) {
    pendingSchedulesGrid.innerHTML = `<p class="empty-msg">Nenhum agendamento pendente por aqui.</p>`;
  } else {
    [...pendingList].reverse().forEach((schedule) => {
      pendingSchedulesGrid.appendChild(createScheduleCard(schedule));
    });
  }

  // --- RENDER CARD HISTÓRICO ---
  if (historyList.length === 0) {
    historySchedulesGrid.innerHTML = `<p class="empty-msg">Nenhum envio registrado no histórico.</p>`;
  } else {
    [...historyList].reverse().forEach((schedule) => {
      historySchedulesGrid.appendChild(createScheduleCard(schedule));
    });
  }
}

/**
 * 🗂️ AUXILIAR: Monta o componente de Card individual
 */
function createScheduleCard(schedule) {
  const card = document.createElement("div");
  card.className = `schedule-card status-${schedule.status}`;

  const dateOptions = {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  };

  const targetDate = schedule.scheduledAt || schedule.send_at;
  const formattedDate = targetDate
    ? new Date(targetDate).toLocaleDateString("pt-BR", dateOptions)
    : "--/--";

  const deleteButton =
    schedule.status === "pending"
      ? `<button class="btn-delete" onclick="handleDeleteSchedule('${schedule.id}')"><i class="fas fa-times"></i> Cancelar</button>`
      : "";

  const messageText = schedule.message?.text || schedule.text || "";
  const cleanFirstLine = messageText.split("\n")[0] || "";
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
  return card;
}

/**
 * ➕ CRIAR: Dispara o POST e recarrega usando a assinatura global
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

  const payload = {
    remoteJid: jid,
    text: textInput.value,
    scheduledAt: new Date(scheduledAtInput.value).toISOString(),
  };

  try {
    const response = await fetch(`${API_URL}/schedules`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok)
      throw new Error(result.error || "Erro ao registrar agendamento.");

    scheduleForm.reset();
    await window.refreshScheduleView();
  } catch (error) {
    alert(`❌ Erro ao agendar: ${error.message}`);
  }
}

/**
 * ❌ REMOVER: Dispara o DELETE e recarrega usando a assinatura global
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

    await window.refreshScheduleView();
  } catch (error) {
    alert(`❌ Erro ao cancelar: ${error.message}`);
  }
}

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
