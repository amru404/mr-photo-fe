"use client";

import { Suspense, use } from "react";
import { ProjectDetailScreen } from "@/features/project/project-detail";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense>
      <ProjectDetailScreen id={id} />
    </Suspense>
  );
}
