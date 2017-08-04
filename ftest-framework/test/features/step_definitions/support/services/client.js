import fs from 'fs';
import path from 'path';
import Nuxeo, { Blob } from 'nuxeo';

export default new Nuxeo({ auth: { method: 'basic', username: 'Administrator', password: 'Administrator' } });

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
