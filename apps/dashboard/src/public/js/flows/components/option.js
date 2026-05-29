function createOptionHTML(flow, step, option) {
  const isBackOption = String(option.key) === "0";
  const selectedFlow = option.nextFlow || "";
  const selectedStep = option.nextStep || "inicio";

  if (isBackOption) {
    return `
      <div class="tree-option back-option" data-flow="${flow.id}" data-step="${step.id}" data-option="${option.key}">
        <div class="option-badge option-badge-zero">0</div>
        <div class="option-human-text">↩ Voltar para o Início (Menu Principal)</div>
      </div>
    `;
  }

  const isCustomStep = selectedStep !== "inicio";

  return `
    <div class="tree-option" data-flow="${flow.id}" data-step="${step.id}" data-option="${option.key}">
      
      <div class="option-left-side">
        <span class="option-connector-text">Se digitar</span>
        <div class="option-badge">${option.key}</div>
        <span class="option-connector-text">levar para o fluxo</span>
      </div>

      <div class="option-right-side">
        ${createFlowSelect(selectedFlow, flow.id, step.id, option.key)}
        
        <div class="step-select-container ${isCustomStep ? "" : "hidden"}" id="step-container-${flow.id}-${step.id}-${option.key}">
          <span class="option-connector-text">no estágio</span>
          ${createStepSelect(selectedFlow, selectedStep)}
        </div>

        <button 
          type="button" 
          class="btn-toggle-step-select ${isCustomStep ? "active" : ""}" 
          title="Mudar estágio específico"
          onclick="toggleCustomStepSelect('${flow.id}', '${step.id}', '${option.key}')"
        >
          ⚙️
        </button>

        <button 
          type="button" 
          class="btn-delete-option" 
          title="Remover opção"
          onclick="deleteOptionRoute('${flow.id}', '${step.id}', '${option.key}', this)"
        >
          ✕
        </button>
      </div>

    </div>
  `;
}

function createFlowSelect(selectedFlow, flowId, stepId, optionKey) {
  const flows = window.flowsData || [];

  return `
    <select class="flow-select" onchange="handleFlowChangeModern(this, '${flowId}', '${stepId}', '${optionKey}')">
      <option value="">Selecione o Fluxo...</option>
      ${flows
        .map(
          (flow) => `
          <option value="${flow.id}" ${selectedFlow === flow.id ? "selected" : ""}>
            ${flow.id}
          </option>
        `,
        )
        .join("")}
    </select>
  `;
}

function createStepSelect(flowId, selectedStep) {
  const flows = window.flowsData || [];
  const flow = flows.find((item) => item.id === flowId);
  const steps = flow ? flow.steps : [];

  return `
    <select class="step-select">
      <option value="inicio">inicio (Padrão)</option>
      ${steps
        .filter((s) => s.id !== "inicio")
        .map(
          (step) => `
          <option value="${step.id}" ${selectedStep === step.id ? "selected" : ""}>
            ${step.id}
          </option>
        `,
        )
        .join("")}
    </select>
  `;
}

function createEmptyOptionHTML() {
  return `
    <div class="tree-empty">
      Nenhum direcionamento configurado para este passo.
    </div>
  `;
}

/**
 * Exibe ou esconde o seletor de passos específicos (Configuração avançada)
 */
function toggleCustomStepSelect(flowId, stepId, optionKey) {
  const container = document.getElementById(
    `step-container-${flowId}-${stepId}-${optionKey}`,
  );
  const btn = container.parentElement.querySelector(".btn-toggle-step-select");

  if (container.classList.contains("hidden")) {
    container.classList.remove("hidden");
    btn.classList.add("active");
  } else {
    container.classList.add("hidden");
    btn.classList.remove("active");

    const select = container.querySelector(".step-select");
    if (select) select.value = "inicio";
  }
}

/**
 * Atualiza dinamicamente os passos quando o fluxo muda
 */
function handleFlowChangeModern(selectElement, flowId, stepId, optionKey) {
  const nextFlowId = selectElement.value;
  const container = document.getElementById(
    `step-container-${flowId}-${stepId}-${optionKey}`,
  );
  const stepSelect = container.querySelector(".step-select");

  if (!nextFlowId) {
    stepSelect.innerHTML = '<option value="inicio">inicio (Padrão)</option>';
    stepSelect.disabled = true;
    return;
  }

  stepSelect.disabled = false;
  const flows = window.flowsData || [];
  const targetFlow = flows.find((f) => f.id === nextFlowId);
  const steps = targetFlow ? targetFlow.steps : [];

  stepSelect.innerHTML = `
    <option value="inicio">inicio (Padrão)</option>
    ${steps
      .filter((s) => s.id !== "inicio")
      .map((s) => `<option value="${s.id}">${s.id}</option>`)
      .join("")}
  `;
}

