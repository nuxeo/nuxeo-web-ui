import fs from 'fs';
import path from 'path';
import Nuxeo, { Blob } from 'nuxeo';

export default new Nuxeo({
  auth: { method: 'basic', username: 'Administrator', password: 'Administrator' },
  baseURL: process.env.NUXEO_URL,
  headers: { 'nx-es-sync': 'true' },
});

export class BlobHelper {
  static fromPath(blobPath) {
    const stats = fs.statSync(blobPath);
    const file = fs.createReadStream(blobPath);
    return new Blob({
      content: file,
      name: path.basename(blobPath),
      size: stats.size,
    });
  }
}
