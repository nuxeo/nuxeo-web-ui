/**
@license
©2023 Hyland Software, Inc. and its affiliates. All rights reserved. 
All Hyland product names are registered or unregistered trademarks of Hyland Software, Inc. or its affiliates.

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
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { v4 as uuid } from 'uuid';

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

  _resource(path, data) {
    if (!_resource) {
      _resource = document.createElement('nuxeo-resource');
      _resource.uncancelable = true;
      document.body.appendChild(_resource);
    }
    _resource.path = path;
    _resource.data = data;
    return _resource;
  }

  _startKeepAlive() {
    this._keepAlive = setInterval(() => {
      const done = this.files.every((f) => f.complete || f.error);
      if (done) {
        this._stopKeepAlive();
        return;
      }
      this._resource(['upload', this.batchId].join('/')).get();
    }, 60000);
  }

  _stopKeepAlive() {
    if (this._keepAlive) {
      clearInterval(this._keepAlive);
      this._keepAlive = null;
    }
  }

  _upload(file, callback) {
    return new Promise((resolve, reject) => {
      const key = this.extraInfo.baseKey.replace(/^\/+/, '').concat(uuid());
      file.managedUpload = new Upload({
        client: this.uploader,
        params: {
          Bucket: this.extraInfo.bucket,
          Key: key,
          ContentType: file.type,
          Body: file,
        },
      });
      this._startKeepAlive();
      file.managedUpload.on('httpUploadProgress', (evt) => {
        if (typeof callback === 'function') {
          callback({ type: 'uploadProgress', fileIdx: file.index, progress: (evt.loaded / evt.total) * 100 });
        }
      });
      file.managedUpload
        .done()
        .then((data) => {
          this._stopKeepAlive();
          file.managedUpload = null;
          return this._resource(['upload', this.batchId, file.index, 'complete'].join('/'), {
            name: file.name,
            fileSize: file.size,
            key: data.Key,
            bucket: data.Bucket,
            etag: data.ETag,
          }).post();
        })
        .then(() => {
          if (typeof callback === 'function') {
            callback({ type: 'uploadCompleted', fileIdx: file.index });
          }
          resolve();
        })
        .catch((error) => {
          this._stopKeepAlive();
          if (typeof callback === 'function') {
            callback({ type: 'uploadInterrupted', file, error });
          }
          reject(error);
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
    // Mutable state holding the current token set
    this._currentCredentials = {
      accessKeyId: options.awsSecretKeyId,
      secretAccessKey: options.awsSecretAccessKey,
      sessionToken: options.awsSessionToken,
      expiration: new Date(options.expiration),
    };

    // Async credential provider — SDK v3 calls this before each request
    // and caches the result until `expiration` is reached
    const credentialProvider = async () => {
      if (this._currentCredentials.expiration && new Date() >= this._currentCredentials.expiration) {
        const response = await this._resource(`upload/${this.batchId}/refreshToken`).post();
        this._currentCredentials = {
          accessKeyId: response.awsSecretKeyId,
          secretAccessKey: response.awsSecretAccessKey,
          sessionToken: response.awsSessionToken,
          expiration: new Date(response.expiration),
        };
      }
      return this._currentCredentials;
    };

    this.s3Config = {
      credentials: credentialProvider,
      region: options.region,
      forcePathStyle: options.usePathStyleAccess || false,
      useAccelerateEndpoint: options.useS3Accelerate || false,
      requestChecksumCalculation: 'WHEN_REQUIRED',
    };
  }

  _newBatch() {
    return this._resource('upload/new/s3')
      .post()
      .then((response) => {
        this.batchId = response.batchId;
        this.extraInfo = response.extraInfo;
        this._initCredentials(response.extraInfo);
        this.uploader = new S3Client({
          ...this.s3Config,
          endpoint: this.extraInfo.endpoint || undefined,
        });
      });
  }

  _refreshBatchInfo() {
    if (!this._currentCredentials || !this._currentCredentials.expiration) {
      return Promise.resolve();
    }
    if (new Date() < this._currentCredentials.expiration) {
      return Promise.resolve();
    }
    return this._resource(`upload/${this.batchId}/refreshToken`)
      .post()
      .then((response) => {
        this._currentCredentials = {
          accessKeyId: response.awsSecretKeyId,
          secretAccessKey: response.awsSecretAccessKey,
          sessionToken: response.awsSessionToken,
          expiration: new Date(response.expiration),
        };
      });
  }

  _handleUploadError(error, callback) {
    if (this.files.every((file) => file.error)) {
      callback({ type: 'batchFailed', error, batchId: this.batchId });
    } else if (this.files.every((file) => file.error || file.complete)) {
      callback({ type: 'batchFinished', batchId: this.batchId });
    }
    throw error;
  }

  get accepts() {
    return UploaderBehavior.getProviders().default.prototype.accepts;
  }

  upload(files, callback) {
    this._ensureBatch().then(() => {
      callback({ type: 'batchStart', batchId: this.batchId });
      if (Date.now() >= this.extraInfo.expiration) {
        this._refreshBatchInfo();
      }

      const uploadDonePromises = [];

      // reduce upload started promises in sequence while building a list of upload done promisses
      // goal is avoid creating more requests than the browser can have inflight and thus avoid clock skew
      return Array.from(files)
        .reduce((previousStartedPromise, file) => {
          file.index = this.files.length;
          this.files.push(file);
          callback({ type: 'uploadStarted', file });
          return previousStartedPromise.then(
            () =>
              new Promise((resolveStarted) => {
                uploadDonePromises.push(
                  this._upload(file, (event) => {
                    // wait for upload progress to consider it as started
                    if (event.type === 'uploadProgress') {
                      resolveStarted(file);
                    }
                    callback(event);
                  }).catch((error) => this._handleUploadError(error, callback)),
                );
              }),
          );
        }, Promise.resolve())
        .then(() => Promise.all(uploadDonePromises))
        .then(() => callback({ type: 'batchFinished', batchId: this.batchId }));
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
if (
  Nuxeo &&
  Nuxeo.UI &&
  Nuxeo.UI.config &&
  Nuxeo.UI.config.s3 &&
  String(Nuxeo.UI.config.s3.useDirectUpload) === 'true'
) {
  UploaderBehavior.defaultProvider = 's3';
}
