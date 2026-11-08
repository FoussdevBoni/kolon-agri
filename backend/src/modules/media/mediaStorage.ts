import { createCloudinaryStorage } from './cloudinaryStorage.js';

export interface StoredMedia {
  publicId: string;
  url: string;
  bytes: number;
  width: number;
  height: number;
  format: string;
}

/** Stockage distant des fichiers ; seule implémentation de production : Cloudinary. */
export interface MediaStorage {
  upload(file: Buffer, info: { mimeType: string; filename: string }): Promise<StoredMedia>;
  destroy(publicId: string): Promise<void>;
}

let storage: MediaStorage | undefined;

export function getMediaStorage(): MediaStorage {
  storage ??= createCloudinaryStorage();
  return storage;
}

/** Réservé aux tests : remplace l'intégration Cloudinary par un double. */
export function setMediaStorage(replacement: MediaStorage | undefined): void {
  storage = replacement;
}
