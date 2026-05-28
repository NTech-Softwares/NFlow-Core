import { Request, Response } from "express";

import { getFlowsService } from "../services/getFlows.service";

import { getFlowByIdService } from "../services/getFlowById.service";

import { getFlowsTreeService } from "../services/getFlowsTree.service";

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

    const flow = await getFlowByIdService(flowId);

    if (!flow) {
      return res.status(404).json({
        error: "Flow não encontrado.",
      });
    }

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
