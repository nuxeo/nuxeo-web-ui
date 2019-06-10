Feature: Login / Logout

  As an user I can login and logout

  Scenario: Login as Administrator
    When I login as "Administrator"
    Then I am logged in as "Administrator"
    And I can see the Dashboard

  Scenario: Login as User1
    When I login as "user1"
    Then I am logged in as "User1"
    And I can see the Dashboard
