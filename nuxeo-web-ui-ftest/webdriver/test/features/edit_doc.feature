Feature: Edit Document

  I can edit a Document

  Background:
    Given I login as "Administrator"
    And I click the Create Document button

  Scenario Outline: Edit <doctype>
    Given I select <doctype> from the Document Type menu
    And I create a <doctype>
    When I go to the <doctype>
    And I select "Edit" from the View menu
    Then I can edit the <doctype>

  Examples:
    |doctype  |
    |Note     |
    |File     |
    |Picture  |
    |Folder   |
    |Workspace|
