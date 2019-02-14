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
// Iron elements -->
import '@polymer/iron-a11y-announcer/iron-a11y-announcer.js';
import '@polymer/iron-a11y-keys/iron-a11y-keys.js';
import '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/iron-autogrow-textarea/iron-autogrow-textarea.js';
import '@polymer/iron-behaviors/iron-button-state.js';
import '@polymer/iron-behaviors/iron-control-state.js';
import '@polymer/iron-checked-element-behavior/iron-checked-element-behavior.js';
import '@polymer/iron-collapse/iron-collapse.js';
import '@polymer/iron-dropdown/iron-dropdown.js';
import '@polymer/iron-fit-behavior/iron-fit-behavior.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-form/iron-form.js';
import '@polymer/iron-form-element-behavior/iron-form-element-behavior.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/iron-iconset-svg/iron-iconset-svg.js';
import '@polymer/iron-image/iron-image.js';
import '@polymer/iron-input/iron-input.js';
import '@polymer/iron-jsonp-library/iron-jsonp-library.js';
import '@polymer/iron-list/iron-list.js';
import '@polymer/iron-label/iron-label.js';
import '@polymer/iron-localstorage/iron-localstorage.js';
import '@polymer/iron-location/iron-location.js';
import '@polymer/iron-media-query/iron-media-query.js';
import '@polymer/iron-menu-behavior/iron-menu-behavior.js';
import '@polymer/iron-menu-behavior/iron-menubar-behavior.js';
import '@polymer/iron-meta/iron-meta.js';
import '@polymer/iron-overlay-behavior/iron-overlay-behavior.js';
import '@polymer/iron-pages/iron-pages.js';
import '@polymer/iron-range-behavior/iron-range-behavior.js';
import '@polymer/iron-resizable-behavior/iron-resizable-behavior.js';
import '@polymer/iron-scroll-target-behavior/iron-scroll-target-behavior.js';
import '@polymer/iron-scroll-threshold/iron-scroll-threshold.js';
import '@polymer/iron-selector/iron-selector.js';
import '@polymer/iron-selector/iron-selection.js';
import '@polymer/iron-selector/iron-multi-selectable.js';
import '@polymer/iron-validatable-behavior/iron-validatable-behavior.js';
import '@polymer/iron-validator-behavior/iron-validator-behavior.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/iron-icons/communication-icons.js';
import '@polymer/iron-icons/editor-icons.js';
import '@polymer/iron-icons/hardware-icons.js';
import '@polymer/iron-icons/image-icons.js';
import '@polymer/iron-icons/notification-icons.js';
import '@polymer/iron-icons/social-icons.js';

// Paper elements -->
import '@polymer/paper-styles/paper-styles-classes.js';
import '@polymer/paper-item/paper-icon-item.js';
import '@polymer/paper-spinner/paper-spinner-lite.js';

// Neon elements -->
import '@polymer/neon-animation/neon-animated-pages.js';
import '@polymer/neon-animation/neon-animatable.js';
import '@polymer/neon-animation/neon-animations.js';
import '@polymer/neon-animation/neon-animatable-behavior.js';
import '@polymer/neon-animation/neon-animation-runner-behavior.js';

// Nuxeo Elements -->
import '@nuxeo/nuxeo-elements/nuxeo-connection.js';
import '@nuxeo/nuxeo-elements/nuxeo-document.js';
import '@nuxeo/nuxeo-elements/nuxeo-operation.js';
import '@nuxeo/nuxeo-elements/nuxeo-page-provider.js';
import '@nuxeo/nuxeo-elements/nuxeo-resource.js';
import '@nuxeo/nuxeo-elements/nuxeo-search.js';
import '@nuxeo/nuxeo-elements/nuxeo-audit-page-provider.js';

