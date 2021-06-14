Feature: Browser

  I can browse the repository

  Background:
    Given user "John" exists in group "members"
    And I login as "John"

  Scenario: Browse
    When I click the "browser" button
    Then I can see the browser tree
    And I can see the "Domain" browser tree node
    When I click "Domain" in the browser tree
    Then I can see the "Workspaces" browser tree node
    And I can see the "Templates" child document is at position 1
    And I can see the "Sections" child document is at position 2
    And I can see the "Workspaces" child document is at position 3
    When I sort the content by "dc:title" in "asc" order
    Then I can see the "Templates" child document is at position 2
    And I can see the "Sections" child document is at position 1
    And I can see the "Workspaces" child document is at position 3
    When I sort the content by "dc:title" in "desc" order
    Then I can see the "Templates" child document is at position 2
    And I can see the "Sections" child document is at position 3
    And I can see the "Workspaces" child document is at position 1
    When I click "Workspaces" in the browser tree
    Then I can see the "Workspaces" document
    When I click "Domain" in the browser tree
    Then I can see the "Sections" browser tree node
    When I click "Sections" in the browser tree
    Then I can see the "Sections" document
    When I click "Domain" in the browser tree
    Then I can see the "Templates" browser tree node
    When I click "Templates" in the browser tree
    Then I can see the "Templates" document

  Scenario: Browse to a document page
    Given I have a File document
    When I browse to the "permissions" document page
    Then I can see the permissions page
