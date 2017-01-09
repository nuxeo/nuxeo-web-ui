Feature: Login / Logout

  As an user I can login and logout

  @critical
  Scenario: Login
    When I login as "Administrator"
    Then I am logged in as "Administrator"

  @critical
  Scenario: Logout
    When I logout
    Then I am logged out
