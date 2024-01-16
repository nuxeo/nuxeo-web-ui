Feature: Login / Logout

  As an user I can login and logout

  @critical
  Scenario: Login as Administrator
    When I login as "Administrator"
    Then I am logged in as "Administrator"

  @critical
  Scenario: Login as member user
    Given user "John" exists in group "members"
    When I login as "John"
    Then I am logged in as "John"

  @critical
  Scenario: Logout
    When I logout
    Then I am logged out
