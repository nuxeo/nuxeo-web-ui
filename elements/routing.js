/**
@license
(C) Copyright Nuxeo Corp. (http://nuxeo.com/)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import page from '@nuxeo/page/page.mjs';

const { app } = Nuxeo.UI;

// strip final /
page.base(app.baseUrl.replace(/\/$/, ''));

// Middleware
function scrollToTop(ctx, next) {
  next();
}

// Routes
page('*', scrollToTop, (ctx, next) => {
  next();
});

page('/', () => {
  page.redirect('/home');
});

page('/home', () => {
  app.show('home');
});

page('/browse', () => {
  app.load('browse', '', '/', 'view');
});

// /browse/<path>@<action>
page(/\/browse\/([\s\S]*)?/, (data) => {
  if (!data.state.contentView) {
    app.currentContentView = null;
  }
  const searchParams = new URLSearchParams(data.querystring);
  app.load('browse', '', `/${data.params[0]}`, searchParams.get('p') || 'view');
});

page('/search/:searchName', (data) => {
  // trigger search when navigating to it directly
  if (page.len === 0) {
    app._searchOnLoad = true;
  }
  app.searchName = data.params.searchName;
  app.show('search');
});

page('/doc/:repo?/:id/', (data) => {
  if (!data.state.contentView) {
    app.currentContentView = null;
  }
  const searchParams = new URLSearchParams(data.querystring);
  app.load('browse', data.params.id, '', searchParams.get('p') || 'view');
});

page('/admin/:tab?', (data) => {
  // prevent currentUser from being undefined
  app.$.nxcon.connect().then(() => {
    // block access to admin center to non-admin/non-power users
    const hasPermission =
      app.currentUser.isAdministrator || app.currentUser.extendedGroups.find((grp) => grp.name === 'powerusers');
    if (hasPermission) {
      if (data.params.tab) {
        app.selectedAdminTab = data.params.tab;
      }
      app.show('admin');
    } else {
      app.showError(404, '', data.path);
    }
  });
});

page('/admin/user-group-management/:type/:id(.*)', (data) => {
  app.selectedAdminTab = 'user-group-management';
  app.show('admin', [data.params.type, data.params.id]);
});

page('/user/:id', (data) => {
  page.redirect(`/admin/user-group-management/user/${encodeURIComponent(data.params.id)}`);
});

page('/group/:id(.*)', (data) => {
  page.redirect(`/admin/user-group-management/group/${encodeURIComponent(data.params.id)}`);
});

page('/tasks/:repo?/:id/', (data) => {
  app.loadTask(data.params.id);
});

page('/tasks', () => {
  app.loadTask();
});

page('/diff/:id1/:id2', (data) => {
  app.showDiff(data.params.id1, data.params.id2);
});

// use two capture groups, a first one for the page name, and a second for the page route (optional)
page(/^\/([^/]*)(?:\/(.*))?/, (ctx) => {
  app.show(ctx.params[0], ctx.params[1] && ctx.params[1].split('/'));
});

page('*', (ctx) => {
  app.showError(404, '', ctx.path);
});

// add #! before urls
page({ hashbang: true, click: false, decodeURLComponents: false });

app.router = {
  baseUrl: app.baseUrl,

  useHashbang: true,

  browse(path, subPage) {
    return `/browse${
      path
        ? path
            .split('/')
            .map((n) => encodeURIComponent(n))
            .join('/')
        : ''
    }${subPage ? `?p=${encodeURIComponent(subPage)}` : ''}`;
  },

  document(idOrPath, subPage) {
    const isId = idOrPath && !idOrPath.startsWith('/');
    if (isId) {
      return `/doc/${idOrPath}${subPage ? `?p=${encodeURIComponent(subPage)}` : ''}`;
    }
    return app.router.browse(idOrPath, subPage);
  },

  home() {
    return '/home';
  },

  search(searchId) {
    return `/search/${searchId}`;
  },

  queue(searchId) {
    return `/queue/${searchId}`;
  },

  tasks(id) {
    return `/tasks${typeof id === 'undefined' ? '' : `/${id}`}`;
  },

  administration(tab) {
    return `/admin/${tab}`;
  },

  user(name) {
    return `/user/${encodeURIComponent(name)}`;
  },

  group(name) {
    return `/group/${encodeURIComponent(name)}`;
  },

  diff(id1, id2) {
    return `/diff/${id1}/${id2}`;
  },

  page(name) {
    return `/${name}`;
  },

  navigate: (path) => {
    if (path == null) {
      return;
    }
    const isFullpath = /^http(s)?:\/\//.test(path);
    if (isFullpath) {
      window.location = path;
    } else {
      page(path);
    }
  },
};
