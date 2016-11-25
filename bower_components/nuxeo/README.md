## Client Library for Nuxeo API

[![Build Status](https://qa.nuxeo.org/jenkins/buildStatus/icon?job=/Client/nuxeo-js-client-master/&style=flat)](https://qa.nuxeo.org/jenkins/job/Client/job/nuxeo-js-client-master)
[![npm version](https://img.shields.io/npm/v/nuxeo.svg?style=flat-square)](https://www.npmjs.com/package/nuxeo)
[![npm downloads](https://img.shields.io/npm/dm/nuxeo.svg?style=flat-square)](https://www.npmjs.com/package/nuxeo)
[![Dependency Status](https://img.shields.io/david/nuxeo/nuxeo-js-client.svg?style=flat-square)](https://david-dm.org/nuxeo/nuxeo-js-client) [![devDependency Status](https://img.shields.io/david/dev/nuxeo/nuxeo-js-client.svg?style=flat-square)](https://david-dm.org/nuxeo/nuxeo-js-client#info=devDependencies)

The Nuxeo JavaScript Client is a JavaScript client library for the Nuxeo Automation and REST API. The library can work in a browser, or in Node.js, using the same API.

This is an on-going project, supported by Nuxeo.

## Getting Started

### Nuxeo Platform - JS Client Dependencies

| Nuxeo Platform | JS Client |
| -------------- |-----------|
| LTS 2015       | >= 1.x.x  |
| FT 8.x         | >= 2.x.x  |

### Installation

#### Node.js Applications

After installing [Node.js](http://nodejs.org/#download), use `npm` to install the `nuxeo` package:

* For the latest 2.x.x version:

        $ npm install nuxeo@2 --save

* For the latest 1.x.x version:

        $ npm install nuxeo@1 --save

Then, use the following `require` statement to have access to the same API than the browser client:

```javascript
var Nuxeo = require('nuxeo');
var nuxeo = new Nuxeo({ ... });
```

#### Bower Powered Applications

The `nuxeo` client can be also installed through bower:

* For the latest 2.x.x version:

        $ bower install nuxeo@2 --save

* For the latest 1.x.x version:

        $ bower install nuxeo@1 --save

When added to your page, `Nuxeo` is available as a global variable.

```javascript
var nuxeo = new Nuxeo({ ... });
```

#### Angular Applications

After adding `nuxeo` through Bower, you can easily create a service that will return a client:

```javascript
...
.service('nuxeo', function() {
  return new Nuxeo({
    baseURL: 'http://localhost:8080/nuxeo/',
    auth: {
      method: 'basic',
      username: 'Administrator',
      password: 'Administrator'
    }
  });
})
...
```

To notify Angular to update the UI when a Nuxeo promise has resolved, you can either wrap Nuxeo promises in `$q.when()`
or, the preferred way, configure the Promise library class to be `$q`.

```javascript
// wrap promises
...
$q.when(nuxeo.request('/path/').get()).then(function(res) {
  $scope.res = res;
});
// use $q as the Promise library class
...
.service('nuxeo', function($q) {
  Nuxeo.promiseLibrary($q);
  return new Nuxeo({
    baseURL: 'http://localhost:8080/nuxeo/',
    auth: {
      method: 'basic',
      username: 'Administrator',
      password: 'Administrator'
    }
  });
})
...
```

#### React Applications

After adding `nuxeo` through `npm` to your application, you must require `nuxeo` as follows:

```javascript
var Nuxeo = require('nuxeo/dist/nuxeo');
```

## Documentation

Check out the [API documentation](https://nuxeo.github.io/nuxeo-js-client/2.2.0/).

## Requirements

The Nuxeo JavaScript client works only with Nuxeo Platform >= LTS 2015.

## Quick Start

This quick start guide will show how to do basics operations using the client.

### Creating a Client

```javascript
var nuxeo = new Nuxeo({
  auth: {
    method: 'basic',
    username: 'Administrator',
    password: 'Administrator'
  },
});
```

To connect to a different Nuxeo Platform Instance, you can use the following:

```javascript
var nuxeo = new Nuxeo({
  baseURL: 'http://demo.nuxeo.com/nuxeo/',
  auth: {
    method: 'basic',
    username: 'Administrator',
    password: 'Administrator'
  },
});
```

### Promise Based Calls

All API calls made on the server return a Promise object.

```javascript
nuxeo.operation('Document.GetChildren')
  .input('/')
  .execute()
  .then(function(docs) {
    // work with docs
  })
  .catch(function(error) {
    // something went wrong
    throw error;
  });
```

When something went wrong, the `error` is an `Error` object with a `response` field containing the whole response.

### Operation

`Operation` object allows you to execute an operation
(or operation chain).

See the [Operation](https://nuxeo.github.io/nuxeo-js-client/2.2.0/Operation.html) documentation.

#### Samples

__Call an operation to create a new folder in the Root document__

```javascript
nuxeo.operation('Document.Create')
  .params({
    type: 'Folder',
    name: 'My Folder',
    properties: 'dc:title=My Folder \ndc:description=A Simple Folder'
  })
  .input('/')
  .execute()
  .then(function(doc) {
      console.log('Created ' + doc.title + ' folder');
  })
  .catch(function(error) {
    throw error;
  });
```

### Request

The `Request` object allows you to call the Nuxeo REST API.

See the [Request](https://nuxeo.github.io/nuxeo-js-client/2.2.0/Request.html) documentation.

#### Samples

__Fetch the Administrator user__

```javascript
nuxeo.request('user/Administrator')
  .get()
  .then(function(user) {
    console.log(user);
  })
  .catch(function(error) {
    throw error;
  });
```

__Fetch the whole list of Natures__

```javascript
nuxeo.request('directory/nature')
  .get()
  .then(function(data) {
    console.log(JSON.stringify(data.entries, null, 2))
  })
  .catch(function(error) {
    throw error
  });
```

### Repository

The `Repository` object allows you to work with document.

See the [Repository](https://nuxeo.github.io/nuxeo-js-client/2.2.0/Repository.html) documentation.

#### Samples

__Create a `Repository` object__

```javascript
var defaultRepository = nuxeo.repository(); // 'default' repository
...
var testRepository = nuxeo.repository('test'); // 'test' repository
...
```

__Fetch the Root document__

```javascript
nuxeo.repository().fetch('/')
  .then(function(doc) {
    console.log(doc);
  })
  .catch(function(error) {
    throw error;
  });
```

__Create a new folder__

```javascript
var newFolder = {
  'entity-type': 'document',
  name: 'a-folder',
  type: 'Folder',
  properties: {
    'dc:title': 'foo',
  },
};
nuxeo.repository()
  .create('/', newFolder)
  .then(function(doc) {
    console.log(doc);
  })
  .catch(function(error) {
    throw error;
  });
```

__Delete a document__

```javascript
nuxeo.repository()
  .delete('/a-folder')
  .then(function(res) {
    // res.status === 204
  });
```

### Document

`Repository` object returns and works with `Document` objects. `Document` objects exposes a simpler API
to work with a document.

See the [Document](https://nuxeo.github.io/nuxeo-js-client/2.2.0/Document.html) documentation.

#### Samples

__Retrieve a `Document` object__

```javascript
nuxeo.repository()
  .fetch('/')
  .then(function(doc) {
    // doc instanceof Nuxeo.Document === true
  })
  .catch(function(error) {
    throw error;
  });
```

__Set a document property__

```javascript
doc.set({ 'dc:title': 'foo' });
```

__Get a document property__

```javascript
doc.get('dc:title');
```

__Save an updated document__

```javascript
nuxeo.repository()
  .fetch('/')
  .then(function(doc) {
    // doc.title !== 'foo'
    doc.set({ 'dc:title': 'foo' });
    return doc.save();
  })
  .then(function(doc) {
    // doc.title === 'foo'
  })
  .catch(function(error) {
    throw error;
  });
```

__Fetch the main Blob of a document__

```javascript
doc.fetchBlob()
  .then(function(res) {
    // in the browser, use res.blob() to work with the converted PDF
    // in Node.js, use res.body
  });
```

__Convert a document main Blob to PDF__

```javascript
doc.convert({ format: 'pdf' })
  .then(function(res) {
    // in the browser, use res.blob() to work with the converted PDF
    // in Node.js, use res.body
  });
```

__Fetch the 'thumbnail' rendition__

```javascript
doc.fetchRendition('thumbnail')
  .then(function(res) {
    // in the browser, use res.blob() to work with the rendition
    // in Node.js, use res.body
  });
```

__Start a workflow__

```javascript
doc.startWorkflow('SerialDocumentReview')
  .then(function(workflow) {
    // workflow instance of Nuxeo.Workflow
  });
```

__Complete a workflow task__

```javascript
workflow.fetchTasks()
  .then(function(tasks) {
    return tasks[0];
  })
  .then(function(tasks) {
    task.variable('participants', ['user:Administrator'])
      .variable('assignees', ['user:Administrator'])
      .variable('end_date', '2011-10-23T12:00:00.00Z');
    return task.complete('start_review', { comment: 'a comment' });
  })
  .then(function(task) {
    // task.state === 'ended'
  })
```

### BatchUpload

The `BatchUpload` object allows you to upload blobs to a Nuxeo Platform instance, and use them as operation input or
as document property value.

See the [BatchUpload](https://nuxeo.github.io/nuxeo-js-client/2.2.0/BatchUpload.html) documentation.

#### Samples

__Create a Nuxeo.Blob to be uploaded__

```javascript
// on the browser, assuming you have a File object 'file'
var blob = new Nuxeo.Blob({ content: file });
// the name, mimeType and size will be extracted from the file object itself, you can still override them.
...
// on Node.js, assuming you have a Stream 'file'
var blob = new Nuxeo.Blob({ content: file, name: 'foo.txt', mimeType: 'plain/text', size: 10 })
```

__Upload a blob__

```javascript
nuxeo.batchUpload()
  .upload(blob)
  .then(function(res) {
    // res.blob instanceof Nuxeo.BatchBlob
    console.log(res.blob);
  })
  .catch(function(error) {
    throw error;
  });
```

__Attach an uploaded blob to a document__

```javascript
nuxeo.batchUpload()
  .upload(blob)
  .then(function(res) {
    return nuxeo.operation('Blob.AttachOnDocument')
      .param('document', '/a-file')
      .input(res.blob)
      .execute({ schemas: ['dublincore', 'file']});
  })
  .then(function(doc) {
    console.log(doc.properties[file:content]);
  })
  .catch(function(error) {
    throw error;
  });
```

### Users

The `Users` object allows you to work with users.

See the [Users](https://nuxeo.github.io/nuxeo-js-client/2.2.0/Users.html) and
[User](https://nuxeo.github.io/nuxeo-js-client/2.2.0/User.html) documentation.

#### Samples

__Fetch an user__

```javascript
nuxeo.users()
  .fetch('Administrator')
  .then(function(user) {
    // user.id === 'Administrator'
  });
```

__Create a new user__

```javascript
var newUser = {
  properties: {
    username: 'leela',
    firstName: 'Leela',
    company: 'Futurama',
    email: 'leela@futurama.com',
  },
};
nuxeo.users()
  .create(newUser)
  .then(function(user) {
    // user.id === 'leela'
  });
```

__Delete an user__

```javascript
nuxeo.users()
  .delete('leela').then(function(res) {
    // res.status === 204
  });
```

### Groups

The `Groups` object allows you to work with groups.

See the [Groups](https://nuxeo.github.io/nuxeo-js-client/2.2.0/Groups.html) and
[Group](https://nuxeo.github.io/nuxeo-js-client/2.2.0/Group.html) documentation.

#### Samples

__Fetch a group__

```javascript
nuxeo.groups().fetch('administrators')
  .then(function(group) {
    // group.groupname === 'administrators'
  });
```

__Create a new group__

```javascript
var newGroup = {
  groupname: 'foo',
  grouplabel: 'Foo',
};
nuxeo.groups()
  .create(newGroup)
  .then(function(group) {
    // group.groupname === 'foo';
  });
```

__Delete a group__

```javascript
nuxeo.groups()
  .delete('foo').then(function(res) {
    // res.status === 204
  });
```

### Directory

The `Directory` object allows you to work with directories.

See the [Directory](https://nuxeo.github.io/nuxeo-js-client/2.2.0/Directory.html) and
[DirectoryEntry](https://nuxeo.github.io/nuxeo-js-client/2.2.0/DirectoryEntry.html) documentation.

#### Samples

__Fetch all entries of a directory__

```javascript
nuxeo.directory('nature')
  .fetchAll()
  .then(function(entries) {
    // entries instance of Array
  });
```

__Fetch a given directory entry__

```javascript
nuxeo.directory('nature')
  .fetch('article')
  .then(function(entry) {
    // entry.directoryName === 'nature'
    // entry.properties.id === 'article'
  });
```

__Create a new directory entry__

```javascript
var newEntry = {
  properties: {
    id: 'foo',
    label: 'Foo',
  },
};
nuxeo.directory('nature')
  .create(newEntry)
  .then(function(entry) {
    // entry.directoryName === 'nature'
    // entry.properties.id === 'foo'
  });
```

__Delete a directory entry__

```javascript
nuxeo.directory('nature')
 .delete('foo')
 .then(function(res) {
   // res.status === 204
 });
```

## Contributing

See our [contribution documentation](https://doc.nuxeo.com/x/VIZH).

### Requirements

* [Node.js](http://nodejs.org/#download)
* [gulp](http://gulpjs.com/)
* [Bower](http://bower.io/)
* [npm](https://www.npmjs.com/)

### Setup

Install [Node.js](http://nodejs.org/#download) and then use `npm` to install all the required
libraries:

    $ git clone https://github.com/nuxeo/nuxeo-js-client
    $ cd nuxeo-js-client
    $ npm install

### Test

A Nuxeo Platform instance needs to be running on `http://localhost:8080/nuxeo` for the tests to be run.

Tests can be launched on Node.js with:

    $ gulp test:node

For testing the browser client (tests are run on Firefox and Chrome by default):

    $ gulp test:browser

To run both Node.js and browser tests:

    $ gulp test


### Reporting Issues

You can follow the developments in the Nuxeo JS Client project of our JIRA bug tracker: [https://jira.nuxeo.com/browse/NXJS](https://jira.nuxeo.com/browse/NXJS).

You can report issues on [answers.nuxeo.com](http://answers.nuxeo.com).

## License

[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0.txt) Copyright (c) Nuxeo SA


## About Nuxeo

Nuxeo dramatically improves how content-based applications are built, managed and deployed, making customers more agile, innovative and successful. Nuxeo provides a next generation, enterprise ready platform for building traditional and cutting-edge content oriented applications. Combining a powerful application development environment with SaaS-based tools and a modular architecture, the Nuxeo Platform and Products provide clear business value to some of the most recognizable brands including Verizon, Electronic Arts, Sharp, FICO, the U.S. Navy, and Boeing. Nuxeo is headquartered in New York and Paris. More information is available at [www.nuxeo.com](http://www.nuxeo.com/).
