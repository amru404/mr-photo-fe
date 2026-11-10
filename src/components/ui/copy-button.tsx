"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "./button";

export async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // The Clipboard API needs a secure context; fall back for plain-http hosts.
    const field = Object.assign(document.createElement("textarea"), { value: text });
    document.body.append(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  }
}

export function CopyButton({
  text,
  children,
  copiedLabel = "Copied",
  variant = "secondary",
  size = "md",
  title,
  className,
}: {
  text: string;
  children: ReactNode;
  copiedLabel?: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
  title?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant={variant}
      size={size}
      title={title}
      className={className}
      icon={copied ? <Check className="size-4 text-positive" strokeWidth={2.5} /> : <Copy className="size-4" />}
      onClick={async () => {
        await writeClipboard(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? copiedLabel : children}
    </Button>
  );
}
