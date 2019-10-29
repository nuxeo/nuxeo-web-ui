Feature: CSV Import

  Scenario: I can import a CSV file and navigate to the created documents
    Given user "John" exists in group "members"
    And I login as "John"
    And I have a Workspace document
    And I have permission ReadWrite for this document
    And I browse to the document

    When I click the Create Document button
    And I go to the importCSV tab
    And I import the csv-import-sample.csv file
    Then I can see the "my_folder" child document is at position "1"
    When I navigate to "my_folder" child
    Then I can see the "file1" child document is at position "1"
    When I navigate to "file1" child
    Then I can see File metadata with the following properties:
      | name         | value                                 |
      | title        | file1                                 |
      | description  | doc in folder                         |
      | nature       | Letter                                |
      | subjects     | Daily life/Gastronomy,Society/Company |
