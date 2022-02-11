let schemasCache;

export const _fetchSchemas = async (resource) => {
  if (!schemasCache) {
    resource.path = 'config/schemas';
    schemasCache = await resource.get();
  }
  return schemasCache;
};
