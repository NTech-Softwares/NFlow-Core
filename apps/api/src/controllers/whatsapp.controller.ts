import { Request, Response } from "express";

import { sessionState } from "../../providers/whatsapp/baileys/state/sessionState";

import { getGroups } from "../../providers/whatsapp/baileys/services/groups.service";

import { messageQueue } from "../../shared/queue/messageQueue";

/*
 =========================
 STATUS
 =========================
*/

export function getStatus(req: Request, res: Response) {
  return res.json({
    status: sessionState.status,
    qr: sessionState.qr,
  });
}

/*
 =========================
 LISTAR GRUPOS
 =========================
*/

export async function listGroups(req: Request, res: Response) {
  try {
    const grupos = await getGroups();

    return res.json({
      success: true,
      array: grupos,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      error: "Erro ao listar grupos",
    });
  }
}

/*
 =========================
 ENVIAR MENSAGEM
 =========================
*/

export async function sendMessage(req: Request, res: Response) {
  try {
    const { number, message } = req.body;

    const image = req.file;

    if (!number || !message) {
      return res.status(400).json({
        success: false,
        error: "Número e mensagem são obrigatórios",
      });
    }

    const formattedNumber = number.replace(/\D/g, "");

    messageQueue.push({
      jid: `${formattedNumber}@s.whatsapp.net`,

      imagePath: image?.path,

      message: {
        text: message,
      },
    });

    console.log("Mensagem adicionada na fila");

    return res.json({
      success: true,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      error: "Erro ao enviar mensagem",
    });
  }
}

/*
 =========================
 ENVIAR CAMPANHA
 =========================
*/

export async function sendCampaign(req: Request, res: Response) {
  try {
    let { groups, message } = req.body;

    const image = req.file;

    /*
     =========================
     TRANSFORMA EM ARRAY
     =========================
    */

    if (typeof groups === "string") {
      groups = [groups];
    }

    if (!groups?.length || !message) {
      return res.status(400).json({
        success: false,
        error: "Selecione grupos e uma mensagem",
      });
    }

    groups.forEach((groupId: string) => {
      messageQueue.push({
        jid: groupId,

        imagePath: image?.path,

        message: {
          text: message,
        },
      });
    });

    console.log(`${groups.length} mensagens adicionadas na fila`);

    return res.json({
      success: true,
      totalGroups: groups.length,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      error: "Erro ao enviar campanha",
    });
  }
}
