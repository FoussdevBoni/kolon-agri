import type { Request, RequestHandler } from 'express';
import type { z } from 'zod';
import { sendSuccess } from '../http/apiResponse.js';
import { idParamsSchema } from '../http/commonSchema.js';
import { parseInput } from '../http/validation.js';
import { assignmentBodySchema, noteBodySchema } from './requestCommon.js';
import type { RequestWorkflow } from './requestWorkflow.js';

/**
 * Contrôleurs communes des opérations de traitement (historique, statut, affectation, notes).
 * L'identité de l'acteur est fournie par le domaine appelant (middleware d'authentification).
 */
export function createWorkflowHandlers<S extends string>(options: {
  workflow: RequestWorkflow<S>;
  statusBodySchema: z.ZodType<{ status: S }>;
  getActorId: (req: Request) => string;
  /** Renvoie le détail à jour après une opération. */
  getDetail: (id: string) => Promise<unknown>;
}) {
  const { workflow, getActorId, getDetail } = options;

  const listActivities: RequestHandler = async (req, res) => {
    const { id } = parseInput(idParamsSchema, req.params);
    sendSuccess(res, await workflow.listActivities(id));
  };

  const changeStatus: RequestHandler = async (req, res) => {
    const { id } = parseInput(idParamsSchema, req.params);
    const { status } = parseInput(options.statusBodySchema, req.body);
    await workflow.changeStatus(getActorId(req), id, status);
    sendSuccess(res, await getDetail(id));
  };

  const assign: RequestHandler = async (req, res) => {
    const { id } = parseInput(idParamsSchema, req.params);
    const { assigneeId } = parseInput(assignmentBodySchema, req.body);
    await workflow.assign(getActorId(req), id, assigneeId);
    sendSuccess(res, await getDetail(id));
  };

  const addNote: RequestHandler = async (req, res) => {
    const { id } = parseInput(idParamsSchema, req.params);
    const { content } = parseInput(noteBodySchema, req.body);
    await workflow.addNote(getActorId(req), id, content);
    sendSuccess(res, await workflow.listActivities(id), { statusCode: 201 });
  };

  return { listActivities, changeStatus, assign, addNote };
}
