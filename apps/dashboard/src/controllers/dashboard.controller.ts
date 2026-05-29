import path from "path";
import { Request, Response } from "express";

export class DashboardController {
  static index(req: Request, res: Response) {
    const filePath = path.resolve(__dirname, "..", "views", "dashboard.html");

    return res.sendFile(filePath);
  }

  static qrCode(req: Request, res: Response) {
    const filePath = path.resolve(__dirname, "..", "views", "qr-code.html");

    return res.sendFile(filePath);
  }

  static flows(req: Request, res: Response) {
    const filePath = path.resolve(__dirname, "..", "views", "flows.html");

    return res.sendFile(filePath);
  }

  static wizard(req: Request, res: Response) {
    const filePath = path.resolve(__dirname, "..", "views", "create-flow.html");

    return res.sendFile(filePath);
  }

  static login(req: Request, res: Response) {
    const filePath = path.resolve(__dirname, "..", "views", "login.html");

    return res.sendFile(filePath);
  }
}
