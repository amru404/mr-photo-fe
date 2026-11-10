import { Suspense } from "react";
import { ClientsIndex } from "@/features/clients/clients-index";

export default function ClientsPage() {
  return (
    <Suspense>
      <ClientsIndex />
    </Suspense>
  );
}
