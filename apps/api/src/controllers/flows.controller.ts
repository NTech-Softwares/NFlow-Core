import { Request, Response } from "express";
import {
  getFlowsService,
  getFlowByIdService,
  getFlowsTreeService,
} from "../services/getFlows.service";
import {
  addFlowJson,
  removeFlowJson,
  addStepJson, // IMPORTADO: Novo service para adicionar passos
  removeStepJson, // IMPORTADO: Novo service para remover passos
  updateStepMessageJson,
  updateStepOptionsJson,
} from "../services/setflows.service";

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
    if (!flowId)
      return res.status(404).json({ error: "FlowID não encontrado." });

    const flow = await getFlowByIdService(flowId);
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
    const sessionId = user.whatsappSessionId;
    const id = user.id.toString();

    // Chama o serviço passando os parâmetros necessários
    const tree = await getFlowsTreeService(sessionId, id);
    return res.json(tree);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao gerar árvore dos flows." });
  }
}

/*
 =========================
 ADICIONA FLOW
 =========================
*/
export async function addFlow(req: Request, res: Response) {
  try {
    const { flowId, initialStep, stepMessage } = req.body;

    if (!flowId) {
      return res.status(400).json({ error: "O ID do fluxo é obrigatório." });
    }

    await addFlowJson(flowId, initialStep, stepMessage);

    return res
      .status(201)
      .json({ status: "success", message: "Fluxo adicionado com sucesso" });
  } catch (error: any) {
    return res
      .status(400)
      .json({ error: error.message || "Erro ao adicionar fluxo." });
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
    return res
      .status(400)
      .json({ error: error.message || "Erro ao remover fluxo." });
  }
}

/*
 =========================
 ADICIONA STEP
 =========================
*/
export async function addStep(req: Request, res: Response) {
  try {
    const { flowId, stepId, stepMessage } = req.body;

    if (!flowId)
      return res.status(400).json({ error: "O flowId é obrigatório." });
    if (!stepId)
      return res.status(400).json({ error: "O stepId é obrigatório." });

    await addStepJson(flowId, stepId, stepMessage);

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

/*
 =========================
 REMOVE STEP
 =========================
*/
export async function removeStep(req: Request, res: Response) {
  try {
    const { flowId, stepId } = req.body;

    if (!flowId)
      return res.status(400).json({ error: "O flowId é obrigatório." });
    if (!stepId)
      return res.status(400).json({ error: "O stepId é obrigatório." });

    await removeStepJson(flowId, stepId);

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
 Edita Mensagem
 =========================
*/
export async function updateStepMessage(req: Request, res: Response) {
  try {
    const { flowId, stepId, newMessage } = req.body;

    if (!flowId)
      return res.status(400).json({ error: "O flowId é obrigatório." });
    if (!stepId)
      return res.status(400).json({ error: "O stepId é obrigatório." });
    if (newMessage === undefined)
      return res
        .status(400)
        .json({ error: "O campo newMessage é obrigatório." });

    await updateStepMessageJson(flowId, stepId, newMessage);

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

/*
 =========================
 Edita Opções (Direcionamentos)
 =========================
*/
export async function updateStepOptions(req: Request, res: Response) {
  try {
    const { flowId, stepId, newOptions } = req.body;

    if (!flowId)
      return res.status(400).json({ error: "O flowId é obrigatório." });
    if (!stepId)
      return res.status(400).json({ error: "O stepId é obrigatório." });
    if (!newOptions || !Array.isArray(newOptions)) {
      return res.status(400).json({
        error: "O campo newOptions deve ser uma lista (Array) válida.",
      });
    }

    await updateStepOptionsJson(flowId, stepId, newOptions);

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
