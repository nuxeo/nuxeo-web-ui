# Nuxeo Web UI — Product

## What is Nuxeo Web UI?

Nuxeo Web UI is the default web-based user interface for the **Nuxeo Platform**, a content services platform built for managing documents, digital assets, and business content at enterprise scale. It is developed by **Hyland Software** and licensed under Apache 2.0.

Web UI provides a modern, responsive interface for end users to browse, search, create, edit, and manage content stored in a Nuxeo repository.

## Core Capabilities

### Document Management
- **Browse & Navigate**: Hierarchical folder tree, breadcrumb navigation, and direct URL access to any document
- **Create & Import**: Wizard-driven document creation, drag-and-drop file upload, CSV bulk import
- **View & Edit**: Type-specific layouts automatically render view/edit forms based on document type (File, Note, Picture, Video, Audio, Workspace, etc.)
- **Versioning**: Version history, restore, and compare between versions
- **Metadata**: Rich metadata editing with schema-driven forms, vocabularies, and directory widgets
- **Attachments**: Multi-file attachments, blob management, and inline preview

### Search
- **Default Search**: Full-text and metadata-based search with quick filters
- **Saved Searches**: Named search configurations that persist across sessions
- **NXQL Search**: Direct query language access for power users
- **Expired Documents**: Built-in search for content past retention date
- **Trash**: Soft-delete with recoverable trash bin

### Content Organization
- **Collections**: Virtual folders for grouping documents across the repository
- **Favorites**: Personal bookmarks for quick access
- **Recent Documents**: Automatically tracked recently viewed items
- **Clipboard**: Cut/copy/paste operations for moving content
- **Ordered Folders**: Manual ordering of child documents

### Workflow & Tasks
- **Task Management**: View and complete assigned workflow tasks
- **Workflow Routing**: Visual workflow process tracking
- **Task Dashboard**: Centralized task inbox on the home page

### Collaboration
- **Comments**: Threaded discussions on documents
- **Activity Stream**: Real-time audit trail of document changes
- **Permissions**: Granular ACL management on documents and folders
- **Publication**: Publish documents to sections for controlled distribution
- **Notifications**: User notification management

### Administration
- **User & Group Management**: Create/edit users and groups, manage memberships
- **Vocabulary Management**: Administer directory/vocabulary entries
- **Analytics**: Repository, search, and workflow analytics dashboards
- **Audit Trail**: Searchable audit log of all platform events

### Digital Asset Management
- **Picture**: EXIF/IPTC metadata display, multi-format renditions, inline viewer
- **Video**: Storyboard extraction, transcoded renditions, HTML5 player
- **Audio**: Waveform visualization and playback
- **3D Models**: Three.js-based 3D object viewer (addon)

## Addon Features

Optional addons extend Web UI with additional capabilities:

| Addon | Capability |
|---|---|
| **Nuxeo Drive** | Desktop sync client integration, offline access |
| **Nuxeo LiveConnect** | Link to files in Google Drive, Dropbox, Box, OneDrive |
| **Nuxeo CSV** | Bulk import documents from CSV files |
| **Nuxeo Spreadsheet** | Inline spreadsheet-style bulk metadata editing |
| **Nuxeo Template Rendering** | Generate documents from templates (DOCX, PDF, etc.) |
| **Nuxeo WOPI** | Edit Office documents in-browser via Microsoft Office Online |
| **EasyShare** | Public sharing links for documents |
| **Amazon S3 Online Storage** | Direct-to-S3 upload for large files |
| **Nuxeo IMAP Connector** | Email integration and document ingestion |

## User Roles

| Role | Access |
|---|---|
| **Regular User** | Browse, search, create, edit documents within their permissions |
| **Power User** | Extended document management, publication, workflow management |
| **Administrator** | Full access including user/group management, vocabularies, analytics, system configuration |

## Themes

Four visual themes are bundled, offered in pairs according to the branding opt-in:

- **Default** — Standard Nuxeo branding
- **Dark** — Dark mode interface
- **Hyland Light** — Hyland branding
- **Hyland Dark** — Hyland branding, dark mode

A deployment sees only one pair: the classic Default/Dark themes normally, or the two Hyland
themes when branding is enabled. Custom themes are never hidden.

Users can switch between the offered themes from their profile settings.

## Internationalization

Web UI supports 16 languages out of the box:
Arabic, Chinese (Simplified), Czech, Dutch, Basque, English, French, German, Hebrew, Indonesian, Italian, Japanese, Polish, Portuguese, Spanish, Swedish.

RTL (right-to-left) support is automatically enabled for RTL locales. This includes bundled translations such as Arabic and Hebrew, as well as locales like Farsi and Urdu where text direction is detected even though full UI translations are not bundled out of the box.

## Platform Integration

Web UI is designed to work with the full Nuxeo Platform stack:

- **Nuxeo Server** — Java-based backend providing REST APIs, Automation framework, and content repository
- **Nuxeo Studio** — Low-code configuration tool for customizing document types, layouts, workflows, and branding
- **Nuxeo Designer** — Visual layout editor that generates Web UI layouts deployed to the platform
- **Nuxeo Marketplace** — Package manager for installing addons and custom configurations

## Target Environments

- **Browsers**: Chrome, Firefox, Edge, Safari (latest versions)
- **Devices**: Desktop-first design with responsive support for tablets
- **Deployment**: On-premise, cloud, or hybrid via Docker/Kubernetes
