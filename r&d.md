```html
<paper-drawer-panel>
    <div slot="drawer" role="list"> Sidebar </div>
    <paper-header-panel>Rest Panel</paper-header-panel>
</paper-drawer-panel>
```

Elements Repo:
File: `nuxeo-document-thumbnail`

```js
   :host([dir="rtl"]) img {
      margin: auto auto auto 8px;
    }

    connectedCallback() {
      super.connectedCallback();
      if (!this.hasAttribute('dir')) {
        this.setAttribute('dir', getComputedStyle(this).direction);
      }
    }

```

File: `nuxeo-card`,
```js

    :host([dir="rtl"]) .header .icon {
            margin-left: 8px;
            margin-right: 0;
    }

    connectedCallback() {
      super.connectedCallback();
      if (!this.hasAttribute('dir')) {
        this.setAttribute('dir', getComputedStyle(this).direction);
      }
    }

```
