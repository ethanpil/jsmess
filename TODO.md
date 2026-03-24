- [x] Replace NPM autocomplete and insert system to JSDelivr instead
- [ ] Export/Download/Backup all Messes or just the current single one
- [ ] SCSS / SASS
- [ ] Typescript
- [x] Mini map
- [x] Undo / Redo history
- [ ] Indent: Tab or [n] Spaces
- [x] Show/Hide Line Numbers
- [ ] Auto Close Brackets
- [x] Folding
- [ ] autocomplete/suggestions
- [x] Multiline editing
- [ ] Additional Layouts
    - [ ] Tabs
    - [ ] Hide Console
    - [ ] Color themes
- [ ] Auto Save
- [ ] Auto Run
- [ ] Save to server. (Github via token?) (POST to HTTP Server?)
- [ ] Set expiration per Mess. (Add an autoclean? or too dangerours)

- [ ]  wa-sqlite storage
Implement wa-sqlite for storage in browser via the OPFSCoopSyncVFS configuration.

All of the configuration should be stored in a `configuration` table.
The Messes should be stored in a `mess` table with the columns: id, hash, revision, html, css, js
Each time the save button is pressed we save into the same hash with an incremented revision
the hash should be generated based on the id and unique with miniscule chance of collision
users can load a previous Mess via the hash in the url:  /hash/revision

Download/export the entire sqlite and rervse import
Or export a single. how to differentiate ux and flow fo rboth options? single maybe a zipfile?