// Nuxeo UI Elements -->
import '@nuxeo/nuxeo-ui-elements/nuxeo-icons.js';
import '@nuxeo/nuxeo-ui-elements/dataviz/nuxeo-document-distribution-chart.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-document-preview.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-aggregation/nuxeo-checkbox-aggregation.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-aggregation/nuxeo-dropdown-aggregation.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-grid/nuxeo-data-grid.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-list/nuxeo-data-list.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-table/iron-data-table.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-document-permissions/nuxeo-document-permissions.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-error.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-filter.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-layout.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-layout-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-page-provider-display-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-path-suggestion/nuxeo-path-suggestion.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-quick-filters/nuxeo-quick-filters.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-slots.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-tree/nuxeo-tree.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-user-group-management.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-user-group-management/nuxeo-user-group-latest.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-justified-grid/nuxeo-justified-grid.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-justified-grid/nuxeo-justified-grid-item.js';
import '@nuxeo/nuxeo-ui-elements/viewers/nuxeo-image-viewer.js';
import '@nuxeo/nuxeo-ui-elements/viewers/nuxeo-pdf-viewer.js';
import '@nuxeo/nuxeo-ui-elements/viewers/nuxeo-video-viewer.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-actions-menu.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date-picker.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-directory-checkbox.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-directory-radio-group.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-directory-suggestion.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-document-suggestion.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tag-suggestion.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-file.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-operation-button.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-select.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tag.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tags.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-user-tag.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-group-tag.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-user-suggestion.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-input.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-textarea.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-dialog.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-card.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-html-editor.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';

// Nuxeo Dataviz elements -->
import '@nuxeo/nuxeo-dataviz-elements/nuxeo-audit-data.js';
import '@nuxeo/nuxeo-dataviz-elements/nuxeo-repository-data.js';
import '@nuxeo/nuxeo-dataviz-elements/nuxeo-search-data.js';
import '@nuxeo/nuxeo-dataviz-elements/nuxeo-workflow-data.js';

// Chart elements -->
// import 'chart-elements/chart-bar.js';
// import 'chart-elements/chart-line.js';
// import 'chart-elements/chart-pie.js';

// Marked element-->
import '@polymer/marked-element/marked-element.js';

// Document layout elements -->
import './document/nuxeo-document-layout.js';
import './document/nuxeo-document-form-layout.js';
import './document/nuxeo-document-create.js';
import './document/nuxeo-document-import.js';
import './document/nuxeo-document-page.js';
import './document/nuxeo-collapsible-document-page.js';
import './document/nuxeo-document-view.js';
import './document/nuxeo-document-edit.js';
import './document/nuxeo-document-metadata.js';

// Directory layout elements -->
import './directory/nuxeo-vocabulary-management.js';

// Search layout elements -->
import './search/nuxeo-saved-search-actions.js';
import './search/nuxeo-search-results-layout.js';
import './search/nuxeo-search-form.js';
import './search/nuxeo-results-view.js';
import './nuxeo-search-page.js';

// Workflow layout elements -->
import './workflow/nuxeo-document-task.js';
import './workflow/nuxeo-document-task-assignment-popup.js';
import './workflow/nuxeo-document-task-review-result.js';

