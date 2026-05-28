import { Flow } from "../types/flowTypes";

export const automacaoFlow: Flow = {
  id: "automacao",

  initialStep: "inicio",

  steps: {
    inicio: {
      id: "inicio",

      message: [
        "⚙️ Automação de Processos",
        "",
        "Automatizamos:",
        "• Sistemas internos",
        "• Fluxos de vendas",
        "• Integrações API",
        "",
        "Em breve conteúdo completo...",
        "",
        "0 - Voltar ao menu principal",
      ],

      options: [
        {
          key: "0",
          back: true,
        },
      ],
    },
  },
};
