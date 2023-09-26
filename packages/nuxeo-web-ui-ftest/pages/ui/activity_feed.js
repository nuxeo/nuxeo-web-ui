import BasePage from '../base';

export default class ActivityFeed extends BasePage {
  async getActivity(activity) {
    await this.el.waitForExist('.value span');
    const valueSpan = await this.el.$$('.value span').find(async (e) => {
      const currentText = await e.getText();
      return currentText === activity;
    });
    return valueSpan;
  }
}
