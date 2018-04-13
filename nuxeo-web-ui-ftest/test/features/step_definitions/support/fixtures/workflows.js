import Nuxeo from 'nuxeo';

fixtures.workflows = {
  start: (document, workflowId, initiator) => {
    // creating a different client to make sure the initiator of the workflow is the logged-in user
    const client = new Nuxeo({
      auth: {
        method: 'basic',
        username: initiator,
        password: fixtures.users.DEFAULT_PASSWORD,
      },
    });
    return client.operation('Context.StartWorkflow')
        .input(document)
        .params({
          id: workflowId,
        })
        .execute();
  },
};
