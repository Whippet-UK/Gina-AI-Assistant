# Gina AI Factory — Edit Requests

This file is the persistent human-to-agent work queue for project problems and requested changes.

## How to use

Add requests under **Open Requests**. Each request should describe the problem, expected behaviour, and any useful reproduction details. The local agent must read this file during project-context refresh before proposing or executing changes.

## Open Requests

<!-- Add new requests below this line. Do not delete unresolved requests. -->
1. Local AI: uploading an image then prompting an edit took 559.26 seconds. Didn't make any changes but did generate an exact copy, generation was slow (see LOG:) after generation is complete switching to the create studio the image is still stuck in the last phase locking the generate button to cancel.
LOG:
[INFO] got prompt
[INFO] Unloaded partially: 850.66 MB freed, 964.49 MB remains loaded, 75.06 MB buffer reserved, lowvram patches: 0
[INFO] loaded completely; 5456.12 MB usable, 4897.05 MB loaded, full load: True
100%|██████████████████████████████████████████████████████████████████████████████████| 25/25 [09:10<00:00, 22.03s/it]
[INFO] 0 models unloaded.
[INFO] Unloaded partially: 159.56 MB freed, 0.00 MB remains loaded, 13.50 MB buffer reserved, lowvram patches: 0
[INFO] Prompt executed in 559.26 seconds
## Completed Requests
## Completed Requests
2. Create Studio: after generating an image the image unloads it from the preview and so i longer get the edit options (keep photo, subtle prompt ect.)
<!-- Move completed requests here with the completion date and affected files. -->
