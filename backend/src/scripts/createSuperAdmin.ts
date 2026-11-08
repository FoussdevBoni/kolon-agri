import { parseArgs } from 'node:util';
import { z } from 'zod';
import { recordAudit } from '../core/audit/auditService.js';
import { connectDatabase, disconnectDatabase } from '../core/database/databaseConnection.js';
import { runInTransaction } from '../core/database/transaction.js';
import { logger } from '../core/logger/logger.js';
import { ensureSuperAdminGuard } from '../modules/admins/adminGuardModel.js';
import { emailSchema } from '../modules/auth/authSchema.js';
import { issuePasswordToken } from '../modules/auth/passwordTokenService.js';
import { UserModel } from '../modules/auth/userModel.js';

/**
 * Initialise le premier superAdmin. Aucun mot de passe ne transite par la ligne de commande :
 * le compte est créé « en attente » et un lien d'activation à usage unique (72 h) est affiché.
 * Refusé dès qu'un superAdmin non désactivé existe.
 *
 * Usage : pnpm --filter @kolon-agri/backend admin:create-super -- --email a@b.ml --name "Nom"
 */
const argsSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(2).max(120),
});

async function createSuperAdmin(): Promise<void> {
  // `pnpm --filter … admin:create-super -- --email …` transmet le séparateur `--` au script.
  const args = process.argv.slice(2).filter((arg, index) => !(index === 0 && arg === '--'));
  const { values } = parseArgs({
    args,
    options: { email: { type: 'string' }, name: { type: 'string' } },
    strict: true,
  });
  const parsed = argsSchema.safeParse(values);
  if (!parsed.success) {
    console.error('Arguments requis : --email <adresse> --name "<nom complet>"');
    process.exitCode = 1;
    return;
  }

  await connectDatabase();
  try {
    await ensureSuperAdminGuard();
    const invitation = await runInTransaction(async (session) => {
      const existing = await UserModel.countDocuments({
        role: 'superAdmin',
        status: { $ne: 'disabled' },
      }).session(session);
      if (existing > 0) return null;
      const [user] = await UserModel.create(
        [
          {
            email: parsed.data.email,
            fullName: parsed.data.name,
            role: 'superAdmin',
            status: 'pending',
          },
        ],
        { session },
      );
      if (!user) throw new Error('Création du compte impossible');
      const link = await issuePasswordToken(user._id, 'invitation', session);
      await recordAudit(
        {
          action: 'admin.superAdmin.bootstrapped',
          targetType: 'user',
          targetId: user._id.toString(),
        },
        session,
      );
      return link;
    });

    if (!invitation) {
      console.error('Un super-administrateur existe déjà : initialisation refusée.');
      process.exitCode = 1;
      return;
    }
    // Lien affiché sur la sortie standard uniquement, jamais dans les journaux applicatifs.
    console.log(
      `Super-administrateur créé. Lien d’activation (usage unique, expire le ${invitation.expiresAt}) :`,
    );
    console.log(invitation.url);
  } catch (error) {
    logger.error({ err: error }, 'Initialisation du super-administrateur impossible');
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

await createSuperAdmin();
