# Local AI Attachment Milestone

## v1.17.21

Source: v1.17.20 LOCAL-AI-UNIVERSAL-ATTACHMENTS ZIP.

### Hotfix
The LocalLlmStudio component contained two declarations of `handleAttachFile`, causing the Vite/Babel error `Identifier 'handleAttachFile' has already been declared`. The duplicate legacy declaration was removed; the newer image/archive-aware handler is retained.

### Limits retained
- Text/code/config: 2 MB
- Images: 12 MB
- ZIP archives: 25 MB
- Attachments per turn: 5
- ZIP entries: 100 maximum
- Extracted ZIP text context: 4 MB aggregate

### Scope
No changes to LTX-2.3 or AIDA64.


## v1.17.25 hotfix — upload reload safety

The development watcher now ignores `local_ai_uploads`. This is required because writing an attachment into the local store must not trigger Vite HMR while the browser is still uploading/processing the request.
