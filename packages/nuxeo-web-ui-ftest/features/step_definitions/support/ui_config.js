import { Before } from '@cucumber/cucumber';

Before((e) => {
  const { tags } = e.pickle;
  global.config = tags
    .map((tag) => {
      const res = tag.name.match(/@config\('(.*)','(.*)'\)/);
      return res && { key: res[1], value: res[2] };
    })
    .filter(Boolean);
});