// Application elements -->
import './nuxeo-admin/nuxeo-analytics.js';
import './nuxeo-admin/nuxeo-distribution-analytics.js';
import './nuxeo-admin/nuxeo-repository-analytics.js';
import './nuxeo-admin/nuxeo-search-analytics.js';
import './nuxeo-admin/nuxeo-workflow-analytics.js';
import './nuxeo-admin/nuxeo-user-group-management-page.js';
import './nuxeo-admin/nuxeo-audit.js';
import './nuxeo-cloud-services/nuxeo-cloud-services.js';
import './nuxeo-cloud-services/nuxeo-cloud-providers.js';
import './nuxeo-cloud-services/nuxeo-cloud-tokens.js';
import './nuxeo-cloud-services/nuxeo-oauth2-tokens.js';
import './nuxeo-browser/nuxeo-breadcrumb.js';
import './nuxeo-results/nuxeo-results.js';
import './nuxeo-results/nuxeo-default-results.js';
import './nuxeo-results/nuxeo-document-content.js';
import './nuxeo-results/nuxeo-document-content-behavior.js';
import './nuxeo-results/nuxeo-document-trash-content.js';
import './nuxeo-selection/nuxeo-selection-toolbar.js';
import './nuxeo-data-grid/nuxeo-document-grid-thumbnail.js';
import './nuxeo-data-list/nuxeo-document-list-item.js';
import './nuxeo-document-create-button/nuxeo-document-create-button.js';
import './nuxeo-document-create-popup/nuxeo-document-create-popup.js';
import './nuxeo-document-create-actions/nuxeo-document-create-shortcut.js';
import './nuxeo-document-create-actions/nuxeo-document-create-shortcuts.js';
import './nuxeo-document-creation-stats/nuxeo-document-creation-stats.js';
import './nuxeo-document-export/nuxeo-document-export.js';
import './nuxeo-document-viewer/nuxeo-document-viewer.js';
import './nuxeo-document-attachments/nuxeo-document-attachments.js';
import './nuxeo-document-storage/nuxeo-document-storage.js';
import './nuxeo-document-tree/nuxeo-document-tree.js';
import './nuxeo-document-info/nuxeo-document-info.js';
import './nuxeo-document-info-bar/nuxeo-document-info-bar.js';
import './nuxeo-document-versions/nuxeo-document-versions.js';
import './nuxeo-document-blob/nuxeo-document-blob.js';
import './nuxeo-document-highlight/nuxeo-document-highlights.js';
import './nuxeo-document-history/nuxeo-document-history.js';
import './nuxeo-document-thumbnail/nuxeo-document-thumbnail.js';
import './nuxeo-dropzone/nuxeo-dropzone.js';
import './nuxeo-collections/nuxeo-collection-move-up-action.js';
import './nuxeo-collections/nuxeo-collection-move-down-action.js';
import './nuxeo-collections/nuxeo-collection-move-top-action.js';
import './nuxeo-collections/nuxeo-collection-move-bottom-action.js';
import './nuxeo-collections/nuxeo-collection-remove-action.js';
import './nuxeo-publication/nuxeo-document-publications.js';
import './nuxeo-publication/nuxeo-internal-publish.js';
import './nuxeo-publication/nuxeo-publication-info-bar.js';
import './nuxeo-publication/nuxeo-publish-button.js';
import './nuxeo-publication/nuxeo-unpublish-button.js';
import './nuxeo-suggester/nuxeo-suggester.js';
import './nuxeo-tasks/nuxeo-tasks-list.js';
import './nuxeo-tasks/nuxeo-tasks-drawer.js';
import './nuxeo-themes/nuxeo-theme.js';
import './nuxeo-confirm-button/nuxeo-confirm-button.js';
import './nuxeo-restore-version-button/nuxeo-restore-version-button.js';
import './nuxeo-keys/nuxeo-keys.js';

// Note -->
import './nuxeo-note-editor/nuxeo-note-editor.js';

// Video -->
import './nuxeo-video/nuxeo-video-info.js';
import './nuxeo-video/nuxeo-video-conversions.js';

// Right panel elements -->
import './nuxeo-clipboard/nuxeo-clipboard.js';
import './nuxeo-collections/nuxeo-collections.js';
import './nuxeo-collections/nuxeo-favorites.js';
import './nuxeo-recent-documents/nuxeo-recent-documents.js';

// Document metadata and process elements -->
import './nuxeo-collections/nuxeo-document-collections.js';
import './nuxeo-document-activity/nuxeo-document-activity.js';
import './nuxeo-document-comments/nuxeo-document-comment.js';
import './nuxeo-document-comments/nuxeo-document-comment-thread.js';
import './nuxeo-workflow-graph/nuxeo-workflow-graph.js';

// Actions -->
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-add-to-collection-button.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-favorites-toggle-button.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-share-button.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-notifications-toggle-button.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-link-button.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-lock-toggle-button.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-preview-button.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-export-button.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-delete-document-button.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-download-button.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-move-documents-down-button.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-move-documents-up-button.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-untrash-document-button.js';
import './nuxeo-document-actions/nuxeo-clipboard-toggle-button.js';
import './nuxeo-document-actions/nuxeo-document-form-button.js';
import './nuxeo-document-actions/nuxeo-document-edit-button.js';
import './nuxeo-document-actions/nuxeo-replace-blob-button.js';

import '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-preview-button.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-delete-blob-button.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-download-button.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-workflow-button.js';

import './nuxeo-document-create-actions/nuxeo-document-create-shortcuts.js';

// Documents bulk actions -->
import './nuxeo-document-bulk-actions/nuxeo-add-to-collection-documents-button.js';
import './nuxeo-document-bulk-actions/nuxeo-clipboard-documents-button.js';
import './nuxeo-document-bulk-actions/nuxeo-delete-documents-button.js';
import './nuxeo-document-bulk-actions/nuxeo-download-documents-button.js';
import './nuxeo-document-bulk-actions/nuxeo-untrash-documents-button.js';

// Nuxeo Diff -->
import './diff/nuxeo-document-diff-button.js';
import './diff/nuxeo-versions-diff-button.js';
import './diff/nuxeo-diff.js';

// CSV Export -->
import './nuxeo-csv-export/nuxeo-csv-export-button.js';

import './nuxeo-sardine.js';
