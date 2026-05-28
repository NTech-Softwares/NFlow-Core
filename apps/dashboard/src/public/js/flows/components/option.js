function createOptionHTML(flow, step, option) {
  const isBackOption = String(option.key) === "0";

  const selectedFlow = option.nextFlow || "";

  const selectedStep = option.nextStep || "";

  if (isBackOption) {
    return `
      <div
        class="tree-option back-option"
        data-flow="${flow.id}"
        data-step="${step.id}"
        data-option="${option.key}"
      >

        <div class="option-left">

          <input
          class="option-key-input"
          type="number"
          min="0"
          max="0"
          value="0"
          placeholder="0"
          readonly
        />

        </div>
        <div class="option-arrow">
          →
        </div>
        
        <div class="option-arrow">
          ↩ <span class="page-subtitle" style="padding: 0 12px 0 12px;">Voltar para o Início</span> 
        </div>

      </div>
    `;
  }

  return `
    <div
      class="tree-option"
      data-flow="${flow.id}"
      data-step="${step.id}"
      data-option="${option.key}"
    >

      <div class="option-left">

        <input
          class="option-key-input"
          type="number"
          min="1"
          max="9"
          value="${option.key || ""}"
          placeholder="1-9"
          oninput="handleOptionInput(this)"
        />

      </div>

      <div class="option-arrow">
        →
      </div>

      <div class="option-right">

        ${createFlowSelect(selectedFlow)}

        ${createStepSelect(selectedFlow, selectedStep)}

      </div>

    </div>
  `;
}

function createFlowSelect(selectedFlow) {
  const flows = window.flowsData;

  return `
    <select
      class="flow-select"
      onchange="handleFlowChange(this)"
    >

      <option value="">
        Selecione o Flow
      </option>

      ${flows
        .map(
          (flow) => `
            <option
              value="${flow.id}"
              ${selectedFlow === flow.id ? "selected" : ""}
            >
              ${flow.id}
            </option>
          `,
        )
        .join("")}

    </select>
  `;
}

function createStepSelect(flowId, selectedStep) {
  const flows = window.flowsData;

  const flow = flows.find((item) => item.id === flowId);

  const steps = flow ? flow.steps : [];

  return `
    <select
      class="step-select"
      ${!flowId ? "disabled" : ""}
    >

      <option value="">
        Selecione o Step
      </option>

      ${steps
        .map(
          (step) => `
            <option
              value="${step.id}"
              ${selectedStep === step.id ? "selected" : ""}
            >
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
      sem opções
    </div>
  `;
}

function handleOptionInput(input) {
  let value = input.value.replace(/\D/g, "");

  if (value.length > 1) {
    value = value.slice(0, 1);
  }

  const number = Number(value);

  if (number < 1 || number > 9) {
    value = "";
  }

  input.value = value;
}
