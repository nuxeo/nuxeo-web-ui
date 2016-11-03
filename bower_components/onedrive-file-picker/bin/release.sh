#!/bin/bash -

set -e

VERSION=$1
if [ -z "$VERSION" ]; then
  echo 'Usage: ./release.sh VERSION'
  exit 1
fi

git checkout master

# Update the version in package.json
npm version $VERSION --git-tag-version=false
git add package.json
git ci -m "Update version to $VERSION"

# branch to do the actual build
git checkout -b release

# make sure dependencies are up to date
NODE_MODULES=node_modules
if [ -d "$NODE_MODULES" ]; then
  rm -r $NODE_MODULES
fi
npm install

# build
gulp install

# freeze dependencies versions
npm shrinkwrap --dev

git add -f dist
git add npm-shrinkwrap.json
git commit -m "Release $VERSION"
git tag v$VERSION

# push demo to gh-pages
cp -r demo /tmp/onedrive-file-picker-demo
cp dist/* /tmp/onedrive-file-picker-demo/

git checkout gh-pages

cp /tmp/onedrive-file-picker-demo/* .

# Change application settings
sed -i '' 's/000000004C179FFB/000000004417C781/' oauth.js
sed -i '' 's/localhost:5000/nuxeo.github.io\/onedrive-file-picker/' oauth.js

git add index.html callback.html oauth.js onedrive-file-picker.css onedrive-file-picker.js
git commit -m "Upload demo for version $VERSION"

# cleanup
git checkout master
git branch -D release
rm -r /tmp/onedrive-file-picker-demo

# push everything
git push origin master
git push origin v$VERSION
git push origin gh-pages
