## Retention repo

go in retention repository
https://github.com/nuxeo/nuxeo-retention

create link for retention repository

```sh
-> npm link
```

sample link is created ex: `/project path/nuxeo-retention/nuxeo-retention-web`


## Web UI

Go into `Addons` folder

```sh
-> cd Addons
```

link retention code with `WebUI`

```sh
-> ln -s /project path/nuxeo-retention/nuxeo-retention-web nuxeo-retention
```

after link command `nuxeo-retention` folder is created inside of `Addons` section

run command for start `WebUI`

```sh
-> NUXEO_PACKAGES=nuxeo-retention npm run start
```
