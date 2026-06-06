function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * 🔄 INICIALIZAÇÃO SPA
 */
window.initAttendanceView = async function () {
  console.log("[Attendance] Inicializando painel de atendimento humano...");
  // Passa true na primeira inicialização para mostrar o texto "Carregando..."
  await window.refreshAttendanceView(true);
};

/**
 * 🟢 ASSINATURA GLOBAL: Motor de Polling (a cada 5s) e de Ações Manuais
 * @param {boolean} isInitialLoad - Se for true, exibe a mensagem "Carregando conversas" se a fila estiver vazia.
 */
window.refreshAttendanceView = async function (isInitialLoad = false) {
  window.showGlobalRefreshIndicator(); // 🚀 Liga o relógio global
  const token = localStorage.getItem("token");
  const apiUrl = window.APP_CONFIG.API_URL;

  const queues = {
    waiting: document.getElementById("waiting-queue"),
    active: document.getElementById("active-queue"),
    bot: document.getElementById("bot-queue"),
  };

  if (!queues.waiting || !queues.active || !queues.bot) return;

  // Mostra "Carregando" apenas se for o load inicial e as colunas estiverem vazias
  if (isInitialLoad) {
    Object.values(queues).forEach((container) => {
      if (container.children.length === 0) {
        container.innerHTML =
          '<p class="result-feedback">Carregando conversas...</p>';
      }
    });
  }

  try {
    const response = await fetch(`${apiUrl}/attendance/sessions`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Erro ao buscar sessões do servidor.");

    const data = await response.json();
    const sessions = data.sessions || [];

    // Renderiza cada coluna usando a função auxiliar
    renderQueue(
      queues.waiting,
      sessions.filter((s) => s.atendimento === "em_espera"),
      "waiting",
      "Ninguém aguardando na fila. 🙌",
    );
    renderQueue(
      queues.active,
      sessions.filter(
        (s) => s.atendimento === "humano" || s.atendimento === "em_atendimento",
      ),
      "active",
      "Nenhum atendimento ativo no momento. 💆‍♀️",
    );
    renderQueue(
      queues.bot,
      sessions.filter((s) => s.atendimento === "automatico"),
      "automatico",
      "Nenhum atendimento na fila do bot. 🤖",
    );
  } catch (error) {
    console.error("[Attendance Error]:", error);
    if (isInitialLoad) {
      Object.values(queues).forEach((container) => {
        if (container.children.length === 0)
          container.innerHTML =
            '<p class="result-feedback">Erro ao sincronizar dados.</p>';
      });
    }
  } finally {
    window.hideGlobalRefreshIndicator(); // 🔒 Desliga o relógio global
  }
};

/**
 * Utilitário para limpar e popular uma coluna de forma dinâmica
 */
function renderQueue(container, leads, context, emptyMessage) {
  container.innerHTML = "";
  if (leads.length === 0) {
    container.innerHTML = `<p class="result-feedback" style="opacity: 0.5;">${emptyMessage}</p>`;
  } else {
    leads.forEach((lead) => {
      container.appendChild(createLeadCard(lead, context));
    });
  }
}

// Injeção dinâmica de CSS para garantir o empilhamento perfeito em telas menores
if (!document.getElementById("attendance-dynamic-styles")) {
  const style = document.createElement("style");
  style.id = "attendance-dynamic-styles";
  style.innerHTML = `
    @media (max-width: 576px) {
      .attendance-btn-group {
        flex-direction: column !important;
        align-items: stretch !important;
      }
      .attendance-btn-group button {
        width: 100% !important;
      }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Fábrica de componentes de UI com ações completas
 */
function createLeadCard(lead, context) {
  const card = document.createElement("div");
  card.classList.add("group-item");

  card.style.display = "flex";
  card.style.flexDirection = "column";
  card.style.alignItems = "stretch";
  card.style.padding = "16px";
  card.style.marginBottom = "12px";
  card.style.background = "#171717";
  card.style.border = "1px solid #262626";
  card.style.borderRadius = "12px";
  card.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.3)";
  card.style.position = "relative";

  const lastUpdate = lead.updatedAt
    ? new Date(lead.updatedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";

  const phoneFormatted = lead.remoteJid
    ? lead.remoteJid.split("@")[0]
    : "Desconhecido";
  const safeName = escapeHtml(lead.pushName || "Cliente sem Nome");
  const safeMessage = escapeHtml(
    lead.lastMessage || "Nenhuma mensagem enviada",
  );

  const btnBaseStyle = `
    padding: 8px 14px; 
    font-size: 0.85rem; 
    border-radius: 6px; 
    font-weight: 600; 
    cursor: pointer; 
    display: inline-flex; 
    align-items: center; 
    justify-content: center;
    gap: 6px; 
    transition: all 0.2s ease; 
    margin: 0;
  `;

  card.innerHTML = `
    ${
      context === "active"
        ? `<span style="position: absolute; top: 14px; right: 14px; background: rgba(24, 235, 53, 0.1); color: #18eb35; border: 1px solid rgba(24, 235, 53, 0.25); padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: bold; display: flex; align-items: center; gap: 5px; text-transform: uppercase; letter-spacing: 0.5px;">
             <span style="width: 6px; height: 6px; background-color: #18eb35; border-radius: 50%; display: inline-block;"></span>
             Em Atendimento
           </span>`
        : `<span style="position: absolute; top: 14px; right: 14px; background: rgba(255, 255, 255, 0.05); color: #a0a0a0; border: 1px solid rgba(255, 255, 255, 0.1); padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: bold; display: flex; align-items: center; text-transform: uppercase; letter-spacing: 0.5px;">
             Fila
           </span>`
    }

    <div class="group-left" style="width: 100%; padding-right: 90px;">
      <div class="group-info" style="display: flex; flex-direction: column; gap: 4px;">
        <span class="group-name" style="font-weight: bold; color: #fff; font-size: 1rem; display: flex; align-items: center; flex-wrap: wrap; gap: 6px;">
          ${safeName} 
          <span style="font-size: 0.8rem; font-weight: normal; color: #a0a0a0;">(${phoneFormatted})</span>
        </span>
        
        <span class="group-members" style="word-break: break-word; white-space: normal; display: block; width: 100%; color: #d1d5db; line-height: 1.5; margin: 6px 0;">
          <strong style="color: #8f8f8f;">Última:</strong> ${safeMessage}
        </span>
        
        <span class="group-members" style="font-size: 0.75rem; color: #707070;">
          Última interação às ${lastUpdate}
        </span>
      </div>
    </div>

    <div class="btn-group attendance-btn-group" style="gap: 8px; display: flex; align-items: center; justify-content: flex-end; margin-top: 14px; padding-top: 12px; border-top: 1px solid #262626; width: 100%;">
      
      ${
        context === "waiting"
          ? `<button style="${btnBaseStyle} background: rgba(24, 235, 53, 0.1); border: 1px solid rgba(24, 235, 53, 0.3); color: #18eb35;" onclick="changeLeadStatus('${lead.remoteJid}', 'em_atendimento')">
               <i class="fas fa-handshake"></i> Atender
             </button>`
          : ""
      }
      
      ${
        context === "active"
          ? `<button style="${btnBaseStyle} background: rgba(255, 159, 67, 0.1); border: 1px solid rgba(255, 159, 67, 0.3); color: #ff9f43;" title="Transferir Atendimento" onclick="transferLeadAttendance('${lead.remoteJid}')">
               <i class="fas fa-exchange-alt"></i> Transferir
             </button>
             <button style="${btnBaseStyle} background: rgba(0, 207, 232, 0.1); border: 1px solid rgba(0, 207, 232, 0.3); color: #00cfe8;" title="Devolver para o Bot" onclick="closeLeadAttendance('${lead.remoteJid}')">
               <i class="fas fa-robot"></i> Devolver
             </button>`
          : ""
      }

      <button style="${btnBaseStyle} background: rgba(235, 24, 24, 0.1); border: 1px solid rgba(235, 24, 24, 0.3); color: #ff4d4d;" title="Excluir Atendimento" onclick="deleteLeadAttendance('${lead.remoteJid}')">
        <i class="fas fa-trash-alt"></i> Excluir
      </button>
    </div>
  `;

  return card;
}

/* ======================================================================
   🔥 API HELPERS E AÇÕES
   ====================================================================== */

/**
 * Utilitário centralizado para evitar boilerplate de fetch nas ações
 */
async function sendAttendanceAction(
  endpoint,
  method = "POST",
  body = null,
  successMsg = null,
) {
  const token = localStorage.getItem("token");
  const apiUrl = window.APP_CONFIG.API_URL;

  const options = {
    method,
    headers: { Authorization: `Bearer ${token}` },
  };

  if (body) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${apiUrl}${endpoint}`, options);
    if (response.ok) {
      if (successMsg) alert(successMsg);
      await window.refreshAttendanceView(false); // Recarrega a fila sem "piscar" a tela
    } else {
      alert("Erro ao realizar a operação no servidor.");
    }
  } catch (error) {
    console.error(`[API Action Error - ${endpoint}]:`, error);
    alert("Erro de comunicação com o servidor.");
  }
}

