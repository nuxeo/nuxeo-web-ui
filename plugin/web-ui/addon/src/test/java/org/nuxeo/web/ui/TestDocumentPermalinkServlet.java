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

import static org.junit.Assert.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.junit.Before;
import org.junit.Test;

/**
 * Tests {@link DocumentPermalinkServlet}.
 */
public class TestDocumentPermalinkServlet {

    protected DocumentPermalinkServlet servlet;

    protected HttpServletRequest request;

    protected HttpServletResponse response;

    @Before
    public void setUp() {
        servlet = new DocumentPermalinkServlet();
        request = mock(HttpServletRequest.class);
        response = mock(HttpServletResponse.class);
        when(request.getContextPath()).thenReturn("/nuxeo");
    }

    @Test
    public void testRedirectToHashbangRouteForDefaultRepository() throws IOException {
        when(request.getParameter("id")).thenReturn("88bc7a54-d33a-436c-8e91-7f7ec5d8b9ea");

        servlet.doGet(request, response);

        verify(response).setStatus(HttpServletResponse.SC_MOVED_TEMPORARILY);
        verify(response).setHeader("Location", "/nuxeo/ui/#!/doc/88bc7a54-d33a-436c-8e91-7f7ec5d8b9ea");
    }

    @Test
    public void testRedirectKeepsRepositoryContext() throws IOException {
        when(request.getParameter("id")).thenReturn("12345");
        when(request.getAttribute("NXREPOSITORY")).thenReturn("other");

        servlet.doGet(request, response);

        verify(response).setHeader("Location", "/nuxeo/repo/other/ui/#!/doc/12345");
    }

    @Test
    public void testNotificationPermalinkWithRepositoryParam() throws IOException {
        when(request.getParameter("id")).thenReturn("12345");
        when(request.getParameter("repo")).thenReturn("default");

        servlet.doGet(request, response);

        verify(response).setStatus(HttpServletResponse.SC_MOVED_TEMPORARILY);
        verify(response).setHeader("Location", "/nuxeo/ui/#!/doc/default/12345");
    }

    @Test
    public void testNotificationPermalinkWithNamedRepositoryParam() throws IOException {
        when(request.getParameter("id")).thenReturn("12345");
        when(request.getParameter("repo")).thenReturn("other");

        servlet.doGet(request, response);

        verify(response).setHeader("Location", "/nuxeo/ui/#!/doc/other/12345");
    }

    @Test
    public void testMissingIdRedirectsToBaseUrl() throws IOException {
        when(request.getParameter("id")).thenReturn(null);

        servlet.doGet(request, response);

        verify(response).sendRedirect("/nuxeo/ui/");
        verify(response, never()).setHeader(org.mockito.ArgumentMatchers.eq("Location"),
                org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    public void testBlankIdRedirectsToBaseUrl() throws IOException {
        when(request.getParameter("id")).thenReturn("  ");

        servlet.doGet(request, response);

        verify(response).sendRedirect("/nuxeo/ui/");
    }

    @Test
    public void testMaliciousIdIsRejected() throws IOException {
        when(request.getParameter("id")).thenReturn("12345\r\nSet-Cookie: evil=1");

        servlet.doGet(request, response);

        verify(response).sendRedirect("/nuxeo/ui/");
        verify(response, never()).setHeader(org.mockito.ArgumentMatchers.eq("Location"),
                org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    public void testBaseUrlForDefaultRepository() {
        assertEquals("/nuxeo/ui/", servlet.getBaseUrl(request));
    }

    @Test
    public void testBaseUrlForNamedRepository() {
        when(request.getAttribute("NXREPOSITORY")).thenReturn("other");
        assertEquals("/nuxeo/repo/other/ui/", servlet.getBaseUrl(request));
    }

}
