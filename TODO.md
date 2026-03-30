- [x] Replace NPM autocomplete and insert system to JSDelivr instead
- [x] Mini map
- [x] Undo / Redo history
- [x] Show/Hide Line Numbers
- [x] Folding
- [x] Multiline editing
- [x] SCSS / SASS Support
- [x] Indent: Tab or [n] Spaces
- [x] Custom editor fonts
- [ ] Typescript
- [ ] autocomplete/suggestions
- [ ] Additional Layouts
    - [x] Tabs
    - [ ] Hide Console
    - [ ] Color themes
- [ ] Auto Save
- [ ] Auto Run
- [ ] Save to server. (Github via token?) (POST to HTTP Server?)
- [ ] Set expiration per Mess. (Add an autoclean? or too dangerours)
- [ ]  wa-sqlite storage - Implement wa-sqlite for storage in browser via the OPFSCoopSyncVFS configuration.
- [ ] Custom name / Rename a mess



- [ ] Fully featured Export/Import System
    - [x] Single Mess
    - [ ] Export Static Site (ready to publish)
    - [ ] Full Backup
    
Change the "Export" button to a dropdown with these options:

* This Mess
* Static Site
* Full Backup

Change the "Import" button to a dropdown with these options:

* Single Mess
* Full Restore

Here is how these features will work:

# Export
    * This Mess -> Export a .jsmess file of this workspace. (As the export button does now.)
    * Static Site -> Export this site as a .zip file containing a ready to serve website: index.html with style.css (compiled from SASS) and code.js all referenced from the index.html. All of the imports are also properly included within index.html so the file can be extracted and served/viewed as is.
    * Full Backup - Export the entire system state for migration to different instance or for backup. All mess workspaces, revisions, configuration settings, etc.
    
# Import
    * Single Mess -> Reverse of "Export...This Mess" loads in a .jsmess file into the current workspace, saves it into the system and displays it as the active mess.
    * Full Restore -> Reverse of "Export...Full Backup" loads in an entire system state and replaces all messes, config settings, etc. Explain and confirm with user before overwriting. 




- [ ] Mess auto-expiration

The "Save" button should retain existing functionality on click: save a revision of the current mess and update the URL to point to this revision.

Hovering over the save button should present a small menu under the Save button which sets the "Expiration" for the mess. 

1 day
10 days
1 month
6 months
1 year
Keep forever

Last Cleanup: [Date]
Clean Up Now


Clicking "Clean Up Now" will manually run the cleanup script.

Default setting is "Keep Forever"

Otherwise the setting will determine how long after the last save date the Fiddle will auto-erase.
When the page is loaded and there has been no mouse movement or keyboard input or scroll for more than 30 seconds, and the cleanup script has not run Today, then run the cleanup script automatically, to erase all expired Mess from the localstorage. Do we need a spinner or indicator while cleaning up?




- [ ] Editor Tools

Add a Tools button that is a dropdown to execute additonal text processing tools on the active editor:

Tidy
Tabs to Spaces
Spaces to Tabs