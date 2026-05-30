import { Request, Response } from "express";
import * as getFlowsService from "../services/getFlows.service";
import * as setFlowsService from "../services/setflows.service";

/*
 =========================
 GET FLOWS
 =========================
*/
export async function getFlows(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const flows = await getFlowsService.getFlowsService(
      user.whatsappSessionId,
      user.id.toString(),
    );
    return res.json(flows);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar flows." });
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
    const user = (req as any).user;

    if (!flowId)
      return res.status(404).json({ error: "FlowID não encontrado." });

    const flow = await getFlowsService.getFlowByIdService(
      user.whatsappSessionId,
      user.id.toString(),
      flowId,
    );
    if (!flow) return res.status(404).json({ error: "Flow não encontrado." });

    return res.json(flow);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar flow." });
  }
}

/*
 =========================
 GET FLOWS TREE
 =========================
*/
export async function getFlowsTree(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const tree = await getFlowsService.getFlowsTreeService(
      user.whatsappSessionId,
      user.id.toString(),
    );
    return res.json(tree);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao gerar árvore dos flows." });
  }
}

/*
 =========================
 GERENCIAMENTO (ADD/REMOVE)
 =========================
*/
export async function addFlow(req: Request, res: Response) {
  try {
    const { flowId, initialStep, stepMessage } = req.body;
    const user = (req as any).user;

    if (!flowId) {
      return res.status(400).json({ error: "O ID do fluxo é obrigatório." });
    }

    await setFlowsService.addFlow(
      user.whatsappSessionId,
      user.id.toString(),
      flowId,
      initialStep,
      stepMessage,
    );

    return res
      .status(201)
      .json({ status: "success", message: "Fluxo adicionado com sucesso" });
  } catch (error: any) {
    return res
      .status(400)
      .json({ error: error.message || "Erro ao adicionar fluxo." });
  }
}

export async function removeFlow(req: Request, res: Response) {
  try {
    const { flowId } = req.body;
    const user = (req as any).user;

    if (!flowId) {
      return res
        .status(400)
        .json({ error: "O flowId é obrigatório no corpo da requisição." });
    }

    await setFlowsService.removeFlow(
      user.whatsappSessionId,
      user.id.toString(),
      flowId,
    );

    return res.status(200).json({
      status: "success",
      message: "Fluxo deletado com sucesso.",
    });
  } catch (error: any) {
    return res
      .status(400)
      .json({ error: error.message || "Erro ao remover fluxo." });
  }
}

/*
 =========================
 GERENCIAMENTO DE PASSOS
 =========================
*/
export async function addStep(req: Request, res: Response) {
  try {
    const { flowId, stepId, stepMessage } = req.body;
    const user = (req as any).user;

    if (!flowId)
      return res.status(400).json({ error: "O flowId é obrigatório." });
    if (!stepId)
      return res.status(400).json({ error: "O stepId é obrigatório." });

    await setFlowsService.addStep(
      user.whatsappSessionId,
      user.id.toString(),
      flowId,
      stepId,
      stepMessage,
    );

    return res.status(201).json({
      status: "success",
      message: `Passo '${stepId}' adicionado com sucesso ao fluxo '${flowId}'.`,
    });
  } catch (error: any) {
    return res
      .status(400)
      .json({ error: error.message || "Erro ao adicionar passo." });
  }
}

export async function removeStep(req: Request, res: Response) {
  try {
    const { flowId, stepId } = req.body;
    const user = (req as any).user;

    if (!flowId)
      return res.status(400).json({ error: "O flowId é obrigatório." });
    if (!stepId)
      return res.status(400).json({ error: "O stepId é obrigatório." });

    await setFlowsService.removeStep(
      user.whatsappSessionId,
      user.id.toString(),
      flowId,
      stepId,
    );

    return res.status(200).json({
      status: "success",
      message: `Passo '${stepId}' removido com sucesso do fluxo '${flowId}'.`,
    });
  } catch (error: any) {
    return res
      .status(400)
      .json({ error: error.message || "Erro ao remover passo." });
  }
}

/*
 =========================
 ATUALIZAÇÕES
 =========================
*/
export async function updateStepMessage(req: Request, res: Response) {
  try {
    const { flowId, stepId, newMessage } = req.body;
    const user = (req as any).user;

    if (!flowId)
      return res.status(400).json({ error: "O flowId é obrigatório." });
    if (!stepId)
      return res.status(400).json({ error: "O stepId é obrigatório." });
    if (newMessage === undefined)
      return res
        .status(400)
        .json({ error: "O campo newMessage é obrigatório." });

    await setFlowsService.updateStepMessage(
      user.whatsappSessionId,
      user.id.toString(),
      flowId,
      stepId,
      newMessage,
    );

    return res.status(200).json({
      status: "success",
      message: "Mensagem updated com sucesso.",
    });
  } catch (error: any) {
    return res
      .status(400)
      .json({ error: error.message || "Erro ao atualizar mensagem." });
  }
}

export async function updateStepOptions(req: Request, res: Response) {
  try {
    const { flowId, stepId, newOptions } = req.body;
    const user = (req as any).user;

    if (!flowId)
      return res.status(400).json({ error: "O flowId é obrigatório." });
    if (!stepId)
      return res.status(400).json({ error: "O stepId é obrigatório." });
    if (!newOptions || !Array.isArray(newOptions)) {
      return res.status(400).json({
        error: "O campo newOptions deve ser uma lista (Array) válida.",
      });
    }

    await setFlowsService.updateStepOptions(
      user.whatsappSessionId,
      user.id.toString(),
      flowId,
      stepId,
      newOptions,
    );

    return res.status(200).json({
      status: "success",
      message: "Direcionamento de opções atualizado com sucesso.",
    });
  } catch (error: any) {
    return res
      .status(400)
      .json({ error: error.message || "Erro ao atualizar as opções do step." });
  }
}
