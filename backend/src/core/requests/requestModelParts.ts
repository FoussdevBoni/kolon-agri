import { Schema } from 'mongoose';
import { escapeRegex } from '../http/commonSchema.js';

/** Coordonnées du demandeur, communes aux demandes publiques. */
export interface VisitorContact {
  name: string;
  phone: string;
  location: string;
  email: string | null;
}

export const visitorContactSchema = new Schema<VisitorContact>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    location: { type: String, required: true },
    email: { type: String, default: null },
  },
  { _id: false },
);

/** Projection explicite (évite d'exposer les propriétés internes d'un sous-document). */
export function toContactDto(contact: VisitorContact): VisitorContact {
  return {
    name: contact.name,
    phone: contact.phone,
    location: contact.location,
    email: contact.email,
  };
}

/** Filtre commun des listes : recherche (référence, nom, téléphone) et responsable. */
export function buildRequestFilter(
  query: { search?: string | undefined; assignee?: string | undefined },
  actorId: string,
): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), 'i');
    filter['$or'] = [
      { reference: pattern },
      { 'customer.name': pattern },
      { 'customer.phone': pattern },
    ];
  }
  if (query.assignee === 'me') filter['assigneeId'] = actorId;
  else if (query.assignee === 'none') filter['assigneeId'] = null;
  else if (query.assignee) filter['assigneeId'] = query.assignee;
  return filter;
}
