/**
@license
(C) Copyright Nuxeo Corp. (http://nuxeo.com/)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import { UploaderBehavior } from '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-uploader-behavior.js';
import AWS from 'aws-sdk';
import uuid from 'uuid/v4';

let _resource;

class S3Provider {
  constructor(connection, accept, batchAppend) {
    this.connection = connection;
    this.accept = accept;
    this.batchAppend = batchAppend;
    this.uploader = null;
    this.batchId = null;
    this.files = [];
  }

  _resource() {
    if (!_resource) {
      _resource = document.createElement('nuxeo-resource');
      document.body.appendChild(_resource);
    }
    return _resource;
  }

  _upload(file, callback) {
    return new Promise((resolve, reject) => {
      callback({ type: 'uploadStarted', file });
      file.managedUpload = this.uploader.upload({
        Key: this.extraInfo.baseKey.replace(/^\/+/g, '').concat(uuid()),
        ContentType: file.type,
        Body: file,
      });
      file.managedUpload
        .on('httpUploadProgress', (evt) => {
          if (typeof callback === 'function') {
            callback({ type: 'uploadProgress', fileIdx: file.index, progress: (evt.loaded / evt.total) * 100 });
          }
        })
        .send((error, data) => {
          if (error === null) {
            file.managedUpload = null;
            const resource = this._resource();
            resource.path = ['upload', this.batchId, file.index, 'complete'].join('/');
            resource.data = {
              name: file.name,
              fileSize: file.size,
              key: data.Key,
              bucket: data.Bucket,
              etag: data.ETag,
            };
            resource.post().then(() => {
              if (typeof callback === 'function') {
                callback({ type: 'uploadCompleted', fileIdx: file.index });
              }
              resolve();
            });
          } else {
            reject(error);
          }
        });
    });
  }

  _ensureBatch() {
    if (!this.batchAppend || !this.uploader) {
      this.files = [];
      return this._newBatch();
    }
    return Promise.resolve();
  }

  _initCredentials(options) {
    AWS.config.update({
      credentials: new AWS.Credentials(options.awsSecretKeyId, options.awsSecretAccessKey, options.awsSessionToken),
      region: options.region,
      useAccelerateEndpoint: options.useS3Accelerate || false,
    });

    AWS.config.credentials.expireTime = new Date(options.expiration);
  }

  _newBatch() {
    const resource = this._resource();
    resource.path = 'upload/new/s3';
    return resource.post().then((response) => {
      this.batchId = response.batchId;
      this.extraInfo = response.extraInfo;
      this._initCredentials(response.extraInfo);
      this.uploader = new AWS.S3({
        params: {
          Bucket: this.extraInfo.bucket,
        },
        computeChecksums: true,
      });
    });
  }

  get accepts() {
    return UploaderBehavior.getProviders().default.prototype.accepts;
  }

  upload(files, callback) {
    this._ensureBatch()
      .then(() => {
        if (new Date().getTime() >= this.extraInfo.expiration) {
          this._refreshBatchInfo();
        }

        const promises = [];
        for (let i = 0; i < files.length; ++i) {
          const file = files[i];
          file.index = this.files.length;
          this.files.push(file);
          promises.push(this._upload(file, callback));
        }
        return Promise.all(promises).then(() => {
          callback({ type: 'batchFinished', batchId: this.batchId });
        });
      })
      .catch((error) => {
        callback({ type: 'uploadInterrupted', error });
      });
  }

  hasAbort() {
    return true;
  }

  hasProgress() {
    return true;
  }

  abort(file) {
    if (file.managedUpload) {
      file.managedUpload.abort();
    }
  }

  cancelBatch() {
    if (this.uploader) {
      this.files.forEach(this.abort);
    }
    this.uploader = null;
    this.batchId = null;
    this.files = [];
  }

  batchExecute(operationId, params, headers) {
    return this.connection.operation(operationId).then((operation) => {
      const options = {
        url: [operation._nuxeo._restURL, 'upload', this.batchId, 'execute', operationId].join('/').replace(/\/+/g, '/'),
      };
      if (headers) {
        options.headers = headers;
      }
      if (params.context) {
        operation = operation.context(params.context);
      }
      return operation.params(params).execute(options);
    });
  }
}

UploaderBehavior.registerProvider('s3', S3Provider);

// if S3 direct upload is enabled set it as default upload provider
// config values from configuration service are strings
if (String(Nuxeo.UI.config.s3.useDirectUpload) === 'true') {
  UploaderBehavior.defaultProvider = 's3';
}
