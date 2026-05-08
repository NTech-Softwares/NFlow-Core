import { Request, Response } from "express";

class StatusController {
  async handle(req: Request, res: Response) {
    return res.json({
      api: "online",
      whatsapp: "disconnected",
      worker: "online",
    });
  }
}

export { StatusController };