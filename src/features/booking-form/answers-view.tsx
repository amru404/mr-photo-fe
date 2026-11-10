import { FileText } from "lucide-react";
import { cn } from "@/lib/cn";
import { fileSize } from "./files";
import type { AnswerSnapshot, BookingFile } from "./schema";

interface Row {
  key: string;
  label: string;
  display: string;
  files: BookingFile[];
}

interface Group {
  section: string | null;
  rows: Row[];
}

/**
 * The stored snapshot grouped by section, in order, with each file question's
 * uploads under it. Unanswered questions are left out; files whose question
 * isn't in the snapshot land in a trailing "Files" row.
 */
export function groupAnswers(snapshot: AnswerSnapshot[] = [], files: BookingFile[] = []): Group[] {
  const groups: Group[] = [];
  const placed = new Set<number>();

  for (const entry of snapshot) {
    const own = entry.type === "file" ? files.filter((file) => file.field_id === entry.field_id) : [];
    own.forEach((file) => placed.add(file.id));
    if (entry.type === "section") continue;
    if (!entry.display.trim() && own.length === 0) continue;
    const section = entry.section?.trim() || null;
    let group = groups[groups.length - 1];
    if (!group || group.section !== section) {
      group = { section, rows: [] };
      groups.push(group);
    }
    group.rows.push({ key: entry.field_id, label: entry.label, display: entry.type === "file" ? "" : entry.display, files: own });
  }

  const rest = files.filter((file) => !placed.has(file.id));
  if (rest.length) groups.push({ section: null, rows: [{ key: "files", label: "Files", display: "", files: rest }] });
  return groups;
}

export function hasAnswers(snapshot: AnswerSnapshot[] = [], files: BookingFile[] = []): boolean {
  return groupAnswers(snapshot, files).length > 0;
}

/** Question → answer, section by section, with thumbnails for uploads. */
export function AnswerList({ snapshot, files, className }: { snapshot?: AnswerSnapshot[]; files?: BookingFile[]; className?: string }) {
  const groups = groupAnswers(snapshot, files);
  if (groups.length === 0) return null;

  return (
    <div className={cn("space-y-5", className)}>
      {groups.map((group, index) => (
        <section key={index} className={cn(index > 0 && group.section && "border-t border-rule pt-5")}>
          {group.section && <h4 className="mb-3 text-[13px] font-semibold text-ink">{group.section}</h4>}
          <dl className="space-y-3.5">
            {group.rows.map((row) => (
              <div key={row.key} className="min-w-0">
                <dt className="text-xs font-medium text-muted">{row.label}</dt>
                {row.display && <dd className="mt-0.5 whitespace-pre-line break-words text-[13px] leading-5 text-ink">{row.display}</dd>}
                {row.files.length > 0 && (
                  <dd className="mt-2">
                    <FileLinks files={row.files} />
                  </dd>
                )}
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

/** Images as square thumbnails, anything else (PDF) as a file row; each opens in a new tab. */
export function FileLinks({ files, size = "md", className }: { files: BookingFile[]; size?: "md" | "lg"; className?: string }) {
  const images = files.filter((file) => file.is_image);
  const others = files.filter((file) => !file.is_image);

  return (
    <div className={cn("space-y-2", className)}>
      {images.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {images.map((file) => (
            <li key={file.id}>
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                title={file.name}
                className={cn("block overflow-hidden border border-line bg-raised transition-opacity hover:opacity-85", size === "lg" ? "size-40 sm:size-48" : "size-20")}
              >
                <img src={file.url} alt={file.name} loading="lazy" className="size-full object-cover" />
              </a>
            </li>
          ))}
        </ul>
      )}
      {others.length > 0 && (
        <ul className="space-y-1.5">
          {others.map((file) => (
            <li key={file.id}>
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="flex max-w-sm items-center gap-3 rounded-control border border-line bg-surface px-3 py-2 transition-colors hover:bg-raised"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-chip bg-raised text-muted">
                  <FileText className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink">{file.name}</span>
                  <span className="block font-mono text-[11px] text-faint tabular">{fileSize(file.size)}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
