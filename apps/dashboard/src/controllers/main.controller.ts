import path from "path";
import { Request, Response } from "express";

export class MainController {
  static index(req: Request, res: Response) {
    const filePath = path.resolve(__dirname, "..", "views", "index.html");

    return res.sendFile(filePath);
  }

  static qrCode(req: Request, res: Response) {
    const filePath = path.resolve(__dirname, "..", "views", "qr-code.html");

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

  static register(req: Request, res: Response) {
    const filePath = path.resolve(__dirname, "..", "views", "register.html");

    return res.sendFile(filePath);
  }

  static forgotPassword(req: Request, res: Response) {
    const filePath = path.resolve(
      __dirname,
      "..",
      "views",
      "forgot-password.html",
    );

    return res.sendFile(filePath);
  }

  static resetPassword(req: Request, res: Response) {
    const filePath = path.resolve(
      __dirname,
      "..",
      "views",
      "reset-password.html",
    );

    return res.sendFile(filePath);
  }
}
