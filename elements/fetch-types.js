let typesCache;

export const _fetchTypes = async (resource) => {
  if (!typesCache) {
    resource.path = 'config/types';
    typesCache = await resource.get();
  }
  return typesCache;
};
