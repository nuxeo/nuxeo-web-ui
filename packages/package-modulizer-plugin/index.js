const { resolve, join, basename } = require('path');
const glob = require('glob');

// inspired by https://github.com/rmarscher/virtual-module-webpack-plugin/
class PackageModulizerPlugin {
  constructor(options) {
    this.options = options;
  }

  apply(compiler) {
    let packages;
    if (typeof this.options.packages === 'string') {
      packages = [this.options.packages];
    }
    if (Array.isArray(this.options.packages)) {
      ({ packages } = this.options);
    }
    if (typeof this.options.contents === 'function') {
      packages = this.options.packages();
    }

    let root = this.options.root || 'addons';
    if (typeof root === 'function') {
      root = this.options.root();
    }
    const rootPath = resolve(root);

    /* compiler.hooks.afterEnvironment.tap('PackageModulizerPlugin', ...) */
    compiler.hooks.contextModuleFactory.tap('PackageModulizerPlugin', () => {
      const rootChildren = [];
      packages.forEach((pkg) => {
        let includes = [];
        if (typeof pkg.include === 'string') {
          includes = [pkg.include];
        } else if (Array.isArray(pkg.include)) {
          ({ include: includes } = pkg);
        } else if (typeof pkg.include === 'function') {
          includes = pkg.include();
        }
        const pkgRootPath = typeof pkg.rootPath === 'function' ? pkg.rootPath() : pkg.rootPath;
        const pkgTargetPath = typeof pkg.targetPath === 'function' ? pkg.targetPath() : pkg.targetPath;
        rootChildren.push(basename(pkgRootPath));
        let files;

        if (!resolve(pkgRootPath).startsWith(rootPath)) {
          // here we're loading a package outside the root package folder ("addons"), which means that
          // we'll have to cache it's resources under "addons", to allow dynamic imports to work
          files = glob.sync(join(pkgRootPath, '**'));
          files.forEach((file) => {
            // files covered by the includes can be handled later
            const skip = includes.some((include) => file.startsWith(join(pkgRootPath, include)));
            if (!skip) {
              PackageModulizerPlugin.populateFilesystem({
                fs: compiler.inputFileSystem,
                modulePath: resolve(join(rootPath, basename(pkgRootPath), file.replace(pkgRootPath, ''))),
                originalPath: file,
              });
            }
          });
          compiler.hooks.emit.tapAsync('PackageModulizerPlugin', (compilation, callback) => {
            // make the files watchable
            files.forEach((file) => compilation.fileDependencies.add(resolve(file)));
            callback();
          });
        }

        // cache modules to be dynamically imported
        files = [];
        includes.forEach((include) => {
          files = files.concat(glob.sync(join(pkgRootPath, include, '**')));
        });
        files.forEach((file) =>
          PackageModulizerPlugin.populateFilesystem({
            fs: compiler.inputFileSystem,
            modulePath: resolve(join(pkgTargetPath, file.replace(pkgRootPath, ''))),
            originalPath: file,
          }),
        );
      });
      compiler.inputFileSystem._readdirStorage.data.set(rootPath, [null, rootChildren]);
    });
  }

  static populateFilesystem(options) {
    const { fs, modulePath, originalPath } = options;
    // eslint-disable-next-line no-console
    console.log(`[package-modulizer-plugin] populating cached fs with "${modulePath}" from "${originalPath}"`);

    let stats;
    try {
      stats = fs.fileSystem.statSync(modulePath);
    } catch {
      stats = fs.fileSystem.statSync(originalPath);
    }
    fs._statStorage.data.set(modulePath, [null, stats]);
    if (stats.isDirectory()) {
      let children = fs.fileSystem.readdirSync(originalPath);
      try {
        children = children.concat(fs.fileSystem.readdirSync(modulePath));
      } catch {}
      fs._readdirStorage.data.set(modulePath, [null, children]);
    } else if (stats.isFile()) {
      fs._readFileStorage.data.set(modulePath, [null, fs.fileSystem.readFileSync(originalPath)]);
    }
  }
}

module.exports = PackageModulizerPlugin;
