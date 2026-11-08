import { model, Schema, type Types } from 'mongoose';

export interface PageSection {
  /** Identifiant stable (UUID). */
  id: string;
  type: string;
  data: Record<string, unknown>;
  /** Version de la section, contrôlée à chaque modification (expectedVersion). */
  version: number;
}

export interface PageSeo {
  title: string;
  description: string;
  imageId: string | null;
}

export interface PageSnapshot {
  sections: PageSection[];
  seo: PageSeo;
  /** Révision du brouillon publiée. */
  revision: number;
  publishedAt: Date;
  publishedBy: Types.ObjectId | null;
}

export interface PageVersion extends PageSnapshot {
  number: number;
}

/** Page CMS : brouillon et version publiée indépendants, historique des publications. */
export interface Page {
  key: string;
  draft: {
    sections: PageSection[];
    seo: PageSeo;
    revision: number;
    updatedAt: Date;
    updatedBy: Types.ObjectId | null;
  };
  published: PageSnapshot | null;
  versions: PageVersion[];
  lastVersionNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

const sectionSchema = new Schema<PageSection>(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    data: { type: Schema.Types.Mixed, required: true },
    version: { type: Number, required: true },
  },
  { _id: false, minimize: false },
);

const seoSchema = new Schema<PageSeo>(
  {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    imageId: { type: String, default: null },
  },
  { _id: false },
);

const snapshotFields = {
  sections: { type: [sectionSchema], default: [] },
  seo: { type: seoSchema, default: () => ({}) },
  revision: { type: Number, required: true },
  publishedAt: { type: Date, required: true },
  publishedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
};

const pageSchema = new Schema<Page>(
  {
    key: { type: String, required: true, unique: true },
    draft: {
      sections: { type: [sectionSchema], default: [] },
      seo: { type: seoSchema, default: () => ({}) },
      revision: { type: Number, required: true, default: 0 },
      updatedAt: { type: Date, required: true, default: () => new Date() },
      updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    },
    published: { type: new Schema<PageSnapshot>(snapshotFields, { _id: false }), default: null },
    versions: {
      type: [
        new Schema<PageVersion>(
          { ...snapshotFields, number: { type: Number, required: true } },
          { _id: false },
        ),
      ],
      default: [],
    },
    lastVersionNumber: { type: Number, required: true, default: 0 },
  },
  { collection: 'pages', timestamps: true, minimize: false },
);

export const PageModel = model<Page>('Page', pageSchema);
