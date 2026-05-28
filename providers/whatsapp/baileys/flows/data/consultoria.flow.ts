import { Flow } from "../types/flowTypes";

export const consultoriaFlow: Flow = {
  id: "consultoria",

  initialStep: "inicio",

  steps: {
    inicio: {
      id: "inicio",

      message: [
        "💬 Consultoria Personalizada",
        "",
        "Te ajudamos com:",
        "• Arquitetura de sistemas",
        "• Escalabilidade",
        "• Projetos completos",
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
