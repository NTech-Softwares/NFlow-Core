function createStepHTML(flow, step) {
  return `
    <div class="tree-step">

      <div class="tree-step-id">
        ├── ${step.id}
      </div>

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
