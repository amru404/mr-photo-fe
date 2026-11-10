import { Suspense } from "react";
import { NewProjectWizard } from "@/features/projects/new-project-wizard";

export default function NewProjectPage() {
  return (
    <Suspense>
      <NewProjectWizard />
    </Suspense>
  );
}
