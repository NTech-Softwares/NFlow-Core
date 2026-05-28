import { Flow } from "../types/flowTypes";

export const vendasFlow: Flow = {
  id: "vendas",

  initialStep: "inicio",

  steps: {
    inicio: {
      id: "inicio",

      message: [
        "💰 Setor de Vendas",
        "",
        "1 - Ver planos",
        "2 - Falar com vendedor",
        "0 - Voltar",
      ],

      options: [
        {
          key: "1",
          nextStep: "planos",
        },

        {
          key: "2",
          nextStep: "vendedor",
        },

        {
          key: "0",
          back: true,
        },
      ],
    },

    planos: {
      id: "planos",

      message: [
        "📦 Nossos planos:",
        "",
        "• Básico - R$ 49",
        "• Pro - R$ 99",
        "",
        "0 - Voltar",
      ],

      options: [
        {
          key: "0",
          back: true,
        },
      ],
    },

    vendedor: {
      id: "vendedor",

      message: ["👨‍💼 Um vendedor falará com você.", "", "0 - Voltar"],

      options: [
        {
          key: "0",
          back: true,
        },
      ],
    },
  },
};
