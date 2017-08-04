'use strict';

import BasePage from '../base';

export default class ActivityFeed extends BasePage {

  getActivity(activity) {
    return this.el.element(`///*[text()="${activity}"]`);
  }

}
