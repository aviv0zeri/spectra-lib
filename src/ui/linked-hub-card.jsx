import { Check, ExternalLink, Hammer } from 'lucide-react';

import { cn } from '../cn.js';
import { Button } from './button.js';
import { Card } from './card.js';

/**
 * The Spectra Hub connection card for a dashboard's Profile page — reports
 * whether this installation is paired, and to what. Ported from GateOpen's
 * hand-copy (independently re-duplicated in bagStore, byte-for-byte apart
 * from import style) rather than an admin-avatar-adjacent utility component:
 * this one actually depends on the caller's own product name and env badge.
 *
 * All copy comes in via `labels` (already-translated strings) rather than a
 * `t()` call — spectra-lib components don't reach into a consumer's own i18n
 * system, same convention Sidebar uses.
 *
 * @param {{
 *   hub?: {
 *     name?: string,
 *     base_url?: string,
 *     application?: string,
 *     suggested_project?: string,
 *     suggested_environment?: string,
 *     connected?: boolean,
 *     configured?: boolean,
 *     phase?: 'building' | 'live',
 *   } | null,
 *   loading?: boolean,
 *   envBadge?: string,
 *   fallbackName: string,
 *   fallbackProject: string,
 *   labels: {
 *     title: string,
 *     loading: string,
 *     building: string,
 *     connected: string,
 *     unknown: string,
 *     buildingLead: string,
 *     project: string,
 *     environment: string,
 *     url: string,
 *     open: string,
 *   },
 * }} props
 */
export function LinkedHubCard({
  hub = null,
  loading = false,
  envBadge = '',
  fallbackName,
  fallbackProject,
  labels,
}) {
  const name = hub?.name || fallbackName;
  // Phase is about where the project is in its life, not whether the last call
  // succeeded. Absent means building — nothing has been through the wizard yet,
  // so there is no contract to report and saying "not connected" would imply one
  // exists and is merely down.
  const building = (hub?.phase ?? 'building') === 'building';
  const connected = !building && Boolean(hub?.connected);
  const project = hub?.suggested_project || hub?.application || fallbackProject;
  const environment = hub?.suggested_environment || envBadge || '—';
  const url = hub?.base_url || '';

  return (
    <Card className="gap-4 px-5 py-4">
      <h3 className="m-0 text-[15px] font-semibold text-foreground">{labels.title}</h3>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-4">
        <div className="flex min-w-48 flex-1 basis-48 items-center gap-3">
          <span
            className={cn(
              'grid size-11 shrink-0 place-items-center rounded-md',
              'bg-primary text-primary-foreground',
            )}
            aria-hidden="true"
          >
            <img src="/assets/spectra-lizard.svg" alt="" className="h-6 w-10" />
          </span>
          <div className="min-w-0">
            {/* Brand name, not translated copy — LTR isolation keeps the
                ellipsis cutting off the trailing end instead of the front
                when this renders inside an RTL layout. */}
            <p className="ltr-value m-0 truncate text-[14px] font-semibold text-foreground">
              {name}
            </p>
            <p
              className={cn(
                'm-0 mt-0.5 flex items-center gap-1.5 text-[12px] font-medium',
                connected ? 'text-[var(--ok)]' : 'text-muted-foreground',
              )}
            >
              {loading ? (
                labels.loading
              ) : building ? (
                <>
                  <Hammer size={14} aria-hidden="true" />
                  {labels.building}
                </>
              ) : connected ? (
                <>
                  <Check size={14} aria-hidden="true" />
                  {labels.connected}
                </>
              ) : (
                labels.unknown
              )}
            </p>
          </div>
        </div>

        {building ? (
          /* No contract exists yet, so there is no project, environment or Hub
             URL to report. Printing the suggested values here would read as a
             live pairing. Say what the state actually is instead. */
          <p className="m-0 border-s border-border ps-4 text-[12.5px] text-muted-foreground [flex:2_1_220px] max-md:w-full max-md:border-s-0 max-md:border-t max-md:ps-0 max-md:pt-3">
            {labels.buildingLead}
          </p>
        ) : (
          <dl className="m-0 flex flex-wrap gap-x-7 gap-y-3 border-s border-border ps-4 text-[12.5px] [flex:2_1_220px] max-md:w-full max-md:border-s-0 max-md:border-t max-md:ps-0 max-md:pt-3">
            <div className="min-w-28">
              <dt className="m-0 font-medium text-muted-foreground">{labels.project}</dt>
              <dd className="ltr-value mt-0.5 mb-0 font-semibold text-foreground">{project}</dd>
            </div>
            <div className="min-w-28">
              <dt className="m-0 font-medium text-muted-foreground">{labels.environment}</dt>
              <dd className="ltr-value mt-0.5 mb-0 font-semibold text-foreground">{environment}</dd>
            </div>
            <div className="min-w-28">
              <dt className="m-0 font-medium text-muted-foreground">{labels.url}</dt>
              <dd className="ltr-value mt-0.5 mb-0 font-semibold break-all text-foreground">
                {url || '—'}
              </dd>
            </div>
          </dl>
        )}

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="ms-auto max-md:ms-0"
          disabled={building || !url}
          onClick={() => {
            if (url) window.open(url, '_blank', 'noopener,noreferrer');
          }}
        >
          <ExternalLink size={15} aria-hidden="true" />
          {labels.open}
        </Button>
      </div>
    </Card>
  );
}
