Feature: Browser

  I can browse the repository

  Background:
    Given I login as "Administrator"

  Scenario: Browse
    When I click the "browser" button
    Then I can see the tree

    # XXX - missing href in tree nodes
    # When I click "Workspaces" in the browser tree
    # Then I can see the "Workspaces" document content

