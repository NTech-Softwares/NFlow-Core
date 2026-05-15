import { Request, Response } from "express";

import { sessionState } from "../../../providers/whatsapp/baileys/state/sessionState";
// ajuste o caminho conforme sua estrutura

class StatusController {
  async handle(req: Request, res: Response) {
    return res.json({
      api: "Online",
      whatsapp: sessionState.status,
      qr: sessionState.qr,
      worker: "Online",
    });
  }
}

export { StatusController };
