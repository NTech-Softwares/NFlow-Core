import { Request, Response } from "express";

class StatusController {
  async handle(req: Request, res: Response) {
    return res.json({
      api: "Online",
      whatsapp: "Connected",
      worker: "Online",
    });
  }
}

export { StatusController };
