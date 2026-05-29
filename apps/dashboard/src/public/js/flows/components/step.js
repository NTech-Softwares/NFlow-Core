function createStepHTML(flow, step) {
  const messageText = step.message || "<em>Sem mensagem configurada.</em>";

  return `
    <div class="tree-step" id="step-container-${flow.id}-${step.id}">
      
      <div class="tree-step-header">
        <span class="step-indicator-line"></span>
        <div class="tree-step-id">
          <span class="step-tag">STEP</span> <strong>${step.id}</strong>
        </div>
        
        <button 
          type="button" 
          class="btn-toggle-message"
          onclick="toggleStepMessage('${flow.id}', '${step.id}')"
          id="btn-msg-${flow.id}-${step.id}"
        >
          💬 Ocultar Mensagem ▲
        </button>
      </div>

      <div class="step-message-box" id="msg-box-${flow.id}-${step.id}">
        <div class="whatsapp-preview-wrapper">
          <div class="whatsapp-preview">${messageText}</div>
          
          <button 
            type="button" 
            class="btn-edit-message"
            data-flow="${flow.id}"
            data-step="${step.id}"
            onclick="handleEditMessage('${flow.id}', '${step.id}')"
            title="Editar mensagem"
          >
            ✏️ Editar
          </button>
        </div>
      </div>

      <div class="tree-options-title">Direcionamento de Opções:</div>
      <div class="tree-options">
        ${
          step.options?.length
            ? step.options
                .map((option) => createOptionHTML(flow, step, option))
                .join("")
            : createEmptyOptionHTML()
        }
      </div>

    </div>
  `;
}

// Variáveis de controle de estado do Modal de Edição
let activeEditingFlowId = null;
let activeEditingStepId = null;

/**
 * Disparado ao clicar no botão "✏️ Editar" de dentro do balão do WhatsApp.
 * Captura o texto atual direto do DOM e injeta dentro do textarea do modal.
 */
function handleEditMessage(flowId, stepId) {
  activeEditingFlowId = flowId;
  activeEditingStepId = stepId;

  const modal = document.getElementById("message-edit-modal");
  const textarea = document.getElementById("modal-message-input");
  const saveBtn = document.getElementById("btn-modal-save");

  // Localiza o container da mensagem atual gerada na tela
  const currentMessageElement = document.querySelector(
    `#msg-box-${flowId}-${stepId} .whatsapp-preview`,
  );

  if (currentMessageElement) {
    // AJUSTE 1: Se o balão contiver o HTML de fallback, abre o textarea vazio
    if (
      currentMessageElement.innerHTML.includes(
        "<em>Sem mensagem configurada.</em>",
      )
    ) {
      textarea.value = "";
    } else {
      textarea.value = currentMessageElement.innerText;
    }
  }

  // Exibe o card flutuante na tela
  modal.classList.remove("hidden");

  // Atribui o clique dinamicamente para passar o valor limpo
  saveBtn.onclick = async () => {
    await saveMessageRoute(flowId, stepId, textarea.value.trim());
  };
}

/**
 * Fecha o modal flutuante e limpa os ponteiros de ID ativos.
 */
function closeEditModal() {
  const modal = document.getElementById("message-edit-modal");
  modal.classList.add("hidden");
  activeEditingFlowId = null;
  activeEditingStepId = null;
}

/**
 * Envia o novo texto para a API e altera o DOM reativamente caso obtenha sucesso.
 */
async function saveMessageRoute(flowId, stepId, updatedText) {
  const token = localStorage.getItem("token");
  const saveBtn = document.getElementById("btn-modal-save");

  // Feedback visual de carregamento
  const originalBtnText = saveBtn.innerHTML;
  saveBtn.innerHTML = "Salvando...";
  saveBtn.disabled = true;

  try {
    const response = await fetch(`${API_URL}/flows/update-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        flowId: flowId,
        stepId: stepId,
        newMessage: updatedText,
      }),
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    // --- ATUALIZAÇÃO EM TEMPO REAL SEM RECARREGAR (DOM Manipulation) ---
    const targetPreviewDOM = document.querySelector(
      `#msg-box-${flowId}-${stepId} .whatsapp-preview`,
    );

    if (targetPreviewDOM) {
      // AJUSTE 2: Se o usuário limpou o texto, recoloca o fallback visual
      if (!updatedText) {
        targetPreviewDOM.innerHTML = "<em>Sem mensagem configurada.</em>";
      } else {
        targetPreviewDOM.innerText = updatedText;
      }
    }

    closeEditModal();
  } catch (error) {
    console.error("Falha ao salvar a nova mensagem do fluxo:", error);
    alert(
      "Não foi possível salvar as alterações. Verifique o console ou a conexão.",
    );
  } finally {
    saveBtn.innerHTML = originalBtnText;
    saveBtn.disabled = false;
  }
}

function toggleStepMessage(flowId, stepId) {
  const msgBox = document.getElementById(`msg-box-${flowId}-${stepId}`);
  const btn = document.getElementById(`btn-msg-${flowId}-${stepId}`);

  if (msgBox.classList.contains("collapsed")) {
    msgBox.classList.remove("collapsed");
    btn.innerHTML = "💬 Ocultar Mensagem ▲";
    btn.classList.add("active");
  } else {
    msgBox.classList.add("collapsed");
    btn.innerHTML = "💬 Ver Mensagem ▼";
    btn.classList.remove("active");
  }
}
