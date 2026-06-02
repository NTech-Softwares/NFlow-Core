export interface TimeInterval {
  open: string; // "08:00"
  close: string; // "18:00"
}

export interface BusinessHoursConfig {
  enabled: boolean;
  timezone?: string;
  schedule: Record<string, TimeInterval[]>;
  awayMessage: string[];
}

/**
 * Converte uma string "HH:MM" em minutos totais desde o início do dia
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Verifica se a hora atual está dentro do horário de funcionamento configurado
 */
export function isInsideBusinessHours(config: BusinessHoursConfig): boolean {
  if (!config || !config.enabled || !config.schedule) {
    return true; // Se não houver configuração ou estiver desativada, assume que atende sempre
  }

  // Captura a data/hora atual no Timezone correto do cliente
  const tz = config.timezone || "America/Sao_Paulo";
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));

  const currentDay = now.getDay().toString(); // "0" (Domingo) a "6" (Sábado)
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const dayIntervals = config.schedule[currentDay];

  // Se a lista de intervalos do dia estiver vazia ou não configurada, está fechado
  if (!dayIntervals || dayIntervals.length === 0) {
    return false;
  }

  // Verifica se o minuto atual se encaixa em pelo menos um dos intervalos de atendimento do dia
  return dayIntervals.some((interval) => {
    const start = timeToMinutes(interval.open);
    const end = timeToMinutes(interval.close);
    return currentMinutes >= start && currentMinutes <= end;
  });
}

// Adicione este export no final do arquivo: C:\My Codes\NFlow Core\shared\utils\businessHours.ts

/**
 * Transforma o objeto de configuração de horários em um texto legível para o WhatsApp
 */
export function formatBusinessHours(config: BusinessHoursConfig): string[] {
  if (!config || !config.enabled || !config.schedule) {
    return [
      "🟢 Nosso atendimento funciona 24 horas por dia, 7 dias por semana!",
    ];
  }

  const dayNames: Record<string, string> = {
    "1": "Segunda-feira",
    "2": "Terça-feira",
    "3": "Quarta-feira",
    "4": "Quinta-feira",
    "5": "Sexta-feira",
    "6": "Sábado",
    "0": "Domingo",
  };

  const lines: string[] = ["🗓️ *Nosso Horário de Atendimento:*", ""];

  // Percorre os dias de 1 a 6, e depois o 0 (Domingo) para ficar ordenado na mensagem
  const orderedDays = ["1", "2", "3", "4", "5", "6", "0"];

  for (const day of orderedDays) {
    const name = dayNames[day];
    const intervals = config.schedule[day];

    if (!intervals || intervals.length === 0) {
      lines.push(`• *${name}:* Fechado`);
    } else {
      // Mapeia e junta os intervalos do dia (Ex: "08:00 às 12:00 e 14:00 às 18:00")
      const timeString = intervals
        .map((interval) => `${interval.open} às ${interval.close}`)
        .join(" e ");

      lines.push(`• *${name}:* ${timeString}`);
    }
  }

  return lines;
}
