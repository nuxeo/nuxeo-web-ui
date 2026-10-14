/*
 * ©2026 Hyland Software, Inc. and its affiliates. All rights reserved. 
All Hyland product names are registered or unregistered trademarks of Hyland Software, Inc. or its affiliates.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.nuxeo.web.ui;

import java.io.IOException;
import java.util.regex.Pattern;

import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Redirects RFC 3986 compliant document permalinks ({@code /ui/doc?id=<docId>}) to the Web UI
 * hashbang route ({@code /ui/#!/doc/<docId>}) so the single page application can resolve and
 * display the document.
 * <p>
 * The permalink no longer carries the {@code #!} fragment (WEBUI-1726); this servlet performs the
 * server side redirection expected by WEBUI-1728. The repository being browsed is resolved the same
 * way as {@code index.jsp}: from the {@code NXREPOSITORY} request attribute set by the rewrite rule
 * that maps {@code /repo/<name>/ui/*} to {@code /ui/*}.
 *
 * @since 2023.41
 */
public class DocumentPermalinkServlet extends HttpServlet {

    private static final long serialVersionUID = 1L;

    protected static final String REPOSITORY_ATTRIBUTE = "NXREPOSITORY";

    protected static final String DOC_ID_PARAM = "id";

    protected static final String REPOSITORY_PARAM = "repo";

    // Allowlist for document ids and repository names. Rejecting anything else (in particular
    // CR/LF and other control characters) prevents HTTP response splitting when a value is
    // reflected into the Location header.
    protected static final Pattern SAFE_VALUE = Pattern.compile("[\\w.\\-]+");

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String id = request.getParameter(DOC_ID_PARAM);
        if (id == null || !SAFE_VALUE.matcher(id).matches()) {
            response.sendRedirect(getBaseUrl(request));
            return;
        }
        String repository = request.getParameter(REPOSITORY_PARAM);
        String location;
        if (repository != null && SAFE_VALUE.matcher(repository).matches()) {
            // Notification-style permalink: the repository travels as a query parameter and is
            // mapped back into the hashbang route (/ui/#!/doc/<repo>/<id>).
            location = request.getContextPath() + "/ui/#!/doc/" + repository + "/" + id;
        } else {
            // Interactive permalink: the repository (if any) is already encoded in the request path.
            location = getBaseUrl(request) + "#!/doc/" + id;
        }
        response.setStatus(HttpServletResponse.SC_MOVED_TEMPORARILY);
        response.setHeader("Location", location);
    }

    protected String getBaseUrl(HttpServletRequest request) {
        String context = request.getContextPath();
        Object repository = request.getAttribute(REPOSITORY_ATTRIBUTE);
        if (repository == null || !SAFE_VALUE.matcher(repository.toString()).matches()) {
            return context + "/ui/";
        }
        return context + "/repo/" + repository + "/ui/";
    }

}
