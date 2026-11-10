"use client";

import { useState } from "react";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useQueryState } from "@/lib/use-query-state";
import { useTitle } from "@/lib/use-title";
import { Board, BOARD_TITLE, GalleryFooter, GalleryHeader, PAGE_NARROW, Unavailable } from "@/features/gallery/gallery-chrome";
import { BookMode, type BookState } from "./book-mode";
import { FindMode } from "./find-mode";
import { useBookingInfo } from "./use-booking";

type Mode = "book" | "find";

const MODES: { value: Mode; label: string }[] = [
  { value: "book", label: "Book a shoot" },
  { value: "find", label: "Find my booking" },
];

/** The photographer's public booking form at /book/{token}: no account, the email is the key. */
export function BookingPage({ token }: { token: string }) {
  const info = useBookingInfo(token);
  const query = useQueryState();
  const mode: Mode = query.get("mode") === "find" ? "find" : "book";
  // Kept here so the confirmation survives a trip to "Find my booking" and back.
  const [book, setBook] = useState<BookState>({ step: "form" });

  const studio = info.data?.studio.name;
  const missing = info.error instanceof ApiError && info.error.status === 404;
  useTitle(info.isError ? (missing ? "Booking unavailable" : "Something went wrong") : studio ? `${mode === "find" ? "Find my booking" : "Book a shoot"} · ${studio}` : null);

  const setMode = (next: Mode) => query.set({ mode: next }, { defaults: { mode: "book" } });

  if (info.isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (info.isError) {
    return (
      <>
        {missing ? (
          <Unavailable
            brand="Booking"
            heading="This booking link isn't available"
            message="It may have been replaced by a new one. Ask the photographer for their current booking link."
          />
        ) : (
          <Unavailable brand="Booking" heading="Something went wrong" message="We couldn't load this booking form. Please refresh the page in a moment." />
        )}
        <GalleryFooter />
      </>
    );
  }

  const data = info.data;

  return (
    <>
      <GalleryHeader brand={data.studio.name} title={mode === "find" ? "Find my booking" : "Book a shoot"} />

      <main className={cn(PAGE_NARROW, "space-y-4 pt-5")}>
        <Board>
          <div className="flex flex-col gap-5 p-5 sm:p-6">
            <div className="min-w-0">
              <p className="eyebrow truncate">{data.studio.name}</p>
              <h1 className={cn(BOARD_TITLE, "mt-1.5")}>{mode === "find" ? "Find my booking" : "Book a shoot"}</h1>
              <p className="mt-1.5 max-w-xl text-[13px] text-muted">
                {mode === "find"
                  ? "See where your requests stand, and change the ones still waiting for approval."
                  : `Tell ${data.studio.name} when and where you'd like to shoot. Your request is confirmed once they approve it.`}
              </p>
            </div>
            <Segmented variant="chips" label="Booking" options={MODES} value={mode} onChange={setMode} />
          </div>
        </Board>

        {/* Book mode stays mounted while hidden, so a half-filled form isn't lost. */}
        <div hidden={mode !== "book"}>
          <BookMode token={token} info={data} state={book} onChange={setBook} onFind={() => setMode("find")} />
        </div>
        {mode === "find" && <FindMode token={token} info={data} />}
      </main>

      <GalleryFooter />
    </>
  );
}
