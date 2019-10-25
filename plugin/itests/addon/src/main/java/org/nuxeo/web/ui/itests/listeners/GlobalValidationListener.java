/*
 * (C) Copyright 2019 Nuxeo (http://nuxeo.com/) and others.
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
 *     Guillaume Renard
 */
package org.nuxeo.web.ui.itests.listeners;

import org.nuxeo.ecm.core.api.DocumentModel;
import org.nuxeo.ecm.core.api.event.DocumentEventTypes;
import org.nuxeo.ecm.core.api.validation.DocumentValidationException;
import org.nuxeo.ecm.core.event.Event;
import org.nuxeo.ecm.core.event.EventListener;
import org.nuxeo.ecm.core.event.impl.DocumentEventContext;

/**
 * Tests listener that throws a {@link DocumentValidationException} when a Validation document is created or saved.
 *
 * @since 11.1
 */
public class GlobalValidationListener implements EventListener {

    @Override
    public void handleEvent(Event event) {
        if (event.getContext() instanceof DocumentEventContext) {
            DocumentEventContext docCtx = (DocumentEventContext) event.getContext();
            DocumentModel targetDoc = docCtx.getSourceDocument();
            if ("Validation".equals(targetDoc.getType()) && (DocumentEventTypes.ABOUT_TO_CREATE.equals(event.getName())
                    || DocumentEventTypes.BEFORE_DOC_UPDATE.equals(event.getName()))) {
                Long first = (Long) targetDoc.getPropertyValue("validation:firstNumber");
                Long second = (Long) targetDoc.getPropertyValue("validation:secondNumber");
                if (first + second != 10) {
                    event.markBubbleException();
                    throw new DocumentValidationException("sum.of.numbers.must.be.equal.ten");
                }
            }
        }
    }

}
