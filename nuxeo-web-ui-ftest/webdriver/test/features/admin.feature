Feature: Admin center

  As an Administrator I have an Admin center

  Background:
    Given I login as "Administrator"

  Scenario: Admin center
    When I click the "administration" button
    Then I can see the administration menu

    # Analytics
    When I click "Analytics" in the administration menu
    Then I can see the analytics page

    # Users & Groups
    When I click "Users & Groups" in the administration menu
    Then I can see the users and groups page
