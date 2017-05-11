Feature: User

  As an Administrator I can create, edit, search for and delete users.

  Background:
    Given I login as "Administrator"
    And I click the "administration" button
    And I can see the administration menu
    And I click "Users & Groups" in the administration menu
    And I can see the users and groups page

  Scenario: Create, Edit, Search and Delete Users
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
      | password             | test          |
      | passwordConfirmation | test          |
    Then I can search for the user "jsmith"
    And I can edit the user "jsmith" with the following properties:
      | name                 | value          |
      | firstname            | Jane           |
      | email                | test2@test.com |
    And I can delete the user "jsmith"
