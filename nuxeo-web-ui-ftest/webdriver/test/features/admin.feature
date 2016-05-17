Feature: Admin center

  As an Administrator I have an Admin center

  Background:
    Given I login as "Administrator"

  Scenario: Admin center
    When I click the "administration" button
    Then I can see the administration menu
