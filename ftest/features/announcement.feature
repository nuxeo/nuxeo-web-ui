Feature: Admin announcements banner

  As an Administrator I can display a message at the top of the application for every user
  As an Administrator I can turn that message off again

  Background:
    Given I login as "Administrator"
    # The announcement is persistent server-side state shared by every scenario, so start from a
    # known "off" state instead of relying on whatever a previous run left behind.
    And I am on the announcement page
    And the announcement banner is turned off

  Scenario: Announcement page is reachable from the administration menu
    When I click the "administration" button
    Then I can see the administration menu
    When I click "announcement" in the administration menu
    Then I can see the announcement page

  Scenario: Turning the announcement banner on and off
    Then I cannot see the announcement banner
    When I enable the announcement banner with message "Scheduled maintenance on Saturday"
    Then I can see the announcement banner with message "Scheduled maintenance on Saturday"
    When I disable the announcement banner
    Then I cannot see the announcement banner

  Scenario: Announcement banner with a link
    When I enable the announcement banner with message "Read the maintenance plan" and link "https://example.com/maintenance"
    Then I can see the announcement banner with message "Read the maintenance plan"
    And the announcement banner has a link to "https://example.com/maintenance"
    When I disable the announcement banner
    Then I cannot see the announcement banner
