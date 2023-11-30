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
    const blobPath1 = '/Users/alok.ranjan2/Public/Ftest/1/nuxeo-web-ui/ftest/resources/sample.png';
    const stats = fs.statSync(blobPath1);
    const file = fs.createReadStream(blobPath1);
    return new Blob({
      content: file,
      name: path.basename(blobPath1),
      size: stats.size,
    });
  }
}
