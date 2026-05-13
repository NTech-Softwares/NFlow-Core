import path from "path";
import { Request, Response } from "express";

export class DashboardController {
  static index(req: Request, res: Response) {
    const filePath = path.resolve(
      __dirname,
      "..",
      "views",
      "dashboard_old.html",
    );

    return res.sendFile(filePath);
  }

  static teste(req: Request, res: Response) {
    const filePath = path.resolve(__dirname, "..", "views", "dashboard.html");

    return res.sendFile(filePath);
  }
}
