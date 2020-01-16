Feature: User

  As an Administrator I can create, edit, search for and delete users.

  Background:
    Given user "j?doe" exists
    And user "John" exists in group "powerusers"
    And I login as "John"    
    And I click the "administration" button    
    And I can see the administration menu
    And I click "user-group-management" in the administration menu
    And I can see the users and groups page

  Scenario: Create Users
    When I click the new user/group button
    And I select user from the dropdown menu
    Then I can see the new user form
    And I can create a user with the following properties:
      | name                 | value         |
      | username             | jsmith        |
      | firstname            | John          |
      | lastname             | Smith         |
      | company              | Nuxeo         |
      | email                | test@test.com |
      | group                | members       |
      | password             | test          |
      | passwordConfirmation | test          |

  Scenario: Search for Users
    Then I can search for the user "j?doe"
    And I can see the user has the email "j?doe@test.com"

  Scenario: Edit Users
    Then I can edit the user "j?doe" with the following properties:
      | name                 | value          |
      | firstname            | Jane           |
      | email                | test2@test.com |

  Scenario: Delete Users
    Then I can delete the user "j?doe"
