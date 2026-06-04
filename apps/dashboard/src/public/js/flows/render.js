function renderFlows(flows) {
  const container = getFlowsContainer();
  if (!container) return;

  container.innerHTML = "";

  // 1. Normaliza os fluxos para garantir que seja um Array legítimo
  let flowsArray = Array.isArray(flows) ? flows : Object.values(flows || {});

  // 2. 🎯 REORDENAÇÃO COMPLETA DAS CHAVES (Sem mudar a estrutura de Objeto)
  flowsArray.forEach((flow) => {
    if (
      flow.steps &&
      typeof flow.steps === "object" &&
      !Array.isArray(flow.steps)
    ) {
      const initialStepKey = flow.initialStep || "inicio";

      // Verifica se o step inicial realmente existe dentro do objeto
      if (flow.steps[initialStepKey]) {
        // Captura todas as chaves atuais do objeto
        const currentKeys = Object.keys(flow.steps);

        // Se o passo inicial já não for o primeiro da fila, nós reorganizamos
        if (currentKeys[0] !== initialStepKey) {
          // Cria um mapa/cópia temporária de todos os passos atuais
          const stepsBackup = { ...flow.steps };

          // 🧹 LIMPA COMPLETAMENTE o objeto mantendo a referência original dele
          for (const key in flow.steps) {
            delete flow.steps[key];
          }

          // 1º Injeta o passo de início no topo absoluto do objeto
          flow.steps[initialStepKey] = stepsBackup[initialStepKey];

          // 2º Injeta o restante dos passos logo abaixo dele
          currentKeys.forEach((key) => {
            if (key !== initialStepKey) {
              flow.steps[key] = stepsBackup[key];
            }
          });
        }
      }
    }
  });

  // 3. REGRA DE PRIORIDADE: Força o "main" (Menu Principal) a ser o primeiro da lista
  const mainFlowIndex = flowsArray.findIndex((flow) => flow.id === "main");
  if (mainFlowIndex > 0) {
    const [mainFlow] = flowsArray.splice(mainFlowIndex, 1);
    flowsArray.unshift(mainFlow);
  }

  // Atualiza o estado global esperado pelo ecossistema do NFlow Core
  window.flowsData = flowsArray;

  // 4. Renderização na tela
  flowsArray.forEach((flow) => {
    container.innerHTML += createFlowHTML(flow);
  });
}
