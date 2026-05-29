export type FlowOption = {
  key: string;

  nextFlow?: string;
  nextStep?: string;
  goToStep?: string;

  back?: boolean;
};

export type FlowStep = {
  id: string;

  name: string;

  message: string[];

  options?: FlowOption[];
};

export type Flow = {
  id: string;

  name: string;

  initialStep: string;

  steps: Record<string, FlowStep>;
};
