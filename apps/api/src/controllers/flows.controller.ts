import { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import {
  getFlowsService,
  getFlowByIdService,
  getFlowsTreeService,
} from "../services/getFlows.service";
import { Flow } from "../../../../providers/whatsapp/baileys/flows/types/flowTypes";
import { addFlowJson, removeFlowJson } from "../services/setflows.service";

/*
 =========================
 GET FLOWS
 =========================
*/
export async function getFlows(req: Request, res: Response) {
  try {
    const flows = await getFlowsService();

    return res.json(flows);
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao buscar flows.",
    });
  }
}

/*
 =========================
 GET FLOW BY ID
 =========================
*/
export async function getFlowById(req: Request, res: Response) {
  try {
    const { flowId } = req.params;

    if (!flowId)
      return res.status(404).json({
        error: "FlowID não encontrado.",
      });

    const flow = await getFlowByIdService(flowId);

    if (!flow)
      return res.status(404).json({
        error: "Flow não encontrado.",
      });

    return res.json(flow);
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao buscar flow.",
    });
  }
}

/*
 =========================
 GET FLOWS TREE
 =========================
*/
export async function getFlowsTree(req: Request, res: Response) {
  try {
    const tree = await getFlowsTreeService();

    return res.json(tree);
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao gerar árvore dos flows.",
    });
  }
}

/*
 =========================
 ADICIONA FLOW
 =========================
*/
export async function addFlow(req: Request, res: Response) {
  try {
    const { flowId, flowGreeting, initialStep, stepMessage } = req.body;

    if (!flowId) {
      return res.status(400).json({ error: "O ID do fluxo é obrigatório." }); // Alterado para 400
    }

    // O serviço agora controla a validação interna
    await addFlowJson(flowId, flowGreeting, initialStep, stepMessage);

    return res
      .status(201) // 201 é o status padrão para recursos criados com sucesso
      .json({ status: "success", message: "Fluxo adicionado com sucesso" });
  } catch (error: any) {
    // Retorna 400 se for um erro de validação do nosso service (ex: ID duplicado)
    return res.status(400).json({
      error: error.message || "Erro ao adicionar fluxo.",
    });
  }
}

/*
 =========================
 REMOVE FLOW
 =========================
*/
export async function removeFlow(req: Request, res: Response) {
  try {
    // Mantive req.body para não quebrar seus testes atuais, mas mudei a validação do status
    const { flowId } = req.body;

    if (!flowId) {
      return res
        .status(400)
        .json({ error: "O flowId é obrigatório no corpo da requisição." });
    }

    await removeFlowJson(flowId);

    return res.status(200).json({
      status: "success",
      message: "Fluxo deletado com sucesso.",
    });
  } catch (error: any) {
    // Se o serviço disser que o fluxo não existe, este catch vai avisar exatamente isso no Thunder Client
    return res.status(400).json({
      error: error.message || "Erro ao remover fluxo.",
    });
  }
}
