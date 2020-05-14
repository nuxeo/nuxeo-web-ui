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
<%@ page trimDirectiveWhitespaces="true" %>
<%@ page contentType="text/html; charset=UTF-8" %>
<%@ page import="java.util.List"%>
<%@ page import="java.lang.management.ManagementFactory"%>
<%@ page import="java.nio.file.Files"%>
<%@ page import="java.nio.file.Path"%>
<%@ page import="java.nio.file.Paths"%>
<%@ page import="org.nuxeo.common.Environment"%>
<%@ page import="org.nuxeo.runtime.api.Framework"%>
<%@ page import="org.nuxeo.runtime.services.config.ConfigurationService"%>
<%@ page import="org.nuxeo.ecm.web.resources.api.Resource"%>
<%@ page import="org.nuxeo.ecm.web.resources.api.ResourceContextImpl"%>
<%@ page import="org.nuxeo.ecm.web.resources.api.service.WebResourceManager"%>
<%@ page import="org.nuxeo.ecm.core.api.repository.Repository"%>
<%@ page import="org.nuxeo.ecm.core.api.repository.RepositoryManager"%>
<%@ page import="org.nuxeo.common.utils.UserAgentMatcher"%>
<%@ page import="org.nuxeo.connect.packages.PackageManager"%>
<%@ page import="org.nuxeo.connect.update.PackageType"%>

<%
  WebResourceManager wrm = Framework.getService(WebResourceManager.class);
  ConfigurationService cs = Framework.getService(ConfigurationService.class);
  PackageManager pm = Framework.getService(PackageManager.class);
  String ua = request.getHeader("user-agent");
  String context = request.getContextPath();
  RepositoryManager rm = Framework.getService(RepositoryManager.class);
  String defaultRepository = rm.getDefaultRepositoryName();
  String repository = (String) request.getAttribute("NXREPOSITORY");
  String baseUrl;

  if (repository == null) {
    repository = defaultRepository;
    baseUrl = context + "/ui/";
  } else {
    baseUrl = context + "/repo/" + repository + "/ui/";
  }
%>

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
  <nuxeo-connection url="<%= context %>" repository-name="<%= repository %>"></nuxeo-connection>
  <nuxeo-app base-url="<%= baseUrl %>"
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

  <script src="vendor/webcomponentsjs/webcomponents-loader.js"></script>

  <script src="vendor/html-imports/html-imports.min.js"></script>

  <script src="vendor/web-animations/web-animations-next-lite.min.js"></script>

  <script>
    var Nuxeo = Nuxeo || {};
    Nuxeo.UI = Nuxeo.UI || {};
    Nuxeo.UI.config = <%= cs.getPropertiesAsJson("org.nuxeo.web.ui") %>;
    Nuxeo.UI.bundles = [
      <% for (Resource resource : wrm.getResources(new ResourceContextImpl(), "web-ui", "import")) { %>
      '<%= context %><%= resource.getURI() %>',
      <% } %>
      <% for (String pn : pm.listInstalledPackagesNames(PackageType.ADDON)) {
        if (Files.exists(Paths.get("nxserver/nuxeo.war/ui/" + pn + ".bundle.js"))) { %>
          '<%= pn %>',
        <% } else if (Files.exists(Paths.get("nxserver/nuxeo.war/ui/" + pn + ".html"))) { %>
          '<%= context %><%= "/ui/" + pn + ".html" %>',
        <% } %>
      <% } %>
    ];
    Nuxeo.UI.repositories = [
      <% for (Repository repo : rm.getRepositories()) { %>
        {
          name: '<%= repo.getName() %>',
          label: '<%= repo.getLabel() %>',
          href: '<%= context + "/repo/" + repo.getName() + "/ui/" %>',
          isDefault: <%= defaultRepository.equals(repo.getName())  %>,
        },
      <% } %>
    ];
  </script>

  <script src="main.bundle.js"></script>

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
