"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormRenderer } from "@/features/booking-form/renderer";
import type { Answers, FormSchema } from "@/features/booking-form/schema";

/** The form as a client would fill it in; answers stay local so conditions can be tried live. */
export function FormPreview({ form, name }: { form: FormSchema; name: string }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const touched = Object.keys(answers).length > 0 || Object.keys(files).length > 0;

  return (
    <section className="rounded-card border border-line bg-surface">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-rule px-5 py-4">
        <div className="min-w-0">
          <p className="eyebrow">Preview</p>
          <h2 className="deck-title mt-1">{name}</h2>
          <p className="mt-1 text-[13px] text-muted">Try some answers to check your conditions. Nothing here is saved or sent.</p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          icon={<RotateCcw className="size-4" />}
          disabled={!touched}
          onClick={() => {
            setAnswers({});
            setFiles({});
          }}
        >
          Reset answers
        </Button>
      </header>
      <div className="p-5">
        <p className="mb-6 rounded-control bg-raised px-3.5 py-3 text-[13px] text-muted">
          Name, email, phone, date, time, location and category are asked first, then these questions.
        </p>
        {form.fields.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No questions yet. Go back to editing to add some.</p>
        ) : (
          <FormRenderer form={form} answers={answers} onAnswers={setAnswers} files={files} onFiles={setFiles} preview />
        )}
      </div>
    </section>
  );
}
