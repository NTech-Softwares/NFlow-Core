import { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import {
  getFlowsService,
  getFlowByIdService,
  getFlowsTreeService,
} from "../services/getFlows.service";
import { Flow } from "../../../../providers/whatsapp/baileys/flows/types/flowTypes";
import {
  addFlowJson,
  removeFlowJson,
  updateStepMessageJson,
  updateStepOptionsJson, // IMPORTADO: Novo service de opções do passo
} from "../services/setflows.service";
import { STATUS_EXPIRY_SECONDS } from "@whiskeysockets/baileys";

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
      return res.status(400).json({ error: "O ID do fluxo é obrigatório." });
    }

    await addFlowJson(flowId, flowGreeting, initialStep, stepMessage);

    return res
      .status(201)
      .json({ status: "success", message: "Fluxo adicionado com sucesso" });
  } catch (error: any) {
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
    return res.status(400).json({
      error: error.message || "Erro ao remover fluxo.",
    });
  }
}

/*
 =========================
 Edita Mensagem
 =========================
*/
export async function updateStepMessage(req: Request, res: Response) {
  try {
    const { flowId, stepId, newMessage } = req.body;

    if (!flowId)
      return res
        .status(400)
        .json({ error: "O flowId é obrigatório no corpo da requisição." });

    if (!stepId)
      return res
        .status(400)
        .json({ error: "O stepId é obrigatório no corpo da requisição." });

    if (!newMessage) return res.status(400).json({ error: "Não há mensagem." });

    await updateStepMessageJson(flowId, stepId, newMessage);

    return res.status(200).json({
      status: "success",
      message: "Mensagem updated com sucesso.",
    });
  } catch (error: any) {
    return res.status(400).json({
      error: error.message || "Erro ao atualizar mensagem.",
    });
  }
}

/*
 =========================
 Edita Opções (Direcionamentos)
 =========================
*/
export async function updateStepOptions(req: Request, res: Response) {
  try {
    const { flowId, stepId, newOptions } = req.body;

    // Validações básicas da requisição de entrada
    if (!flowId) {
      return res
        .status(400)
        .json({ error: "O flowId é obrigatório no corpo da requisição." });
    }

    if (!stepId) {
      return res
        .status(400)
        .json({ error: "O stepId é obrigatório no corpo da requisição." });
    }

    if (!newOptions || !Array.isArray(newOptions)) {
      return res
        .status(400)
        .json({
          error: "O campo newOptions deve ser uma lista (Array) válida.",
        });
    }

    // Executa a atualização na RAM e no JSON físico
    await updateStepOptionsJson(flowId, stepId, newOptions);

    return res.status(200).json({
      status: "success",
      message: "Direcionamento de opções atualizado com sucesso.",
    });
  } catch (error: any) {
    // Captura erros de fluxos/steps inexistentes vindos do service e repassa com clareza
    return res.status(400).json({
      error: error.message || "Erro ao atualizar as opções do step.",
    });
  }
}
