#!/bin/bash -
set -e

rm -rf /tmp/push_stable/
mkdir -p /tmp/push_stable/

cp -r lib /tmp/push_stable/
cp -r dist /tmp/push_stable/

git checkout -f stable
git pull origin stable
git merge origin/master -s recursive -X theirs --no-edit

cp -r /tmp/push_stable/lib .
cp -r /tmp/push_stable/dist .

git add -f dist lib
git commit -m "Update stable branch" -m "$JOB_NAME#$BUILD_NUMBER"

rm -rf /tmp/push_stable/

git push origin stable:stable
