/**
 * `Nuxeo.SelectAllBehavior` provides a set of select all helper methods.
 *
 * @polymerBehavior
 */
export const SelectAllBehavior = {

  _isPageProviderDisplayBehavior(input) {
    return (
      input &&
      input.behaviors &&
      Nuxeo.PageProviderDisplayBehavior &&
      Nuxeo.PageProviderDisplayBehavior.every((p) => input.behaviors.includes(p)) &&
      input.selectAllActive
    );
  }
};
