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

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;

import javax.inject.Inject;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.nuxeo.ecm.core.api.DocumentLocation;
import org.nuxeo.ecm.core.api.IdRef;
import org.nuxeo.ecm.core.api.impl.DocumentLocationImpl;
import org.nuxeo.ecm.platform.url.DocumentViewImpl;
import org.nuxeo.ecm.platform.url.api.DocumentView;
import org.nuxeo.ecm.platform.url.api.DocumentViewCodecManager;
import org.nuxeo.runtime.test.runner.Deploy;
import org.nuxeo.runtime.test.runner.Features;
import org.nuxeo.runtime.test.runner.FeaturesRunner;
import org.nuxeo.runtime.test.runner.RuntimeFeature;

/**
 * Tests the {@link JSFNotificationDocumentIdCodec}.
 *
 * @since 8.10
 */
@RunWith(FeaturesRunner.class)
@Features(RuntimeFeature.class)
@Deploy({ "org.nuxeo.ecm.platform.url.core", "org.nuxeo.web.ui:OSGI-INF/url-codecs-web-contrib.xml" })
public class TestWebNotificationCodec {

    @Inject
    protected DocumentViewCodecManager codecService;

    @Test
    public void testNotificationCodec() {

        assertNotNull(codecService.getCodec("notificationDocId"));

        assertNull(codecService.getDocumentViewFromUrl("notificationDocId", "bad/URL", false, null));
        assertNull(
                codecService.getDocumentViewFromUrl("notificationDocId", "ui/#!/badPrefix/default/12345", false, null));

        DocumentView docView = codecService.getDocumentViewFromUrl("notificationDocId", "ui/#!/doc/default/12345",
                false, null);
        assertNotNull(docView);
        DocumentLocation docLocation = docView.getDocumentLocation();
        assertEquals("default", docLocation.getServerName());
        assertEquals("12345", docLocation.getIdRef().toString());

        assertNull(codecService.getUrlFromDocumentView("notificationDocId",
                new DocumentViewImpl((DocumentLocation) null), false, null));

        String url = codecService.getUrlFromDocumentView("notificationDocId",
                new DocumentViewImpl(new DocumentLocationImpl("default", new IdRef("12345"))), false, null);
        assertEquals("ui/#!/doc/default/12345", url);
    }

}
