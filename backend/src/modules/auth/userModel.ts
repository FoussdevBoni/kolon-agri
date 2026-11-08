import { model, Schema, type Types } from 'mongoose';

export const adminRoles = ['admin', 'superAdmin'] as const;
export type AdminRole = (typeof adminRoles)[number];

export const accountStatuses = ['pending', 'active', 'disabled'] as const;
export type AccountStatus = (typeof accountStatuses)[number];

export const passwordTokenPurposes = ['invitation', 'reset'] as const;
export type PasswordTokenPurpose = (typeof passwordTokenPurposes)[number];

/** Jeton d'invitation ou de réinitialisation : seule son empreinte est stockée. */
export interface PasswordToken {
  hash: string;
  purpose: PasswordTokenPurpose;
  expiresAt: Date;
}

/** Identité administrative (collection `users`). */
export interface User {
  email: string;
  fullName: string;
  role: AdminRole;
  status: AccountStatus;
  passwordHash: string | null;
  passwordChangedAt: Date | null;
  lastLoginAt: Date | null;
  passwordToken: PasswordToken | null;
  createdBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const passwordTokenSchema = new Schema<PasswordToken>(
  {
    hash: { type: String, required: true },
    purpose: { type: String, enum: passwordTokenPurposes, required: true },
    expiresAt: { type: Date, required: true },
  },
  { _id: false },
);

const userSchema = new Schema<User>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    role: { type: String, enum: adminRoles, required: true },
    status: { type: String, enum: accountStatuses, required: true, default: 'pending' },
    passwordHash: { type: String, default: null, select: false },
    passwordChangedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    passwordToken: { type: passwordTokenSchema, default: null, select: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { collection: 'users', timestamps: true },
);

userSchema.index({ role: 1, status: 1 });
userSchema.index({ 'passwordToken.hash': 1 }, { sparse: true });

export const UserModel = model<User>('User', userSchema);

/** Normalisation unique des emails (recherche et unicité). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
