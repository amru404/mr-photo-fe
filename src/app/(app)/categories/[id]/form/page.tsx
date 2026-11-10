"use client";

import { use } from "react";
import { CategoryFormScreen } from "@/features/category-form/form-builder";

export default function CategoryFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <CategoryFormScreen id={id} />;
}
