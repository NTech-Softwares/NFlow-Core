import { getSession } from "../../flows/state/sessionStore";
import * as repo from "../repository/customServices.repository";
import * as service from "../services/customServices.service";

export async function handleCustomServicesFlow(
  remoteJid: string,
  content: string,
  sessionId: string,
  userId: string,
  normalizedInput: string,
): Promise<{ messages: string[] } | null> {
  const session = getSession(remoteJid, sessionId);
  const config = await repo.getConfigByTenant(userId);

  if (
    normalizedInput === "agendar" ||
    normalizedInput === "agendamento" ||
    session.customServicesState
  ) {
    if (!config || !config.services || config.services.length === 0) {
      delete session.customServicesState;
      return {
        messages: [
          "⚠️ Desculpe, este estabelecimento ainda não configurou os serviços para agendamento automático.",
        ],
      };
    }
  }

  if (!session.customServicesState) {
    if (normalizedInput === "agendar" || normalizedInput === "agendamento") {
      session.customServicesState = { step: "PROCESS_SERVICE" };

      const lines = ["✨ *Escolha o serviço que deseja agendar:*", ""];
      config!.services.forEach((s, index) => {
        lines.push(`*[ ${index + 1} ]* ${s.name}`);
        lines.push(
          `     ↳ 💰 Preço: R$ ${s.price.toFixed(2)} | ⏳ Duração: ${s.durationMinutes} min`,
        );
        lines.push("");
      });
      lines.push("Digite o número correspondente ou *0* para cancelar.");

      return { messages: [lines.join("\n")] };
    } else {
      return null;
    }
  }

  const state = session.customServicesState;

  if (normalizedInput === "0" || normalizedInput === "reset") {
    delete session.customServicesState;
    return {
      messages: [
        "❌ Agendamento cancelado. Se precisar de algo mais, é só chamar!",
      ],
    };
  }

  switch (state.step) {
    case "PROCESS_SERVICE": {
      const idx = parseInt(content.trim()) - 1;
      if (isNaN(idx) || idx < 0 || idx >= config!.services.length) {
        return {
          messages: [
            "❌ Opção inválida. Escolha um número da lista acima ou envie *0* para cancelar.",
          ],
        };
      }

      state.selectedService = config!.services[idx];
      const availableDays = await service.getAvailableDaysForBot(
        userId,
        state.selectedService,
      );
      state.tempDaysMap = availableDays;

      const isCourse =
        state.selectedService.strategyType === "RECURRENT_COURSE";

      const lines = isCourse
        ? [
            "🗓️ *Este serviço é um Curso Recorrente!*",
            "Você pode selecionar *um ou mais dias da semana* para realizar suas aulas.",
            "Digite os números correspondentes separados por vírgula (Ex: *2,4* ou apenas *2*):",
            "",
          ]
        : [
            "🗓️ *Perfeito! Agora escolha o melhor dia para o seu atendimento:*",
            "",
          ];

      availableDays.forEach((d, index) => {
        lines.push(`*[ ${index + 1} ]* ${d.label}`);
      });
      lines.push("\nEnvie sua opção ou *0* para cancelar.");

      state.step = "PROCESS_DAY";
      return { messages: [lines.join("\n")] };
    }

    case "PROCESS_DAY": {
      const daysMap = state.tempDaysMap || [];
      const inputParts = content.split(",").map((p) => parseInt(p.trim()) - 1);
      const validIndices = inputParts.filter(
        (idx) => !isNaN(idx) && idx >= 0 && idx < daysMap.length,
      );

      if (validIndices.length === 0) {
        return {
          messages: [
            "❌ Opção inválida. Escolha um ou mais números válidos da lista acima separados por vírgula ou envie *0* para cancelar.",
          ],
        };
      }

      state.selectedDates = validIndices.map((idx) => daysMap[idx].dateStr);
      state.selectedDatesLabels = validIndices
        .map((idx) => daysMap[idx].label)
        .join(", ");

      const referenceDate = state.selectedDates[0];

      const availableHours = await service.getAvailableHoursForBot(
        userId,
        referenceDate,
        state.selectedService,
      );
      state.tempHoursMap = availableHours;

      if (availableHours.length === 0) {
        return {
          messages: [
            "⚠️ Não há horários compatíveis ou disponíveis para este serviço nos dias selecionados. Por favor, envie *0* para voltar ao menu e selecionar outra opção.",
          ],
        };
      }

      const lines = [
        "⏰ *Excelente! Para finalizar, escolha o horário fixo das aulas:*",
        "",
      ];
      availableHours.forEach((h, index) => {
        lines.push(`*[ ${index + 1} ]* ${h}`);
      });
      lines.push("\nSelecione um número ou envie *0* para cancelar.");

      state.step = "PROCESS_HOUR";
      return { messages: [lines.join("\n")] };
    }

    case "PROCESS_HOUR": {
      const idx = parseInt(content.trim()) - 1;
      const hoursMap = state.tempHoursMap || [];

      if (isNaN(idx) || idx < 0 || idx >= hoursMap.length) {
        return {
          messages: [
            "❌ Horário inválido. Escolha um número da lista ou envie *0* para cancelar.",
          ],
        };
      }

      const finalHour = hoursMap[idx];
      const clientName = session.pushName || "Cliente";

      await service.executeBooking({
        userId,
        sessionId,
        remoteJid,
        clientName,
        service: state.selectedService,
        dates: state.selectedDates,
        time: finalHour,
      });

      // =========================================================================
      // 🔥 RESOLUÇÃO DA HIERARQUIA DA MENSAGEM DE CONFIRMAÇÃO
      // =========================================================================
      let rawTemplate = "";
      const currentService = state.selectedService;

      if (
        currentService.useCustomMessage &&
        currentService.customConfirmationMessage?.trim()
      ) {
        // 1ª Opção: Mensagem customizada do próprio serviço ativa
        rawTemplate = currentService.customConfirmationMessage;
      } else if (config!.confirmationMessage?.trim()) {
        // 2ª Opção: Fallback para a mensagem global do Painel
        rawTemplate = config!.confirmationMessage;
      }

      let confirmationText = "";

      if (rawTemplate) {
        // Processa as tags dinâmicas no template selecionado
        confirmationText = rawTemplate
          .replace(/{cliente}/g, clientName)
          .replace(/{servico}/g, currentService.name)
          .replace(/{preco}/g, `R$ ${currentService.price.toFixed(2)}`)
          .replace(/{data}/g, state.selectedDatesLabels)
          .replace(/{horario}/g, finalHour);
      } else {
        // 3ª Opção: Fallback de segurança em texto puro (Hardcoded)
        confirmationText = [
          "✅ *Agendamento Confirmado com Sucesso!*",
          "",
          `👤 *Cliente:* ${clientName}`,
          `🛠️ *Serviço/Curso:* ${currentService.name}`,
          `💵 *Valor:* R$ ${currentService.price.toFixed(2)}`,
          `📅 *Dias Escolhidos:* ${state.selectedDatesLabels}`,
          `⏰ *Horário Fixo:* ${finalHour}`,
        ].join("\n");
      }

      // Adendos informativos finais do motor de negócios
      if (currentService.strategyType === "RECURRENT_COURSE") {
        const meta = currentService.courseMetadata;
        confirmationText += `\n\n📚 *Nota do Curso:* Vaga garantida para as *${meta.totalClasses} aulas* programadas de acordo com os dias da semana selecionados!`;
      } else {
        confirmationText += `\n\nLembretes automáticos foram programados para o seu WhatsApp!`;
      }

      delete session.customServicesState;
      return { messages: [confirmationText] };
    }

    default:
      delete session.customServicesState;
      return null;
  }
}
