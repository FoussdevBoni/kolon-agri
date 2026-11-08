import { connectDatabase, disconnectDatabase } from '../core/database/databaseConnection.js';
import { logger } from '../core/logger/logger.js';
import { defaultPageContents } from '../modules/pages/pageDefaults.js';
import { seedDefaultContent } from '../modules/pages/pageService.js';

/**
 * Crée les pages CMS manquantes et publie le contenu initial des pages jamais modifiées.
 * Idempotent : aucun contenu existant n'est écrasé.
 */
async function seedCms(): Promise<void> {
  await connectDatabase();
  try {
    const seeded = await seedDefaultContent(defaultPageContents);
    logger.info(
      { seeded },
      seeded.length ? 'Contenu CMS initial publié' : 'Aucune page à initialiser',
    );
  } catch (error) {
    logger.error({ err: error }, 'Initialisation du CMS impossible');
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

await seedCms();
