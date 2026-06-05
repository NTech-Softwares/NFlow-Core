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
  // Apenas puxa o primeiro carregamento imediato ao entrar na tela
  await window.refreshAttendanceView();
};

/**
 * 🟢 ASSINATURA GLOBAL: O Motor de Polling vai chamar esta função a cada 5s
 */
window.refreshAttendanceView = async function () {
  window.showGlobalRefreshIndicator(); // 🚀 Liga o relógio global
  const token = localStorage.getItem("token");
  const apiUrl = window.APP_CONFIG.API_URL;

  const waitingContainer = document.getElementById("waiting-queue");
  const activeContainer = document.getElementById("active-queue");
  const botContainer = document.getElementById("bot-queue");

  if (!waitingContainer || !activeContainer) return;

  // Só mostra mensagem de "Carregando" se a lista estiver totalmente vazia (primeiro load)
  // Evita o efeito chato de "piscar" a tela a cada 5 segundos
  if (waitingContainer.children.length === 0) {
    waitingContainer.innerHTML =
      '<p class="result-feedback">Carregando fila...</p>';
  }
  if (activeContainer.children.length === 0) {
    activeContainer.innerHTML =
      '<p class="result-feedback">Carregando conversas...</p>';
  }
  if (botContainer.children.length === 0) {
    botContainer.innerHTML =
      '<p class="result-feedback">Carregando conversas...</p>';
  }

  try {
    const response = await fetch(`${apiUrl}/attendance/sessions`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Erro ao buscar sessões do servidor.");

    const data = await response.json();
    const sessions = data.sessions || [];

    waitingContainer.innerHTML = "";
    activeContainer.innerHTML = "";
    botContainer.innerHTML = "";

    const waitingLeads = sessions.filter((s) => s.atendimento === "em_espera");
    const activeLeads = sessions.filter(
      (s) => s.atendimento === "humano" || s.atendimento === "em_atendimento",
    );
    const botLeads = sessions.filter((s) => s.atendimento === "automatico");

    if (waitingLeads.length !== 0) {
      waitingContainer.innerHTML =
        '<p class="result-feedback" style="opacity: 0.5;">Ninguém aguardando na fila. 🙌</p>';
    } else {
      waitingLeads.forEach((lead) => {
        waitingContainer.appendChild(createLeadCard(lead, "waiting"));
      });
    }

    if (activeLeads.length === 0) {
      activeContainer.innerHTML =
        '<p class="result-feedback" style="opacity: 0.5;">Nenhum atendimento ativo no momento. 💆‍♀️</p>';
    } else {
      activeLeads.forEach((lead) => {
        activeContainer.appendChild(createLeadCard(lead, "active"));
      });
    }

    if (botLeads.length === 0) {
      botContainer.innerHTML =
        '<p class="result-feedback" style="opacity: 0.5;">Nenhum atendimento na fila do bot. 🤖</p>';
    } else {
      botLeads.forEach((lead) => {
        botContainer.appendChild(createLeadCard(lead, "waiting"));
      });
    }
  } catch (error) {
    console.error("[Attendance Error]:", error);
  } finally {
    window.hideGlobalRefreshIndicator(); // 🔒 Desliga o relógio global
  }
};

/**
 * Consome a API para listar todas as sessões e renderiza nas respectivas colunas
 */
async function loadAttendanceSessions() {
  const token = localStorage.getItem("token");
  const apiUrl = window.APP_CONFIG.API_URL;

  const waitingContainer = document.getElementById("waiting-queue");
  const activeContainer = document.getElementById("active-queue");

  if (!waitingContainer || !activeContainer) return;

  if (waitingContainer.children.length === 0) {
    waitingContainer.innerHTML =
      '<p class="result-feedback">Carregando fila...</p>';
  }
  if (activeContainer.children.length === 0) {
    activeContainer.innerHTML =
      '<p class="result-feedback">Carregando conversas...</p>';
  }

  try {
    const response = await fetch(`${apiUrl}/attendance/sessions`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Erro ao buscar sessões do servidor.");

    const data = await response.json();
    const sessions = data.sessions || [];

    waitingContainer.innerHTML = "";
    activeContainer.innerHTML = "";

    const waitingLeads = sessions.filter((s) => s.atendimento === "em_espera");
    const activeLeads = sessions.filter(
      (s) => s.atendimento === "humano" || s.atendimento === "em_atendimento",
    );

    if (waitingLeads.length === 0) {
      waitingContainer.innerHTML =
        '<p class="result-feedback" style="opacity: 0.5;">Ninguém aguardando na fila. 🙌</p>';
    } else {
      waitingLeads.forEach((lead) => {
        waitingContainer.appendChild(createLeadCard(lead, "waiting"));
      });
    }

    if (activeLeads.length === 0) {
      activeContainer.innerHTML =
        '<p class="result-feedback" style="opacity: 0.5;">Nenhum atendimento ativo no momento. 🤖</p>';
    } else {
      activeLeads.forEach((lead) => {
        activeContainer.appendChild(createLeadCard(lead, "active"));
      });
    }
  } catch (error) {
    if (waitingContainer.children.length === 0) {
      waitingContainer.innerHTML =
        '<p class="result-feedback">Erro ao sincronizar dados.</p>';
    }
    if (activeContainer.children.length === 0) {
      activeContainer.innerHTML =
        '<p class="result-feedback">Erro ao sincronizar dados.</p>';
    }
    console.error("[Attendance Error]:", error);
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

  // position: relative para ancorar o balãozinho absolute sem quebrar o fluxo do card
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

  // btnBaseStyle inclui 'justify-content: center' para alinhar os elementos (ícone + texto) perfeitamente
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

/**
 * [Mover status] -> Altera o estado do lead na fila (ex: mover para em_atendimento)
 */
async function changeLeadStatus(remoteJid, newStatus) {
  const token = localStorage.getItem("token");
  const apiUrl = window.APP_CONFIG.API_URL;

  try {
    const response = await fetch(`${apiUrl}/attendance/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ remoteJid, status: newStatus }),
    });

    if (response.ok) {
      await loadAttendanceSessions();
    } else {
      alert("Erro ao alterar status do atendimento.");
    }
  } catch (error) {
    console.error(error);
  }
}

/**
 * [Devolver para o Bot] -> Encerra a sessão humana e joga o fluxo de volta para a automação
 */
async function closeLeadAttendance(remoteJid) {
  const token = localStorage.getItem("token");
  const apiUrl = window.APP_CONFIG.API_URL;

  if (
    !confirm(
      "Deseja encerrar o atendimento humano e reativar o Robô Automático para este cliente?",
    )
  ) {
    return;
  }

  try {
    const response = await fetch(`${apiUrl}/attendance/close`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ remoteJid }),
    });

    if (response.ok) {
      await loadAttendanceSessions();
    } else {
      alert("Erro ao devolver atendimento para o Robô.");
    }
  } catch (error) {
    console.error(error);
  }
}

/**
 * [Transferir Atendimento] -> Pergunta para qual operador/setor deseja mover o cliente
 */
async function transferLeadAttendance(remoteJid) {
  const token = localStorage.getItem("token");
  const apiUrl = window.APP_CONFIG.API_URL;

  const targetOperator = prompt(
    "Digite o ID do operador ou o nome do Setor/Fila destino:",
  );
  if (!targetOperator || targetOperator.trim() === "") return;

  try {
    const response = await fetch(`${apiUrl}/attendance/transfer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ remoteJid, target: targetOperator.trim() }),
    });

    if (response.ok) {
      alert("Atendimento transferido com sucesso!");
      await loadAttendanceSessions();
    } else {
      alert("Erro ao transferir atendimento. Verifique o destino informado.");
    }
  } catch (error) {
    console.error("[Transfer Error]:", error);
  }
}

/**
 * [Excluir Atendimento] -> Remove o registro da listagem ativa do painel
 */
async function deleteLeadAttendance(remoteJid) {
  const token = localStorage.getItem("token");
  const apiUrl = window.APP_CONFIG.API_URL;

  if (
    !confirm(
      "Atenção: Deseja realmente remover este atendimento do painel? O histórico local desse chat será perdido.",
    )
  ) {
    return;
  }

  try {
    const response = await fetch(`${apiUrl}/attendance/sessions/${remoteJid}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      await loadAttendanceSessions();
    } else {
      alert("Erro ao excluir o atendimento do servidor.");
    }
  } catch (error) {
    console.error("[Delete Error]:", error);
  }
}
