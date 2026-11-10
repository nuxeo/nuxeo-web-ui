import { inAdvisoryRange } from './util.mjs';

const DEPENDENCY_FIELDS = ['dependencies', 'optionalDependencies', 'peerDependencies', 'devDependencies'];
const MAX_DEPENDENTS = 25;

export function packageNameAt(key, metadata) {
  if (metadata?.name) {
    return metadata.name;
  }
  const index = key.lastIndexOf('node_modules/');
  return index >= 0 ? key.slice(index + 'node_modules/'.length) : key;
}

/** Node module resolution inside an npm v2/v3 lockfile `packages` map. */
export function resolveDependency(packages, from, name) {
  let base = from;
  for (;;) {
    const candidate = base ? `${base}/node_modules/${name}` : `node_modules/${name}`;
    if (packages[candidate]) {
      return candidate;
    }
    if (!base) {
      return null;
    }
    const index = base.lastIndexOf('/node_modules/');
    base = index >= 0 ? base.slice(0, index) : '';
  }
}

function overridesFor(overrides, name, trail = []) {
  if (!overrides || typeof overrides !== 'object') {
    return [];
  }
  return Object.entries(overrides).flatMap(([key, value]) => {
    const path = [...trail, key];
    const own =
      key === name || key.startsWith(`${name}@`)
        ? [{ path: path.join(' > '), value: typeof value === 'string' ? value : (value['.'] ?? '(nested)') }]
        : [];
    return [...own, ...(value && typeof value === 'object' ? overridesFor(value, name, path) : [])];
  });
}

/**
 * Reads a dependency declaration, including npm aliases such as `"string-width-cjs": "npm:string-width@^4.2.0"`.
 * Returns the real package name and its range, or null when the spec is not a string.
 */
export function parseDeclaration(key, spec) {
  if (typeof spec !== 'string') {
    return null;
  }
  if (!spec.startsWith('npm:')) {
    return { name: key, range: spec, alias: null };
  }
  const target = spec.slice('npm:'.length);
  const at = target.indexOf('@', 1);
  return at < 0
    ? { name: target, range: '*', alias: key }
    : { name: target.slice(0, at), range: target.slice(at + 1), alias: key };
}

/** Declarations of `name` in one dependency map, matched by real package name (aliases included). */
function declaredAs(map, name) {
  return Object.entries(map ?? {})
    .map(([key, spec]) => {
      const parsed = parseDeclaration(key, spec);
      return parsed?.name === name ? { key, ...parsed } : null;
    })
    .filter(Boolean);
}

function declarations(manifest, name) {
  return DEPENDENCY_FIELDS.flatMap((field) =>
    declaredAs(manifest?.[field], name).map((item) => {
      return { field, spec: manifest[field][item.key], ...(item.alias ? { alias: item.alias } : {}) };
    }),
  );
}

function dependentsOf(packages, name, byPath) {
  for (const [key, metadata] of Object.entries(packages)) {
    if (metadata.link) {
      continue;
    }
    for (const field of DEPENDENCY_FIELDS) {
      for (const declared of declaredAs(metadata[field], name)) {
        // node_modules paths use the declared key, which is the alias for an aliased dependency.
        const target = byPath.get(resolveDependency(packages, key, declared.key));
        if (target && target.dependents.length < MAX_DEPENDENTS) {
          target.dependents.push({
            name: key ? packageNameAt(key, metadata) : '(root project)',
            version: metadata.version ?? null,
            path: key || '(root)',
            range: declared.range,
            type: field,
            ...(declared.alias ? { alias: declared.alias } : {}),
          });
        }
      }
    }
  }
}

/**
 * Collects every resolved instance of `name` in a lockfile, whether it is inside the advisory
 * range, and who depends on it with which declared range. No remediation decision is made here.
 */
export function analyzeLockfile({ lock, manifest, name, vulnerableRange }) {
  if (typeof lock?.packages !== 'object') {
    return { kind: 'lockfile', supported: false, reason: 'Lockfile has no "packages" map (npm lockfile v1).' };
  }
  const { packages } = lock;
  const instances = Object.entries(packages)
    .filter(([key, metadata]) => key && !metadata.link && packageNameAt(key, metadata) === name)
    .map(([key, metadata]) => {
      return {
        path: key,
        version: metadata.version ?? null,
        vulnerable: inAdvisoryRange(metadata.version, vulnerableRange),
        dev: Boolean(metadata.dev),
        optional: Boolean(metadata.optional),
        dependents: [],
      };
    });
  dependentsOf(packages, name, new Map(instances.map((instance) => [instance.path, instance])));
  const rootManifest = manifest ?? packages[''] ?? {};
  return {
    kind: 'lockfile',
    supported: true,
    lockfileVersion: lock.lockfileVersion,
    instances,
    vulnerableInstances: instances.filter((instance) => instance.vulnerable !== false).length,
    directDeclaration: declarations(rootManifest, name),
    overrides: overridesFor(rootManifest.overrides, name),
    engines: rootManifest.engines ?? null,
  };
}

export function analyzeManifest({ manifest, name }) {
  return {
    kind: 'manifest',
    supported: Boolean(manifest),
    declarations: declarations(manifest, name),
    overrides: overridesFor(manifest?.overrides, name),
    packageName: manifest?.name,
    packageVersion: manifest?.version,
  };
}

/** Registry packages that depend on a vulnerable instance; newer releases of these may accept the fix. */
export function vulnerableParents(analysis) {
  const parents = new Set();
  for (const instance of (analysis.instances ?? []).filter((item) => item.vulnerable !== false)) {
    // Root and workspace manifests have no newer published version to ask npm about.
    for (const dependent of instance.dependents.filter((item) => item.path.includes('node_modules/'))) {
      parents.add(dependent.name);
    }
  }
  return [...parents];
}
