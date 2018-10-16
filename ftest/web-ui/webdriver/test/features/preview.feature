Feature: Content Preview

  Document and attachment previews are well displayed on document view and actions

  Background:
    Given user "John" exists in group "members"
    And I login as "John"
    And I have a Folder document
    And I have permission ReadWrite for this document

  Scenario Outline: Inline previewer for File document with different types of blobs as content
    When I have a File document
    And This document has file "<file>" for content
    And I browse to the document
    Then I can see the inline <viewer> previewer

    Examples:
      | file       | viewer             |
      | sample.png | nuxeo-image-viewer |
      | sample.mp4 | nuxeo-video-viewer |
      | sample.mp3 | audio              |
      | sample.pdf | nuxeo-pdf-viewer   |
      | sample.odt | iframe             |
      | sample.txt | iframe             |

  Scenario: Previewer for Note document
    When I have a Text Note
    And I browse to the document
    Then I can see the inline marked-element previewer

  Scenario Outline: Previewer for File document with different types of blobs as content
    When I have a File document
    And This document has file "<file>" for content
    And I browse to the document
    And I click the preview button
    Then I can see a <viewer> previewer

    Examples:
      | file       | viewer             |
      | sample.png | nuxeo-image-viewer |
      | sample.mp4 | nuxeo-video-viewer |
      | sample.mp3 | audio              |
      | sample.pdf | nuxeo-pdf-viewer   |
      | sample.odt | iframe             |
      | sample.txt | iframe             |

  Scenario Outline: Previewer for File document with different types of blobs as attachment
    When I have a File document
    And This document has file "<file>" for attachment
    And I browse to the document
    And I click the preview button for the attachment
    Then I can see a <viewer> previewer

    Examples:
      | file       | viewer             |
      | sample.png | nuxeo-image-viewer |
      | sample.mp4 | nuxeo-video-viewer |
      | sample.mp3 | audio              |
      | sample.pdf | nuxeo-pdf-viewer   |
      | sample.odt | iframe             |
      | sample.txt | iframe             |
