/*
 * (C) Copyright 2016 Nuxeo SA (http://nuxeo.com/) and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Contributors:
 *   Gabriel Barata <gbarata@nuxeo.com>
 */

var taskResponse = {
  "entity-type": "tasks",
  "entries": [{
    "entity-type": "task",
    "name": "wf.parallelDocumentReview.chooseParticipants.title",
    "workflowInstanceId": "84ba0c6f-2fb7-46b7-afdc-084f0143d777",
    "workflowModelName": "ParallelDocumentReview",
    "dueDate": "2016-01-28T17:29:22.05Z",
    "targetDocumentIds": [{"id": "739cfadf-ab66-4611-aafc-9e3c96aa367d"}],
  }, {
    "entity-type": "task",
    "name": "wf.serialDocumentReview.chooseParticipants",
    "workflowInstanceId": "7dce44c3-ed75-47c2-9433-6ca92ff8a866",
    "workflowModelName": "SerialDocumentReview",
    "dueDate": "2016-02-01T17:39:12.06Z",
    "targetDocumentIds": [{"id": "b00985aa-48e2-409f-890b-4f6e51f6a150"}]
  }]
};

var emptyTaskResponse = {
  "entity-type": "tasks",
  "entries": []
}

var workflowResponse = {
  "entity-type": "workflow",
  "initiator": "Administrator"
};

var docResponse1 = {
  "entity-type": "document",
  "uid": "739cfadf-ab66-4611-aafc-9e3c96aa367d",
  "path": "/default-domain/workspaces/My Workspace/My Folder/Puppy",
  "type": "File",
  "properties": {
    "dc:title": "Puppy"
  }
};

var docResponse2 = {
  "entity-type": "document",
  "uid": "b00985aa-48e2-409f-890b-4f6e51f6a150",
  "path": "/default-domain/workspaces/My Workspace/My Folder/Kitty",
  "type": "File",
  "properties": {
    "dc:title": "Kitty"
  }
};

function validateDocEnum(docenum, docResponse) {
  var a = docenum.$$('#taskDoc');
  expect(a.href.indexOf(docResponse.path.split(' ').join('%20'))).to.be.above(-1);
  expect(a.text).to.be.equal(docResponse.properties['dc:title']);
}

function validateRecord(record, user, date, docResponse) {
  var initiator = record.$$('#initiator'),
      dueDate = record.$$('#due-date'),
      docEnums =  record.getElementsByTagName('nuxeo-task-widget-doc-enum');
  expect(initiator.text).to.be.equal(user);
  expect(dueDate.textContent.replace("Due date: ", "")).to.be.equal(date);
  expect(docEnums.length).to.be.equal(1);
  validateDocEnum(docEnums[0], docResponse);
}
