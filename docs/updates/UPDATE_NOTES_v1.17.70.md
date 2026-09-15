# v1.17.70 — StreamInject Video Import & CTA Independence Fix

## Changes

### `/src/components/AppFeaturesGuide.tsx`
```tsx
import { ..., Video, Film, ImageIcon, ... } from 'lucide-react';
```
Fixed the `Film is not defined` render crash by importing the Lucide `Film` icon used by the StreamInject feature entry. Workspace-isolation protection was not changed.

### `/src/components/StreamInjectStudio.tsx`
```tsx
body: JSON.stringify({ filename: file.name, base64Data, targetField })
```
Uploads now tell the server which media role they serve. CTA upload was moved out of Outro and placed directly under **Green Screen Overlay (0x00FF00)**, where it independently sets the chroma/CTA source.

### `/server.ts`
```ts
const videoRoles = new Set(["gameplay", "intro", "outro", "chroma"]);
// FFprobe validates video-role uploads instead of trusting browser MIME or filename extension.
```
Video-role uploads are content-probed. Valid MKV/MP4 files, including unusual names, are not rejected solely because of their browser MIME type or filename.

### `/server/streaminject/StreamInjectService.ts`
```ts
private async probeVideoFile(filePath: string): Promise<boolean | null>
```
Media scanning recognizes a broad video extension set and FFprobe-checks otherwise unknown extensions so usable video files are still discoverable.

## Compatibility
- Existing StreamInject story-stall fixes preserved.
- Existing workspace isolation preserved.
- Existing 512 MB JSON upload limit preserved.
- Version synchronized to `1.17.70`.
