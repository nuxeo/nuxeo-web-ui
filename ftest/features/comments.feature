Feature: Comments

  Background:
    Given user "John" exists in group "members"
    And user "Susan" exists in group "administrators"
    And I have a File document

  Scenario: I can see document comment thread with multiple comments
    Given I have the following comment thread:
      | author | text      |
      | John   | art       |
      | Susan  | books     |
      | John   | cats      |
      | John   | dogs      |
      | Susan  | expensive |
      | John   | failure   |
      | John   | general   |
      | Susan  | hardware  |
      | John   | image     |
      | John   | java      |
      | John   | kickoff   |
      | John   | languages |
    And John's comment "languages" has the following replies:
      | author | text       |
      | Susan  | portuguese |
      | John   | spanish    |
      | Susan  | french     |
      | John   | german     |
      | Susan  | english    |
      | John   | italian    |
      | Susan  | russian    |
      | Susan  | polish     |
      | Susan  | arabic     |
      | Susan  | dutch      |
      | John   | croatian   |
    And I login as "John"
    When I browse to the document
    Then I can see the comment thread has 10 visible items
    And I can see the comment thread has a total of 12 items to be loaded
    When I load all comments
    Then I can see the comment thread has 12 visible items
    And I can see my comment "languages" has a reply thread with 11 replies
    When I expand the reply thread for my comment "languages"
    Then I can see my comment "languages" has 10 visible replies
    And I can see the reply thread for my comment "languages" has a total of 11 items to be loaded
    When I load all replies for my comment "languages"
    Then I can see my comment "languages" has 11 visible replies

  Scenario: I can create a comment
    Given I login as "John"
    When I browse to the document
    Then I can see document's comment thread
    When I write a comment with the following text: "Hello, this is my first comment!"
    Then I can see the comment thread has 1 visible item
    And I can see my comment: "Hello, this is my first comment!"

  Scenario: I can edit a comment
    Given I have the following comment thread:
      | author | text  |
      | John   | art   |
      | Susan  | books |
   # User with administrator privileges can edit/remove every comment
    And I login as "Susan"
    When I browse to the document
    Then I can see my comment: "books"
    And I can see the extended options available for my comment: "books"
    And I can see John's comment: "art"
    But I can see the extended options available for John's comment: "art"
    When I edit my comment "books" with the following text: "Books recommended by Susan"
    And I can see my comment: "Books recommended by Susan"

  Scenario: I can remove a comment
    Given I have the following comment thread:
      | author | text  |
      | John   | art   |
      | Susan  | books |
   # Regular user can only edit/remove its own comments
    And I login as "John"
    When I browse to the document
    Then I can see my comment: "art"
    And I can see the extended options available for my comment: "art"
    And I can see Susan's comment: "books"
    But I cannot see the extended options available for Susan's comment: "books"
    When I remove my comment "art"
    Then I can see the comment thread has 1 visible item
    And I can see Susan's comment: "books"

  Scenario: I can reply to an existing comment
    Given I have the following comment thread:
      | author | text  |
      | John   | art   |
      | Susan  | books |
    And Susan's comment "books" has the following replies:
      | author | text         |
      | Susan  | Harry Potter |
      | John   | Narnia       |
    And I login as "John"
    When I browse to the document
    Then I can see Susan's comment: "books"
    When I reply to Susan's comment "books" with the following text: "nice choices!"
    Then I can see Susan comment "books" has 3 visible replies
