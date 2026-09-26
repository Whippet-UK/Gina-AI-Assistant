import React from 'react';
import { LocalLlmStudio } from './LocalLlmStudio';
import type { LogEntry, SystemTelemetry } from '../types';

interface Props {
  telemetry: SystemTelemetry;
  logs: LogEntry[];
  onAddLog: (level: 'INFO'|'WARN'|'SEC'|'RULE', message: string, ruleId?: string) => void;
  onClearCache: () => void;
}

/**
 * Gina Assistant is intentionally a single continuous page.
 *
 * Do not add a second dashboard/tab shell here. LocalLlmStudio owns the
 * response, preview, mode selector, activity log, widgets, inference engine
 * and prompt input so those pieces cannot drift into duplicate UI.
 */
export const StudioWorkspace: React.FC<Props> = ({ onAddLog }) => {
  return (
    <section className="gina-assistant-page w-full min-w-0">
      <LocalLlmStudio
        onAddLog={onAddLog}
        studioMode="web-app"
        isFullScreen={false}
        onModeChange={() => undefined}
      />
    </section>
  );
};