/**
 * Adiciona uma nova opção em tempo real buscando o próximo número livre (1-9)
 */
function addOptionRow(flowId, stepId) {
  const optionsContainer = document.getElementById(
    `options-list-${flowId}-${stepId}`,
  );
  const existingRows = optionsContainer.querySelectorAll(".tree-option");

  const usedKeys = Array.from(existingRows).map((row) =>
    row.getAttribute("data-option"),
  );

  let nextAvailableKey = null;
  for (let i = 1; i <= 9; i++) {
    if (!usedKeys.includes(String(i))) {
      nextAvailableKey = String(i);
      break;
    }
  }

  if (!nextAvailableKey) {
    alert("Limite máximo de opções (1 a 9) atingido para este passo.");
    return;
  }

  const emptyMessage = optionsContainer.querySelector(".tree-empty");
  if (emptyMessage) emptyMessage.remove();

  const mockFlow = { id: flowId };
  const mockStep = { id: stepId };
  const mockOption = {
    key: nextAvailableKey,
    nextFlow: "",
    nextStep: "inicio",
  };

  const newOptionHTML = createOptionHTML(mockFlow, mockStep, mockOption);
  optionsContainer.insertAdjacentHTML("beforeend", newOptionHTML);

  // CORREÇÃO: i não estava acessível fora do loop, mudei para verificar o tamanho real do array de chaves usadas
  if (usedKeys.length + 1 >= 9) {
    const addBtn = document.getElementById(`btn-add-opt-${flowId}-${stepId}`);
    if (addBtn) addBtn.style.display = "none";
  }
}

/**
 * Remove a linha da tela (Integração visual com o seu backend de exclusão)
 */
function deleteOptionRoute(flowId, stepId, optionKey, buttonElement) {
  if (confirm(`Deseja remover a opção ${optionKey}?`)) {
    const row = buttonElement.closest(".tree-option");
    const container = row.parentElement;
    row.remove();

    if (container.querySelectorAll(".tree-option").length === 0) {
      container.innerHTML = createEmptyOptionHTML();
    }

    const addBtn = document.getElementById(`btn-add-opt-${flowId}-${stepId}`);
    if (addBtn) addBtn.style.display = "inline-flex";
  }
}

/**
 * Varre o DOM do Step atual, extrai os valores dos inputs/selects e salva na API.
 */
async function handleSaveStepOptions(flowId, stepId) {
  const token = localStorage.getItem("token");
  const saveBtn = document.getElementById(`btn-save-opts-${flowId}-${stepId}`);
  const container = document.getElementById(`options-list-${flowId}-${stepId}`);

  // Captura todas as linhas de opções do step (exceto a mensagem vazia)
  const optionRows = container.querySelectorAll(".tree-option");
  const payloadOptions = [];

  optionRows.forEach((row) => {
    const key = row.getAttribute("data-option");

    // Tratamento para a opção fixa de voltar (Key 0)
    if (key === "0" || row.classList.contains("back-option")) {
      payloadOptions.push({
        key: "0",
        nextFlow: null,
        nextStep: null,
        goToStep: null,
        back: true,
      });
      return;
    }

    // Captura os seletores para opções customizadas
    const flowSelect = row.querySelector(".flow-select");
    const stepSelect = row.querySelector(".step-select");

    const nextFlow = flowSelect ? flowSelect.value || null : null;
    let nextStep = stepSelect ? stepSelect.value || null : null;

    // Se o select de step estiver escondido (não ativo), consideramos o padrão "inicio"
    const stepContainer = row.querySelector(`.step-select-container`);
    if (stepContainer && stepContainer.classList.contains("hidden")) {
      nextStep = "inicio";
    }

    payloadOptions.push({
      key: key,
      nextFlow: nextFlow,
      nextStep: nextStep,
      goToStep: null,
      back: false,
    });
  });

  const originalText = saveBtn.innerHTML;
  saveBtn.innerHTML = "Salvando Opções...";
  saveBtn.disabled = true;

  try {
    // Consome o novo endpoint que criamos no controller
    const response = await fetch(`${API_URL}/flows/update-options`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        flowId: flowId,
        stepId: stepId,
        newOptions: payloadOptions,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
    }

    // Atualiza os dados locais na memória do front-end se necessário
    if (window.flowsData) {
      const targetFlow = window.flowsData.find((f) => f.id === flowId);
      if (targetFlow) {
        const targetStep = targetFlow.steps.find((s) => s.id === stepId);
        if (targetStep) {
          targetStep.options = payloadOptions;
        }
      }
    }

    alert("Direcionamento de opções salvo com sucesso!");
  } catch (error) {
    console.error("Falha ao salvar opções do step:", error);
    alert(`Não foi possível salvar: ${error.message}`);
  } finally {
    saveBtn.innerHTML = originalText;
    saveBtn.disabled = false;
  }
}
