"use client";

import { PageBody, PageHeader } from "@/components/app-shell";
import { CategoriesPanel } from "@/features/categories/categories-panel";
import { useTitle } from "@/lib/use-title";

export default function CategoriesPage() {
  useTitle("Project categories");

  return (
    <PageBody width="narrow">
      <PageHeader
        eyebrow="Account"
        title="Project categories"
        description="Used to group projects, each with its own booking form. Deleting one keeps its projects, just without a category."
      />
      <section className="mt-7 overflow-hidden rounded-card border border-line bg-surface">
        <CategoriesPanel />
      </section>
    </PageBody>
  );
}
