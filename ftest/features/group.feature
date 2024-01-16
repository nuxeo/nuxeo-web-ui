Feature: Group

  As an Administrator I can create, edit search for and delete groups.

  Background:
    Given I have the following groups
      | name           | label    |
      | mana?gers      | Managers |
      | managers/webui |          |
    Given user "John" exists in group "powerusers"
    And I login as "John"    
    And I click the "administration" button
    And I can see the administration menu
    And I click "user-group-management" in the administration menu
    And I can see the users and groups page

  Scenario: Create Groups
    When I click the new user/group button
    And I select group from the dropdown menu
    Then I can see the new group form
    And I can create a group with the following properties:
      | name       | value    |
      | groupName  | managers2 |
      | groupLabel | Managers2 |

  Scenario: Search Groups
    Then I can search for the following groups
      | name      | label    |
      | mana?gers | Managers |

  Scenario: Edit Groups
    Then I can edit the following groups
      | name           | newLabel                  |
      | mana?gers      | Managers Group            |
      | managers/webui | Managers Group for web ui |

  Scenario: Delete Groups
    Then I can delete the following groups
      | name      | label    |
      | mana?gers | Managers |
