# File picker for OneDrive & OneDrive for Business

The OneDrive & OneDrive for Business file picker is a light JavaScript picker over the OneDrive REST API. It is designed to work with both OneDrive & OneDrive for Business and to have light dependencies. Check your [live demo](https://nuxeo.github.io/onedrive-file-picker/).

## Getting Started

Download the latest release [here](https://github.com/nuxeo/onedrive-file-picker/releases) or build it from master.

You also need [jQuery](http://jquery.com/download/) in your page. The file picker was built with jQuery 1.8.0, it should work with lower version.

Then include jQuery and file picker scripts in your page :

```
<script type="text/javascript" src="https://code.jquery.com/jquery-1.8.0.min.js"></script>
<script type="text/javascript" src="onedrive-file-picker.js"></script>
<link rel="stylesheet" type="text/css" href="onedrive-file-picker.min.css">
```

### Get your access token

You can follow the OneDrive documentation [page](https://dev.onedrive.com/auth/readme.htm) to obtain an access token. This part has to be done by your application, as the file picker needs an access token to work.

### OneDrive

For OneDrive just init the file picker with access token :

```
var accessToken = '...';
var picker = new OneDriveFilePicker({ 'accessToken': accessToken });
```

### OneDrive for Business

For OneDrive for Business, the file picker needs an access token and the resource url to access the api.

```
var accessToken = '...';
var baseURL = 'https://{tenant}-my.sharepoint.com/_api/v2.0'; // For example : https://nuxeo-my.sharepoint.com/_api/v2.0
var picker = new OneDriveFilePicker({ 'accessToken': accessToken, 'baseURL': baseURL });
```

### Open file picker and get selected file

Once you have your file picker instance, you can call `select` method to open it. The method return a `Promise`, if you're not familiar with it, see this [page](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise). Once user has selected a file or closed the picker, the `Promise` will be resolved.

```
picker.select().then(function(result) {
  // Your code here
});
```

You get an object with at least `action` attribute which could be :
* select  - When user has selected a file
* close - When user has closed the file picker without selecting a file
In select case, you also get an `item` attribute which contains the selected [item metadata](https://dev.onedrive.com/items/get.htm).

You can also catch error thrown from API, like unauthorized errors, with catch Promise method :

```
picker.select().catch(function(error) {
  // Your code here
});
```

The API error contains the textual portion of the HTTP status, such as "Not Found" or "Internal Server Error."

# Contributing

See our [contribution documentation](https://doc.nuxeo.com/x/VIZH).

## Requirements

* [Node.js](http://nodejs.org/#download)
* [gulp](http://gulpjs.com/)
* [npm](https://www.npmjs.com/)

## Setup

Install [Node.js](http://nodejs.org/#download) and then use `npm` to install all the required libraries:
```
$ git clone https://github.com/nuxeo/onedrive-file-picker
$ cd onedrive-file-picker
$ npm install
```

## Demo

You can run a live demo during development with hot reload, just enter in your terminal :
```
$ gulp demo
```

# Licensing

[Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0.html)

# About Nuxeo

Nuxeo dramatically improves how content-based applications are built, managed and deployed, making customers more agile, innovative and successful. Nuxeo provides a next generation, enterprise ready platform for building traditional and cutting-edge content oriented applications. Combining a powerful application development environment with
SaaS-based tools and a modular architecture, the Nuxeo Platform and Products provide clear business value to some of the most recognizable brands including Verizon, Electronic Arts, Netflix, Sharp, FICO, the U.S. Navy, and Boeing. Nuxeo is headquartered in New York and Paris.
More information is available at [www.nuxeo.com](http://www.nuxeo.com).
