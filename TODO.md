- [x] Replace NPM autocomplete and insert system to JSDelivr instead
- [x] Mini map
- [x] Undo / Redo history
- [x] Show/Hide Line Numbers
- [x] Folding
- [x] Multiline editing
- [x] SCSS / SASS Support
- [x] Indent: Tab or [n] Spaces
- [x] Custom editor fonts
- [x] Editor Tools
    - [x] Tidy
    - [x] Tabs to Spaces
    - [x] Space to Tabs
    - [x] Change Case: Upper, lower, Proper
- [x] Custom name / Rename a mess
- [x] Fully featured Export/Import System
    - [x] Single Mess 
    - [x] Static Site
    - [x] Full Backup / Restore     
- [ ] Typescript
- [ ] Additional Layouts
    - [x] Tabs
    - [ ] Hide Console
    - [ ] Color themes
- [ ] Auto Save
- [ ] Auto Run
- [ ] Save to server. (Github via token?) (POST to HTTP Server?)
- [ ] Convert to some sort of sqlite based storage (wa-sqlite via the OPFSCoopSyncVFS?)
    - [ ] Sync to external server

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





