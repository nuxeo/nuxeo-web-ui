@ignore
Feature: Edit metadata

  I can edit metadata of a document

  Background:
    Given I login as "Administrator"

  Scenario Outline: Edit <doctype> metadata
    Given I have a <doctype> document
    When I browse to the document
    Then I can edit the <doctype> metadata

  Examples:
    |doctype  |
    |Note     |
    #|File     |
    #|Picture  |
    #|Folder   |
    #|Workspace|
