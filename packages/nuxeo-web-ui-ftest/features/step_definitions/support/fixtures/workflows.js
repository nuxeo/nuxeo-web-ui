import Nuxeo from 'nuxeo';

import { After } from '@cucumber/cucumber';
import nuxeo from '../services/client';

global.runningWorkflows = [];
global.fixtures = {};
fixtures.workflows = {
  start: async (document, workflowModelName, initiator) => {
    // creating a different client to make sure the initiator of the workflow is the logged-in user
    const client = new Nuxeo({
      auth: {
        method: 'basic',
        username: initiator,
        password: fixtures.users.DEFAULT_PASSWORD,
        headers: { 'nx-es-sync': 'true' },
      },
      baseURL: process.env.NUXEO_URL,
    });

    const workflowOptions = {
      attachedDocumentIds: [document.uid],
    };

    const workflow = await client.workflows().start(workflowModelName, workflowOptions);
    await runningWorkflows.push(workflow.id);
    return workflow;
  },

  delete: (workflowInstanceId) => {
    nuxeo.workflows().delete(workflowInstanceId);
  },

  removeInstance: (workflowInstanceId) => {
    const index = runningWorkflows.indexOf(workflowInstanceId);
    if (index !== -1) {
      runningWorkflows.splice(index, 1);
    }
  },
};

After(() =>
  Promise.all(
    Object.keys(runningWorkflows).map((index) => {
      const workflowInstanceId = runningWorkflows[index];
      return fixtures.workflows.removeInstance(workflowInstanceId);
    }),
  ),
);
