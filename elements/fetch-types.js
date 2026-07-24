let typesPromise;

export const _fetchTypes = (resource) => {
  if (!typesPromise) {
    resource.path = 'config/types';
    // cache the in-flight promise so concurrent callers share a single config/types request;
    // clear it on failure so a later call can retry
    typesPromise = resource.get().catch((e) => {
      typesPromise = undefined;
      throw e;
    });
  }
  return typesPromise;
};
