<!--
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
-->
<%@ page contentType="text/html; charset=UTF-8" %>
<%@ page import="java.util.List"%>
<%@ page import="java.lang.management.ManagementFactory"%>
<%@ page import="org.nuxeo.common.Environment"%>
<%@ page import="org.nuxeo.runtime.api.Framework"%>
<%@ page import="org.nuxeo.runtime.services.config.ConfigurationService"%>
<%@ page import="org.nuxeo.ecm.web.resources.api.Resource"%>
<%@ page import="org.nuxeo.ecm.web.resources.api.ResourceContextImpl"%>
<%@ page import="org.nuxeo.ecm.web.resources.api.service.WebResourceManager"%>
<%@ page import="org.nuxeo.ecm.core.api.repository.RepositoryManager"%>
<%@ page import="org.nuxeo.common.utils.UserAgentMatcher"%>

<% WebResourceManager wrm = Framework.getService(WebResourceManager.class); %>
<% RepositoryManager rm = Framework.getService(RepositoryManager.class); %>
<% ConfigurationService cs = Framework.getService(ConfigurationService.class); %>
<% String ua = request.getHeader("user-agent"); %>
<% String context = request.getContextPath(); %>

<!DOCTYPE html>
<html lang="">

<head>
  <meta charset="UTF-8">
  <meta name="description" content="">
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <title><%= Framework.getProperty(Environment.PRODUCT_NAME) %></title>

  <!-- Chrome for Android theme color -->
  <meta name="theme-color" content="#2E3AA1">

  <!-- Web Application Manifest -->
  <link rel="manifest" href="manifest.json" crossOrigin="use-credentials">

  <!-- Tile color for Win8 -->
  <meta name="msapplication-TileColor" content="#3372DF">

  <!-- Add to homescreen for Chrome on Android -->
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="application-name" content="Nuxeo">

  <link rel="icon" sizes="32x32" href="images/touch/favicon-32x32.png" type="image/png">
  <link rel="icon" sizes="16x16" href="images/touch/favicon-16x16.png" type="image/png">
  <% if (UserAgentMatcher.isMSEdge(ua)) { %>
  <link rel="shortcut icon" href="<%=context%>/icons/favicon.ico" type="image/x-icon">
  <% } %>
  <!-- Safari pinned tab icon -->
  <link rel="mask-icon" href="images/touch/safari-pinned-tab.svg" color="#0066ff">

  <!-- Add to homescreen for Safari on iOS -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black">
  <meta name="apple-mobile-web-app-title" content="Nuxeo">
  <link rel="apple-touch-icon" href="images/touch/apple-touch-icon.png">

  <!-- Tile icon for Win8 (144x144) -->
  <meta name="msapplication-TileImage" content="images/touch/ms-touch-icon-144x144-precomposed.png">

  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />

  <style>
    <%@include file="index.css"%>
  </style>
</head>

