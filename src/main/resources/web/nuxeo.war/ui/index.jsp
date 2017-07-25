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
<%@ page import="org.nuxeo.common.Environment"%>
<%@ page import="org.nuxeo.runtime.api.Framework"%>
<%@ page import="org.nuxeo.ecm.web.resources.api.Resource"%>
<%@ page import="org.nuxeo.ecm.web.resources.api.ResourceContextImpl"%>
<%@ page import="org.nuxeo.ecm.web.resources.api.service.WebResourceManager"%>
<%@ page import="org.nuxeo.ecm.core.api.repository.RepositoryManager"%>
<%@ page import="org.nuxeo.common.utils.UserAgentMatcher"%>

<% WebResourceManager wrm = Framework.getService(WebResourceManager.class); %>
<% RepositoryManager rm = Framework.getService(RepositoryManager.class); %>
<% String ua = request.getHeader("user-agent"); %>

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
  <link rel="icon" sizes="192x192" href="images/touch/chrome-touch-icon-192x192.png">

  <!-- Add to homescreen for Safari on iOS -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black">
  <meta name="apple-mobile-web-app-title" content="Nuxeo">
  <link rel="apple-touch-icon" href="images/touch/apple-touch-icon.png">

  <!-- Tile icon for Win8 (144x144) -->
  <meta name="msapplication-TileImage" content="images/touch/ms-touch-icon-144x144-precomposed.png">

  <link rel="stylesheet" href="vendor/select2.css">


  <script src="vendor/jquery.js"></script>
  <script src="vendor/select2.js"></script>
  <script src="vendor/moment-with-locales.js"></script>
  <script src="vendor/alloy-editor.js"></script>

  <% for (Resource resource : wrm.getResources(new ResourceContextImpl(), "web-ui", "import")) { %>
  <link rel="import" href="<%= request.getContextPath() %>/<%= resource.getURI() %>">
  <% } %>

  <%--import dynamic user layouts--%>
  <link rel="import" href="nuxeo-user-group-management/nuxeo-view-user.html">
  <link rel="import" href="nuxeo-user-group-management/nuxeo-edit-user.html">

  <style>
    #loader {
      display: none;
    }
    #fakeDrawer {
      width: 56px;
      color: #3a3a54;
      background-color: #3a3a54;
      display: block;
      height: 100%;
      left: 0px;
      top: 0px;
      position: absolute;
      box-sizing: border-box;
      z-index: 100;
    }
    #fakeHeader {
      width: 100%;
      height: 53px;
      color: #3a3a54;
      background-color: #fff;
      box-shadow: 1px 0 0 rgba(0, 0, 0, 0.1) inset, 0 3px 5px rgba(0,0,0,0.1);
      z-index: 3;
    }
    #splash {
      position: fixed;
      top: 50%;
      left: 50%;
      /* bring your own prefixes */
      transform: translate(-50%, -50%);
    }
    .logo {
      position: fixed;
      top: 0px;
      left: 0px;
      width: 52px;
      height: 52px;
    }
    .image {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 64px;
        height: 64px;
        margin:-60px 0 0 -60px;
    }
    @-moz-keyframes spin { 100% { -moz-transform: rotate(360deg); } }
    @-webkit-keyframes spin { 100% { -webkit-transform: rotate(360deg); } }
    @keyframes spin { 100% { -webkit-transform: rotate(360deg); transform:rotate(360deg); } }
  </style>

</head>

<body class="fullbleed layout vertical">
  <nuxeo-connection url="<%= request.getContextPath() %>"
                    repository-name="<%= rm.getDefaultRepositoryName() %>"></nuxeo-connection>
  <nuxeo-app base-url="<%= request.getRequestURI() %>"
             product-name="<%= Framework.getProperty(Environment.PRODUCT_NAME) %>"></nuxeo-app>

  <div id="loader">
    <div id="fakeDrawer">
      <img draggable="false" src="themes/default/logo.png" class="logo">
    </div>
    <div id="fakeHeader">
    </div>
    <div id="splash">
      <img class="image" src="images/web-ui-loader.svg">
    </div>
  </div>

  <script src="app.js" async></script>

  <%-- Load full polyfill in IE for compatibility --%>
  <% if (UserAgentMatcher.isMSIE10OrMore(ua) || UserAgentMatcher.isMSEdge(ua)) { %>
  <script src="bower_components/webcomponentsjs/webcomponents.min.js" onload="finishLazyLoading()" async></script>
  <% } else { %>
  <script src="bower_components/webcomponentsjs/webcomponents-lite.min.js" onload="finishLazyLoading()" async></script>
  <% } %>

</body>

</html>
