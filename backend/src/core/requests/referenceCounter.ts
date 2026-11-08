import { type ClientSession, model, Schema } from 'mongoose';

interface Counter {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<Counter>(
  { _id: { type: String, required: true }, seq: { type: Number, required: true, default: 0 } },
  { collection: 'counters', versionKey: false },
);

const CounterModel = model<Counter>('Counter', counterSchema);

/**
 * Référence lisible et unique par année (ex. DEV-2026-00042), attribuée dans la transaction
 * de création : une création annulée ne consomme pas de numéro.
 */
export async function nextReference(
  prefix: string,
  session: ClientSession,
  now = new Date(),
): Promise<string> {
  const year = now.getUTCFullYear();
  const counter = await CounterModel.findOneAndUpdate(
    { _id: `${prefix}-${String(year)}` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, session },
  );
  return `${prefix}-${String(year)}-${String(counter.seq).padStart(5, '0')}`;
}
