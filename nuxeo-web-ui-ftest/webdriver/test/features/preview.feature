Feature: Content Preview

  Document and attachment previews are well displayed on document view and actions

  Background:
    Given there is a user "John" in group "members"
    And I login as "John"
    And I have a Folder document with permission ReadWrite

  Scenario Outline:
    When I have a document with content of mime-type <mimetype>
    And I browse to the document
    Then I can see a <viewer> previewer

    Examples:
      | mimetype                                | viewer             |
      | image/png                               | nuxeo-image-viewer |
      | video/mp4                               | nuxeo-video-viewer |
      | audio/mpeg3                             | audio              |
      | application/pdf                         | nuxeo-pdf-viewer   |
      | application/vnd.oasis.opendocument.text | iframe             |
