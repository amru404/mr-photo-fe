"use client";

import { Plus, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, Input } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/cn";
import { OP_LABELS, opsFor } from "@/features/booking-form/logic";
import { isChoice, OTHER, type ConditionOp, type ConditionRule, type FormField, type ShowIf } from "@/features/booking-form/schema";
import { IconButton, NumberInput, Select } from "./controls";
import { defaultRule, defaultValue, MAX_RULES, needsValue, ruleCandidates, ruleIncomplete, ruleProblem } from "./model";

const untitled = (field: FormField) => field.label.trim() || "Untitled question";

/** "Show this question only if…": all/any of up to ten rules on earlier questions. */
export function LogicPanel({
  field,
  index,
  fields,
  onChange,
  error,
}: {
  field: FormField;
  index: number;
  fields: FormField[];
  onChange: (showIf: ShowIf | null) => void;
  error?: string;
}) {
  const candidates = ruleCandidates(fields, index);
  const showIf = field.show_if ?? null;
  const rules = showIf?.rules ?? [];
  const isSection = field.type === "section";
  const problems = rules.map((rule) => ruleProblem(rule, index, fields));
  const broken = problems.filter(Boolean).length;
  const id = `logic-${field.id}`;

  const setRules = (next: ConditionRule[]) => onChange({ mode: showIf?.mode ?? "all", rules: next });
  const setRule = (at: number, rule: ConditionRule) => setRules(rules.map((item, i) => (i === at ? rule : item)));

  function toggle(on: boolean) {
    if (!on) return onChange(null);
    const ref = candidates[candidates.length - 1];
    if (ref) onChange({ mode: "all", rules: [defaultRule(ref)] });
  }

  return (
    <div className="border-t border-rule px-4 py-4 sm:px-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <label htmlFor={id} className="block text-sm font-medium text-ink">
            Show this {isSection ? "section" : "question"} only if…
          </label>
          <p className="mt-0.5 text-[13px] text-muted">
            {candidates.length === 0 && !showIf
              ? "Add a question above this one to use conditions."
              : isSection
                ? "When hidden, every question in this section is skipped."
                : "Otherwise it stays hidden and isn't asked."}
          </p>
        </div>
        <Switch id={id} checked={!!showIf} onChange={toggle} disabled={!showIf && candidates.length === 0} />
      </div>

      {showIf && (
        <div className="mt-4 space-y-3">
          {broken > 0 && (
            <div className="flex items-start gap-2.5 rounded-control border border-warning-line bg-warning-soft px-3.5 py-3 text-[13px] text-warning">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>
                {broken === 1 ? "One condition no longer works" : `${broken} conditions no longer work`} and will be removed when you save. Fix or remove{" "}
                {broken === 1 ? "it" : "them"} below.
              </p>
            </div>
          )}

          {rules.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
              <span>Show when</span>
              <div className="w-24">
                <Select aria-label="Match mode" value={showIf.mode} onChange={(event) => onChange({ ...showIf, mode: event.target.value === "any" ? "any" : "all" })}>
                  <option value="all">all</option>
                  <option value="any">any</option>
                </Select>
              </div>
              <span>of these are true</span>
            </div>
          )}

          <ol className="space-y-2">
            {rules.map((rule, at) => (
              <li key={at}>
                <RuleRow
                  rule={rule}
                  candidates={candidates}
                  fields={fields}
                  problem={problems[at]}
                  flagIncomplete={!!error}
                  joiner={at === 0 ? "If" : showIf.mode === "any" ? "or" : "and"}
                  onChange={(next) => setRule(at, next)}
                  onRemove={() => (rules.length === 1 ? onChange(null) : setRules(rules.filter((_, i) => i !== at)))}
                />
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              variant="ghost"
              icon={<Plus className="size-4" />}
              disabled={rules.length >= MAX_RULES || candidates.length === 0}
              onClick={() => setRules([...rules, defaultRule(candidates[candidates.length - 1])])}
            >
              Add condition
            </Button>
            {rules.length >= MAX_RULES && <span className="text-xs text-faint">Up to {MAX_RULES} conditions.</span>}
          </div>
          <FieldError message={error} />
        </div>
      )}
    </div>
  );
}

function RuleRow({
  rule,
  candidates,
  fields,
  problem,
  joiner,
  flagIncomplete,
  onChange,
  onRemove,
}: {
  rule: ConditionRule;
  candidates: FormField[];
  fields: FormField[];
  problem: string | null;
  joiner: string;
  flagIncomplete: boolean;
  onChange: (rule: ConditionRule) => void;
  onRemove: () => void;
}) {
  const ref = fields.find((field) => field.id === rule.field);
  const valid = ref && ref.type !== "section" && candidates.includes(ref);
  const ops: ConditionOp[] = ref && ref.type !== "section" ? opsFor(ref.type) : [rule.op];
  const opsShown = ops.includes(rule.op) ? ops : [rule.op, ...ops];
  const incomplete = flagIncomplete && !problem && ruleIncomplete(rule);

  function pickField(id: string) {
    const next = candidates.find((field) => field.id === id);
    if (next) onChange(defaultRule(next));
  }

  function pickOp(op: ConditionOp) {
    if (!ref) return onChange({ ...rule, op });
    const keep = needsValue(op) && rule.value !== undefined && ruleProblem({ ...rule, op }, Number.MAX_SAFE_INTEGER, fields) === null;
    const value = keep ? rule.value : defaultValue(ref, op);
    const next: ConditionRule = { field: rule.field, op };
    if (value !== undefined) next.value = value;
    onChange(next);
  }

  return (
    <div className={cn("rounded-control border p-2.5", problem ? "border-warning-line bg-warning-soft" : "border-line bg-surface")}>
      <div className="flex items-start gap-2">
        <span className="mt-2.5 w-7 shrink-0 font-mono text-[11px] text-faint">{joiner}</span>
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <Select aria-label="Question" value={rule.field} onChange={(event) => pickField(event.target.value)}>
            {!valid && <option value={rule.field}>{ref ? `${untitled(ref)} (unavailable)` : "Deleted question"}</option>}
            {candidates.map((field) => (
              <option key={field.id} value={field.id}>
                {untitled(field)}
              </option>
            ))}
          </Select>
          <Select aria-label="Condition" value={rule.op} onChange={(event) => pickOp(event.target.value as ConditionOp)}>
            {opsShown.map((op) => (
              <option key={op} value={op}>
                {OP_LABELS[op]}
              </option>
            ))}
          </Select>
          {needsValue(rule.op) && ref ? <ValueInput rule={rule} ref_={ref} invalid={incomplete} onChange={onChange} /> : <span className="hidden sm:block" />}
        </div>
        <IconButton label="Remove condition" tone="danger" onClick={onRemove} className="mt-0.5">
          <X className="size-4" />
        </IconButton>
      </div>
      {problem && (
        <p className="mt-2 flex items-center gap-1.5 ps-9 text-xs text-warning">
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
          {problem}
        </p>
      )}
    </div>
  );
}

/** The value box that fits the checked question's type. */
function ValueInput({ rule, ref_, invalid, onChange }: { rule: ConditionRule; ref_: FormField; invalid: boolean; onChange: (rule: ConditionRule) => void }) {
  const set = (value: ConditionRule["value"]) => onChange({ ...rule, value });

  if (isChoice(ref_.type)) {
    const value = rule.value === undefined ? "" : String(rule.value);
    const options = ref_.options ?? [];
    const known = value === "" || value === OTHER || options.some((option) => option.id === value);
    return (
      <Select aria-label="Value" value={value} onChange={(event) => set(event.target.value)} invalid={invalid}>
        {value === "" && <option value="">Pick an option</option>}
        {!known && <option value={value}>Removed option</option>}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label.trim() || "Untitled option"}
          </option>
        ))}
        {(ref_.allow_other || value === OTHER) && <option value={OTHER}>Other</option>}
      </Select>
    );
  }

  if (ref_.type === "yes_no") {
    return (
      <Select aria-label="Value" value={rule.value === false ? "no" : "yes"} onChange={(event) => set(event.target.value === "yes")}>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </Select>
    );
  }

  if (ref_.type === "number" || ref_.type === "scale") {
    return (
      <NumberInput
        aria-label="Value"
        placeholder="Number"
        value={typeof rule.value === "number" ? rule.value : null}
        min={ref_.type === "scale" ? (ref_.min ?? undefined) : undefined}
        max={ref_.type === "scale" ? (ref_.max ?? undefined) : undefined}
        onChange={(value) => set(value ?? undefined)}
        invalid={invalid}
      />
    );
  }

  const inputType = ref_.type === "date" ? "date" : ref_.type === "time" ? "time" : "text";
  return (
    <Input
      aria-label="Value"
      type={inputType}
      placeholder="Answer"
      maxLength={200}
      value={typeof rule.value === "string" ? rule.value : rule.value === undefined ? "" : String(rule.value)}
      onChange={(event) => set(event.target.value)}
      invalid={invalid}
    />
  );
}
