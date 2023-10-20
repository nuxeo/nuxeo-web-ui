import BasePage from '../base';

export default class ActivityFeed extends BasePage {
  getActivity(activity) {
    this.el.$('.value span').waitForVisible(30000);;
    return this.el.$$('.value span').find((e) => e.getText() === activity);
  }
}
