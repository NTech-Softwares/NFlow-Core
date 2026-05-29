function createFlowHTML(flow) {
  return `
    <div class="flow-card">

      <div
        class="flow-header"
        onclick="toggleFlow('${flow.id}')"
      >

        <div class="flow-header-left">

          <div
            class="flow-collapse collapsed"
            id="collapse-${flow.id}"
          >
            ▼
          </div>

          <div class="flow-name">
            ${flow.name || flow.id}
          </div>

        </div>

        <div class="flow-header-right" style="display: flex; align-items: center; gap: 8px;">
          <button 
            type="button" 
            class="btn-add-step-trigger" 
            onclick="promptAddStep('${flow.id}'); event.stopPropagation();"
            title="Adicionar Novo Passo"
          >
            + Passo
          </button>
          
          <div class="flow-badge">
            ${(flow.steps || []).length} steps
          </div>
        </div>

      </div>

      <div
        class="flow-body collapsed"
        id="flow-body-${flow.id}"
      >

        ${(flow.steps || []).map((step) => createStepHTML(flow, step)).join("")}

      </div>

    </div>
  `;
}