/**
 * [Mover status] -> Altera o estado do lead na fila
 */
function changeLeadStatus(remoteJid, newStatus) {
  sendAttendanceAction("/attendance/status", "POST", {
    remoteJid,
    status: newStatus,
  });
}

/**
 * [Devolver para o Bot] -> Encerra a sessão humana e volta para automação
 */
function closeLeadAttendance(remoteJid) {
  if (
    confirm(
      "Deseja encerrar o atendimento humano e reativar o Robô Automático para este cliente?",
    )
  ) {
    sendAttendanceAction("/attendance/close", "POST", { remoteJid });
  }
}

/**
 * [Transferir Atendimento] -> Pergunta para qual operador/setor deseja mover
 */
function transferLeadAttendance(remoteJid) {
  const targetOperator = prompt(
    "Digite o ID do operador ou o nome do Setor/Fila destino:",
  );
  if (targetOperator && targetOperator.trim() !== "") {
    sendAttendanceAction(
      "/attendance/transfer",
      "POST",
      { remoteJid, target: targetOperator.trim() },
      "Atendimento transferido com sucesso!",
    );
  }
}

/**
 * [Excluir Atendimento] -> Remove o registro da listagem ativa do painel
 */
function deleteLeadAttendance(remoteJid) {
  if (
    confirm(
      "Atenção: Deseja realmente remover este atendimento do painel? O histórico local desse chat será perdido.",
    )
  ) {
    sendAttendanceAction(`/attendance/sessions/${remoteJid}`, "DELETE");
  }
}
