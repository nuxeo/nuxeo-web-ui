Feature: Group

  As an Administrator I can create, edit search for and delete groups.

  Background:
    Given I login as "Administrator"
    And I click the "administration" button
    And I can see the administration menu
    And I click "Users & Groups" in the administration menu
    And I can see the users and groups page

  Scenario: Create, Edit, Search and Delete Users
    When I click the new user/group button
    And I select group from the dropdown menu
    Then I can see the new group form
    And I can create a group with the following properties:
      | name       | value    |
      | groupName  | managers |
      | groupLabel | Managers |
    Then I can search for the group "managers"
    And I can edit the group "managers" label as "Managers Group"
    And I can delete the group "managers"
