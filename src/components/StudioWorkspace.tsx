import React, { useState } from 'react';
import { LocalLlmStudio } from './LocalLlmStudio';
import type { LogEntry, SystemTelemetry } from '../types';

type StudioMode = 'web-search' | 'web-app' | 'code-engine' | 'image-studio' | 'video-generation';

interface Props {
  telemetry: SystemTelemetry;
  logs: LogEntry[];
  onAddLog: (level: 'INFO'|'WARN'|'SEC'|'RULE', message: string, ruleId?: string) => void;
  onClearCache: () => void;
}

/**
 * Gina Assistant is intentionally a single continuous page.
 * LocalLlmStudio owns the response, preview, mode selector, activity log,
 * telemetry/power/commercial widgets, inference engine and prompt input.
 */
export const StudioWorkspace: React.FC<Props> = ({ onAddLog }) => {
  const [mode, setMode] = useState<StudioMode>('web-app');

  return (
    <section className="gina-assistant-page w-full min-w-0">
      <LocalLlmStudio
        onAddLog={onAddLog}
        studioMode={mode}
        isFullScreen={false}
        onModeChange={setMode}
      />
    </section>
  );
};
