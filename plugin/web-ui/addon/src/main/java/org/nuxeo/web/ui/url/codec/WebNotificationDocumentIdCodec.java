/*
 * ©2023 Hyland Software, Inc. and its affiliates. All rights reserved. 
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
 *
 * Contributors:
 *     Antoine Taillefer <ataillefer@nuxeo.com>
 */
package org.nuxeo.web.ui.url.codec;

import java.util.HashMap;
import java.util.Map;

import org.nuxeo.ecm.core.api.DocumentLocation;
import org.nuxeo.ecm.core.api.IdRef;
import org.nuxeo.ecm.core.api.impl.DocumentLocationImpl;
import org.nuxeo.ecm.platform.url.DocumentViewImpl;
import org.nuxeo.ecm.platform.url.api.DocumentView;
import org.nuxeo.ecm.platform.url.service.AbstractDocumentViewCodec;

/**
 * Codec handling document URL pointing to the Web UI for notification templates.
 * <p>
 * The URL uses the RFC 3986 compliant permalink format (no {@code #!} fragment) introduced by
 * WEBUI-1726: {@code ui/doc?repo=<serverName>&id=<docId>}. The {@code DocumentPermalinkServlet}
 * redirects it to the Web UI hashbang route so the single page application can resolve the document.
 *
 * @since 8.10
 */
public class WebNotificationDocumentIdCodec extends AbstractDocumentViewCodec {

    protected static final String WEB_UI_URL_PREFIX = "ui";

    protected static final String REPOSITORY_PARAM = "repo";

    protected static final String DOC_ID_PARAM = "id";

    @Override
    public String getUrlFromDocumentView(DocumentView docView) {
        DocumentLocation docLoc = docView.getDocumentLocation();
        if (docLoc == null) {
            return null;
        }
        IdRef docRef = docLoc.getIdRef();
        if (docRef == null) {
            return null;
        }
        StringBuilder url = new StringBuilder(WEB_UI_URL_PREFIX).append('/').append(getPrefix()).append('?');
        String serverName = docLoc.getServerName();
        if (serverName != null) {
            url.append(REPOSITORY_PARAM).append('=').append(serverName).append('&');
        }
        url.append(DOC_ID_PARAM).append('=').append(docRef);
        return url.toString();
    }

    @Override
    public DocumentView getDocumentViewFromUrl(String url) {
        String path = url;
        if (path.startsWith("/")) {
            path = path.substring(1);
        }
        int queryIndex = path.indexOf('?');
        if (queryIndex < 0) {
            return null;
        }
        String prefix = path.substring(0, queryIndex);
        if (!(WEB_UI_URL_PREFIX + "/" + getPrefix()).equals(prefix)) {
            return null;
        }
        Map<String, String> params = parseQuery(path.substring(queryIndex + 1));
        String id = params.get(DOC_ID_PARAM);
        if (id == null || id.isEmpty()) {
            return null;
        }
        return new DocumentViewImpl(new DocumentLocationImpl(params.get(REPOSITORY_PARAM), new IdRef(id)));
    }

    protected Map<String, String> parseQuery(String query) {
        Map<String, String> params = new HashMap<>();
        for (String pair : query.split("&")) {
            int eq = pair.indexOf('=');
            if (eq > 0) {
                params.put(pair.substring(0, eq), pair.substring(eq + 1));
            }
        }
        return params;
    }

}
