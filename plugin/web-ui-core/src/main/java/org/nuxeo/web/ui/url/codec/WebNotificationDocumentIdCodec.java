/*
 * (C) Copyright Nuxeo Corp. (http://nuxeo.com/)
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

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.apache.commons.lang.StringUtils;
import org.nuxeo.ecm.core.api.DocumentLocation;
import org.nuxeo.ecm.core.api.IdRef;
import org.nuxeo.ecm.core.api.impl.DocumentLocationImpl;
import org.nuxeo.ecm.platform.url.DocumentViewImpl;
import org.nuxeo.ecm.platform.url.api.DocumentView;
import org.nuxeo.ecm.platform.url.service.AbstractDocumentViewCodec;

/**
 * Codec handling document URL pointing to the Web UI for notification templates.
 *
 * @since 8.10
 */
public class WebNotificationDocumentIdCodec extends AbstractDocumentViewCodec {

    protected static final List<String> WEB_UI_URL_PREFIXES = Arrays.asList("ui", "#!");

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
        List<String> fragments = new ArrayList<String>();
        fragments.addAll(WEB_UI_URL_PREFIXES);
        fragments.add(getPrefix());
        fragments.add(docLoc.getServerName());
        fragments.add(docRef.toString());
        return StringUtils.join(fragments, "/");
    }

    @Override
    public DocumentView getDocumentViewFromUrl(String url) {
        String path = url;
        if (path.startsWith("/")) {
            path = path.substring(1);
        }
        String[] fragments = path.split("/");
        int prefixCount = WEB_UI_URL_PREFIXES.size();
        if (fragments.length < prefixCount + 3 || !getPrefix().equals(fragments[prefixCount])) {
            return null;
        }
        return new DocumentViewImpl(
                new DocumentLocationImpl(fragments[prefixCount + 1], new IdRef(fragments[prefixCount + 2])));
    }

}