<body>
  <nuxeo-connection url="<%= context %>"
                    repository-name="<%= rm.getDefaultRepositoryName() %>"></nuxeo-connection>
  <nuxeo-app base-url="<%= request.getRequestURI() %>"
             product-name="<%= Framework.getProperty(Environment.PRODUCT_NAME) %>" unresolved>
    <div id="sidebar">
      <img src="themes/default/logo.png">
    </div>
    <div id="container">
      <div id="toolbar">
      </div>
      <span id="loading"></span>
    </div>
  </nuxeo-app>

  <script>(function(a){function b(a){return r.typeof="function"===typeof Symbol&&"symbol"===typeof Symbol.iterator?b=function(a){return typeof a}:b=function(a){return a&&"function"===typeof Symbol&&a.constructor===Symbol&&a!==Symbol.prototype?"symbol":typeof a},b(a)}function c(a){function b(d,e){try{var f=a[d](e),g=f.value,h=g instanceof r.AwaitValue;Promise.resolve(h?g.wrapped:g).then(function(a){return h?void b("next",a):void c(f.done?"return":"normal",a)},function(a){b("throw",a)})}catch(a){c("throw",a)}}function c(a,c){switch(a){case"return":d.resolve({value:c,done:!0});break;case"throw":d.reject(c);break;default:d.resolve({value:c,done:!1});}d=d.next,d?b(d.key,d.arg):e=null}var d,e;this._invoke=function(a,c){return new Promise(function(f,g){var h={key:a,arg:c,resolve:f,reject:g,next:null};e?e=e.next=h:(d=e=h,b(a,c))})},"function"!==typeof a.return&&(this.return=void 0)}function d(a,b,c,d,e,f,g){try{var h=a[f](g),i=h.value}catch(a){return void c(a)}h.done?b(i):Promise.resolve(i).then(d,e)}function e(a,b){for(var c,d=0;d<b.length;d++)c=b[d],c.enumerable=c.enumerable||!1,c.configurable=!0,"value"in c&&(c.writable=!0),Object.defineProperty(a,c.key,c)}function f(a,b){for(var c in b){var d=b[c];d.configurable=d.enumerable=!0,"value"in d&&(d.writable=!0),Object.defineProperty(a,c,d)}if(Object.getOwnPropertySymbols)for(var e=Object.getOwnPropertySymbols(b),f=0;f<e.length;f++){var g=e[f],d=b[g];d.configurable=d.enumerable=!0,"value"in d&&(d.writable=!0),Object.defineProperty(a,g,d)}return a}function g(a,b,c){return b in a?Object.defineProperty(a,b,{value:c,enumerable:!0,configurable:!0,writable:!0}):a[b]=c,a}function h(){return r.extends=h=Object.assign||function(a){for(var b,c=1;c<arguments.length;c++)for(var d in b=arguments[c],b)Object.prototype.hasOwnProperty.call(b,d)&&(a[d]=b[d]);return a},h.apply(this,arguments)}function i(a){return r.getPrototypeOf=i=Object.setPrototypeOf?Object.getPrototypeOf:function(a){return a.__proto__||Object.getPrototypeOf(a)},i(a)}function j(a,b){return r.setPrototypeOf=j=Object.setPrototypeOf||function(a,b){return a.__proto__=b,a},j(a,b)}function k(){if("undefined"===typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"===typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],function(){})),!0}catch(a){return!1}}function l(){return r.construct=k()?l=Reflect.construct:l=function(b,c,d){var e=[null];e.push.apply(e,c);var a=Function.bind.apply(b,e),f=new a;return d&&r.setPrototypeOf(f,d.prototype),f},l.apply(null,arguments)}function m(a){var b="function"===typeof Map?new Map:void 0;return r.wrapNativeSuper=m=function(a){function c(){return r.construct(a,arguments,r.getPrototypeOf(this).constructor)}if(null===a||!r.isNativeFunction(a))return a;if("function"!==typeof a)throw new TypeError("Super expression must either be null or a function");if("undefined"!==typeof b){if(b.has(a))return b.get(a);b.set(a,c)}return c.prototype=Object.create(a.prototype,{constructor:{value:c,enumerable:!1,writable:!0,configurable:!0}}),r.setPrototypeOf(c,a)},m(a)}function n(a,b,c){return r.get="undefined"!==typeof Reflect&&Reflect.get?n=Reflect.get:n=function(a,b,c){var d=r.superPropBase(a,b);if(d){var e=Object.getOwnPropertyDescriptor(d,b);return e.get?e.get.call(c):e.value}},n(a,b,c||a)}function o(a,b,c,d){return o="undefined"!==typeof Reflect&&Reflect.set?Reflect.set:function(a,b,c,d){var e,f=r.superPropBase(a,b);if(f){if(e=Object.getOwnPropertyDescriptor(f,b),e.set)return e.set.call(d,c),!0;if(!e.writable)return!1}if(e=Object.getOwnPropertyDescriptor(d,b),e){if(!e.writable)return!1;e.value=c,Object.defineProperty(d,b,e)}else r.defineProperty(d,b,c);return!0},o(a,b,c,d)}function p(a,b,c,d,e){var f=o(a,b,c,d||a);if(!f&&e)throw new Error("failed to set property");return c}function q(a){if(Symbol.iterator in Object(a)||"[object Arguments]"===Object.prototype.toString.call(a))return Array.from(a)}var r=a.babelHelpers={};r.typeof=b,r.asyncIterator=function(a){var b;if("function"===typeof Symbol){if(Symbol.asyncIterator&&(b=a[Symbol.asyncIterator],null!=b))return b.call(a);if(Symbol.iterator&&(b=a[Symbol.iterator],null!=b))return b.call(a)}throw new TypeError("Object is not async iterable")},r.AwaitValue=function(a){this.wrapped=a},"function"===typeof Symbol&&Symbol.asyncIterator&&(c.prototype[Symbol.asyncIterator]=function(){return this}),c.prototype.next=function(a){return this._invoke("next",a)},c.prototype.throw=function(a){return this._invoke("throw",a)},c.prototype.return=function(a){return this._invoke("return",a)},r.AsyncGenerator=c,r.wrapAsyncGenerator=function(a){return function(){return new r.AsyncGenerator(a.apply(this,arguments))}},r.awaitAsyncGenerator=function(a){return new r.AwaitValue(a)},r.asyncGeneratorDelegate=function(a,b){function c(c,d){return e=!0,d=new Promise(function(b){b(a[c](d))}),{done:!1,value:b(d)}}var d={},e=!1;return"function"===typeof Symbol&&Symbol.iterator&&(d[Symbol.iterator]=function(){return this}),d.next=function(a){return e?(e=!1,a):c("next",a)},"function"===typeof a.throw&&(d.throw=function(a){if(e)throw e=!1,a;return c("throw",a)}),"function"===typeof a.return&&(d.return=function(a){return c("return",a)}),d},r.asyncToGenerator=function(a){return function(){var b=this,c=arguments;return new Promise(function(e,f){function g(a){d(i,e,f,g,h,"next",a)}function h(a){d(i,e,f,g,h,"throw",a)}var i=a.apply(b,c);g(void 0)})}},r.classCallCheck=function(a,b){if(!(a instanceof b))throw new TypeError("Cannot call a class as a function")},r.createClass=function(a,b,c){return b&&e(a.prototype,b),c&&e(a,c),a},r.defineEnumerableProperties=f,r.defaults=function(a,b){for(var c=Object.getOwnPropertyNames(b),d=0;d<c.length;d++){var e=c[d],f=Object.getOwnPropertyDescriptor(b,e);f&&f.configurable&&a[e]===void 0&&Object.defineProperty(a,e,f)}return a},r.defineProperty=g,r.extends=h,r.objectSpread=function(a){for(var b=1;b<arguments.length;b++){var c=null==arguments[b]?{}:arguments[b],d=Object.keys(c);"function"===typeof Object.getOwnPropertySymbols&&(d=d.concat(Object.getOwnPropertySymbols(c).filter(function(a){return Object.getOwnPropertyDescriptor(c,a).enumerable}))),d.forEach(function(b){r.defineProperty(a,b,c[b])})}return a},r.inherits=function(a,b){if("function"!==typeof b&&null!==b)throw new TypeError("Super expression must either be null or a function");a.prototype=Object.create(b&&b.prototype,{constructor:{value:a,writable:!0,configurable:!0}}),b&&r.setPrototypeOf(a,b)},r.getPrototypeOf=i,r.setPrototypeOf=j,r.construct=l,r.isNativeFunction=function(a){return-1!==Function.toString.call(a).indexOf("[native code]")},r.wrapNativeSuper=m,r.instanceof=function(a,b){return null!=b&&"undefined"!==typeof Symbol&&b[Symbol.hasInstance]?b[Symbol.hasInstance](a):a instanceof b},r.interopRequireDefault=function(a){return a&&a.__esModule?a:{default:a}},r.interopRequireWildcard=function(a){if(a&&a.__esModule)return a;var b={};if(null!=a)for(var c in a)if(Object.prototype.hasOwnProperty.call(a,c)){var d=Object.defineProperty&&Object.getOwnPropertyDescriptor?Object.getOwnPropertyDescriptor(a,c):{};d.get||d.set?Object.defineProperty(b,c,d):b[c]=a[c]}return b.default=a,b},r.newArrowCheck=function(a,b){if(a!==b)throw new TypeError("Cannot instantiate an arrow function")},r.objectDestructuringEmpty=function(a){if(null==a)throw new TypeError("Cannot destructure undefined")},r.objectWithoutProperties=function(a,b){if(null==a)return{};var c,d,e=r.objectWithoutPropertiesLoose(a,b);if(Object.getOwnPropertySymbols){var f=Object.getOwnPropertySymbols(a);for(d=0;d<f.length;d++)c=f[d],!(0<=b.indexOf(c))&&Object.prototype.propertyIsEnumerable.call(a,c)&&(e[c]=a[c])}return e},r.assertThisInitialized=function(a){if(void 0===a)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return a},r.possibleConstructorReturn=function(a,b){return b&&("object"===typeof b||"function"===typeof b)?b:r.assertThisInitialized(a)},r.superPropBase=function(a,b){for(;!Object.prototype.hasOwnProperty.call(a,b)&&(a=r.getPrototypeOf(a),null!==a););return a},r.get=n,r.set=p,r.taggedTemplateLiteral=function(a,b){return b||(b=a.slice(0)),Object.freeze(Object.defineProperties(a,{raw:{value:Object.freeze(b)}}))},r.temporalRef=function(a,b){if(a===r.temporalUndefined)throw new ReferenceError(b+" is not defined - temporal dead zone");else return a},r.readOnlyError=function(a){throw new Error("\""+a+"\" is read-only")},r.temporalUndefined={},r.slicedToArray=function(a,b){return r.arrayWithHoles(a)||r.iterableToArrayLimit(a,b)||r.nonIterableRest()},r.toArray=function(a){return r.arrayWithHoles(a)||r.iterableToArray(a)||r.nonIterableRest()},r.toConsumableArray=function(a){return r.arrayWithoutHoles(a)||r.iterableToArray(a)||r.nonIterableSpread()},r.arrayWithoutHoles=function(a){if(Array.isArray(a)){for(var b=0,c=Array(a.length);b<a.length;b++)c[b]=a[b];return c}},r.arrayWithHoles=function(a){if(Array.isArray(a))return a},r.iterableToArray=q,r.iterableToArrayLimit=function(a,b){var c=[],d=!0,e=!1,f=void 0;try{for(var g,h=a[Symbol.iterator]();!(d=(g=h.next()).done)&&(c.push(g.value),!(b&&c.length===b));d=!0);}catch(a){e=!0,f=a}finally{try{d||null==h["return"]||h["return"]()}finally{if(e)throw f}}return c},r.nonIterableSpread=function(){throw new TypeError("Invalid attempt to spread non-iterable instance")},r.nonIterableRest=function(){throw new TypeError("Invalid attempt to destructure non-iterable instance")},r.toPropertyKey=function(a){var b=r.toPrimitive(a,"string");return"symbol"===typeof b?b:b+""}})("undefined"===typeof global?self:global);</script>

  <script src="node_modules/@webcomponents/webcomponentsjs/webcomponents-loader.js"></script>

  <script src="node_modules/@webcomponents/html-imports/html-imports.min.js"></script>

  <script src="node_modules/web-animations-js/web-animations-next-lite.min.js"></script>

  <script defer src="node_modules/moment/min/moment-with-locales.min.js"></script>

  <script defer src="node_modules/@nuxeo/nuxeo-ui-elements/widgets/alloy/alloy-editor-all.js"></script>

  <script>
    var Nuxeo = Nuxeo || {};
    Nuxeo.UI = Nuxeo.UI || {};
    Nuxeo.UI.config = <%= cs.getPropertiesAsJson("org.nuxeo.web.ui") %>;
  </script>

  <script>"use strict";(function(){function a(a,b,c){var d=a;if(d.state=b,d.stateData=c,0<d.onNextStateChange.length){var e=d.onNextStateChange.slice();d.onNextStateChange.length=0;for(var f,g=0,h=e;g<h.length;g++)f=h[g],f()}return d}function b(b){function d(){try{document.head.removeChild(f)}catch(a){}}var e=a(b,"Loading",void 0),f=document.createElement("script");return f.src=b.url,null!==b.crossorigin&&f.setAttribute("crossorigin",b.crossorigin),f.onload=function(){var a,b,f;void 0===r?(b=[],f=void 0):(a=r(),b=a[0],f=a[1]),c(e,b,f),d()},f.onerror=function(){g(b,new TypeError("Failed to fetch "+b.url)),d()},document.head.appendChild(f),e}function c(b,c,e){var f=d(b,c),g=f[0],h=f[1];return a(b,"WaitingForTurn",{args:g,deps:h,moduleBody:e})}function d(a,c){for(var e,f=[],g=[],i=0,j=c;i<j.length;i++){if(e=j[i],"exports"===e){f.push(a.exports);continue}if("require"===e){f.push(function(b,c,e){var f=d(a,b),g=f[0],i=f[1];h(i,function(){c&&c.apply(null,g)},e)});continue}if("meta"===e){f.push({url:!0===a.isTopLevel?a.url.substring(0,a.url.lastIndexOf("#")):a.url});continue}var l=k(n(a.urlBase,e),a.crossorigin);f.push(l.exports),g.push(l),"Initialized"===l.state&&b(l)}return[f,g]}function e(b){var c=a(b,"WaitingOnDeps",b.stateData);return h(b.stateData.deps,function(){return f(c)},function(a){return g(c,a)}),c}function f(b){var c=b.stateData;if(null!=c.moduleBody)try{c.moduleBody.apply(null,c.args)}catch(a){return g(b,a)}return a(b,"Executed",void 0)}function g(b,c){return!0===b.isTopLevel&&setTimeout(function(){throw c}),a(b,"Failed",c)}function h(a,b,c){var d=a.shift();return void 0===d?void(b&&b()):"WaitingOnDeps"===d.state?(!1,void h(a,b,c)):void i(d,function(){h(a,b,c)},c)}function i(a,b,c){switch(a.state){case"WaitingForTurn":return e(a),void i(a,b,c);case"Failed":return void(c&&c(a.stateData));case"Executed":return void b();case"Loading":case"WaitingOnDeps":return void a.onNextStateChange.push(function(){return i(a,b,c)});case"Initialized":throw new Error("All dependencies should be loading already before pressureDependencyToExecute is called.");default:throw new Error("Impossible module state: "+a.state);}}function j(a,b){switch(a.state){case"Executed":case"Failed":return void b();default:a.onNextStateChange.push(function(){return j(a,b)});}}function k(a,b){void 0===b&&(b="anonymous");var c=q[a];return void 0===c&&(c=q[a]={url:a,urlBase:m(a),exports:Object.create(null),state:"Initialized",stateData:void 0,isTopLevel:!1,crossorigin:b,onNextStateChange:[]}),c}function l(a){return v.href=a,v.href}function m(a){return a=a.split("?")[0],a=a.split("#")[0],a.substring(0,a.lastIndexOf("/")+1)}function n(a,b){return-1===b.indexOf("://")?l("/"===b[0]?b:a+b):b}function o(){return document.baseURI||(document.querySelector("base")||window.location).href}function p(){var b=document.currentScript;if(!b)return u;if(window.HTMLImports){var c=window.HTMLImports.importForElement(b);return c?c.href:u}var d=b.ownerDocument.createElement("a");return d.href="",d.href}if(!window.define){var q=Object.create(null),r=void 0,s=0,t=void 0,u=o();window.define=function(a,b){var d=!1;r=function(){return d=!0,r=void 0,[a,b]};var f=p(),g=document.currentScript&&document.currentScript.getAttribute("crossorigin")||"anonymous";setTimeout(function(){if(!1==d){r=void 0;var h=f+"#"+s++,i=k(h,g);i.isTopLevel=!0;var l=c(i,a,b);void 0===t?e(l):j(k(t),function(){e(l)}),t=h}},0)},window.define._reset=function(){for(var a in q)delete q[a];r=void 0,s=0,t=void 0,u=o()};var v=document.createElement("a")}})();</script>

  <script>define(['./nuxeo-app.js']);</script>

  <% for (Resource resource : wrm.getResources(new ResourceContextImpl(), "web-ui", "import")) { %>
  <link rel="import" href="<%= context %><%= resource.getURI() %>">
  <% } %>

  <!-- routing -->
  <script>define(['./routing.js']);</script>

  <% if (!Framework.isDevModeSet()) { %>
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js?ts=<%= ManagementFactory.getRuntimeMXBean().getStartTime() %>');
      });
    }
  </script>
  <% } %>
</body>

</html>
