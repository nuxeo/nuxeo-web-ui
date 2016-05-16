Feature: Select Document Type

  I can select a Document Type to create

  Background:
    When I login as "Administrator"
    And I go to the UI
    And I click the Create Document button
    Then I can see the Create Document dialog

  Scenario: Create Note
    When I select "Note"
    Then I can see the Create "Note" form

  Scenario: Create File
    When I select "File"
    Then I can see the Create "File" form

  Scenario: Create Picture
    When I select "Picture"
    Then I can see the Create "Picture" form

  Scenario: Create Folder
    When I select "Folder"
    Then I can see the Create "Folder" form

  Scenario: Create Workspace
    When I select "Workspace"
    Then I can see the Create "Workspace" form
