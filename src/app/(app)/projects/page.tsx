import { Suspense } from "react";
import { ProjectsIndex } from "@/features/projects/projects-index";

export default function ProjectsPage() {
  return (
    <Suspense>
      <ProjectsIndex />
    </Suspense>
  );
}
