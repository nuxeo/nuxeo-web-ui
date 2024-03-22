<%@ page contentType="text/javascript; charset=UTF-8" %>
<%@ page trimDirectiveWhitespaces="true" %>

<%@ page import="java.util.List"%>
<%@ page import="java.lang.management.ManagementFactory"%>
<%@ page import="java.nio.file.Files"%>
<%@ page import="java.nio.file.Path"%>
<%@ page import="java.nio.file.Paths"%>

<%@ page import="org.nuxeo.connect.packages.PackageManager"%>
<%@ page import="org.nuxeo.connect.update.PackageType"%>
<%@ page import="org.nuxeo.ecm.web.resources.api.Resource"%>
<%@ page import="org.nuxeo.ecm.web.resources.api.ResourceContextImpl"%>
<%@ page import="org.nuxeo.ecm.web.resources.api.service.WebResourceManager"%>
<%@ page import="org.nuxeo.ecm.core.api.repository.Repository"%>
<%@ page import="org.nuxeo.ecm.core.api.repository.RepositoryManager"%>
<%@ page import="org.nuxeo.runtime.api.Framework"%>
<%@ page import="org.nuxeo.runtime.services.config.ConfigurationService"%>

<%
  WebResourceManager wrm = Framework.getService(WebResourceManager.class);
  ConfigurationService cs = Framework.getService(ConfigurationService.class);
  PackageManager pm = Framework.getService(PackageManager.class);
  String context = request.getContextPath();
  RepositoryManager rm = Framework.getService(RepositoryManager.class);
  String defaultRepository = rm.getDefaultRepositoryName();
%>

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
    <% if (!repo.isHeadless()) { %>
      {
        name: '<%= repo.getName() %>',
        label: '<%= repo.getLabel() %>',
        href: '<%= context + "/repo/" + repo.getName() + "/ui/" %>',
        isDefault: <%= defaultRepository.equals(repo.getName()) %>,
      },
    <%  } %>
  <% } %>
];
<% if (Files.exists(Paths.get("nxserver/nuxeo.war/ui/routing.html"))) { %>
  if (!Nuxeo.UI.config.router) {
    Nuxeo.UI.config.router = {};
  }
  if (Nuxeo.UI.config.router.htmlImport === undefined) {
    Nuxeo.UI.config.router.htmlImport = true;
  }
<% } %>

<% if (!Framework.isDevModeSet()) { %>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js?ts=<%= ManagementFactory.getRuntimeMXBean().getStartTime() %>');
    });
  }
<% } %>
