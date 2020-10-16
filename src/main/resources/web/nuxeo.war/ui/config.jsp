<%@ page contentType="text/javascript; charset=UTF-8" %>
<%@ page trimDirectiveWhitespaces="true" %>

<%@ page import="java.util.List"%>
<%@ page import="java.lang.management.ManagementFactory"%>
<%@ page import="java.nio.file.Files"%>
<%@ page import="java.nio.file.Path"%>
<%@ page import="java.nio.file.Paths"%>

<%@ page import="org.nuxeo.ecm.core.api.repository.Repository"%>
<%@ page import="org.nuxeo.ecm.core.api.repository.RepositoryManager"%>
<%@ page import="org.nuxeo.runtime.api.Framework"%>
<%@ page import="org.nuxeo.runtime.services.config.ConfigurationService"%>

<%
  ConfigurationService cs = Framework.getService(ConfigurationService.class);
  RepositoryManager rm = Framework.getService(RepositoryManager.class);
  String defaultRepository = rm.getDefaultRepositoryName();
  String context = request.getContextPath();
%>

var Nuxeo = Nuxeo || {};
Nuxeo.UI = Nuxeo.UI || {};
Nuxeo.UI.config = <%= cs.getPropertiesAsJson("org.nuxeo.web.ui") %>;
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

<% if (!Framework.isDevModeSet()) { %>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js?ts=<%= ManagementFactory.getRuntimeMXBean().getStartTime() %>');
    });
  }
<% } %>
