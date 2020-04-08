Feature: Create and Edit Pictures

  I can create and edit a Picture document

  Background:
    Given user "John" exists in group "members"
    And I login as "John"
    And I have a Workspace document
    And I have permission ReadWrite for this document
    And I browse to the document

  Scenario: Create a Picture
    When I click the Create Document button
    And I select Picture from the Document Type menu
    And I create a document with the following properties:
      | name         | value             |
      | title        | my title          |
      | description  | my description    |
      | content      | sample.png        |
      | nature       | Application       |
      | subjects     | Gastronomy,Comics |
    Then I see the Picture page
    And I can see Picture metadata with the following properties:
      | name         | value                            |
      | title        | my title                         |
      | description  | my description                   |
      | nature       | Application                      |
      | subjects     | Daily life/Gastronomy,Art/Comics |
    And I can see the inline nuxeo-image-viewer previewer
    And I can see the picture formats panel

    Scenario: Edit a Picture
      Given I have a Picture document
      When I browse to the document
      Then I can edit the following properties in the Picture metadata:
        | name         | value                |
        | title        | my title             |
        | description  | my description       |
        | nature       | Internship report    |
        | subjects     | Medicine,Video games |
        | coverage     | Canada               |
      Then I see the Picture page
      And I can see Picture metadata with the following properties:
        | name         | value                                   |
        | title        | my title                                |
        | description  | my description                          |
        | nature       | Internship report                       |
        | subjects     | Science/Medicine,Daily life/Video games |
        | coverage     | North-america/Canada                    |
      And I can see the picture formats panel