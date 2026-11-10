"use client";

import { use } from "react";
import { ClientDetailScreen } from "@/features/clients/client-detail";

export default function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ClientDetailScreen id={id} />;
}
