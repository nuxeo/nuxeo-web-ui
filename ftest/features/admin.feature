Feature: Admin center

  As an Administrator I have an Admin center
  As a member user I have no Admin center

  Scenario: Admin center as Admin
    Given I login as "Administrator"
    When I click the "administration" button
    Then I can see the administration menu

    # Analytics
    When I click "analytics" in the administration menu
    Then I can see the analytics page

    # Users & Groups
    When I click "user-group-management" in the administration menu
    Then I can see the users and groups page

    #Audit
    When I click "audit" in the administration menu
    Then I can see the audit page

    #Cloud Services
    When I click "cloud-services" in the administration menu
    Then I can see the cloud services page

  Scenario: Admin center as member user
    Given user "John" exists in group "members"
    And I login as "John"
    Then I cannot see the administration button

  Scenario: NXQL Search
    Given I login as "Administrator"
    When I click the "administration" button
    Then I can see the administration menu
    When I click "nxql" in the administration menu
    Then I can see the nxql search page
    And I can see more than 1 search results
