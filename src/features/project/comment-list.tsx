import { Pill } from "@/components/ui/pill";
import type { Comment } from "@/lib/types";

/** Comments on one photo, the client's tagged apart from the photographer's. */
export function CommentList({ comments }: { comments: Comment[] }) {
  return (
    <ul className="mt-2 space-y-2">
      {comments.map((comment) => (
        <li key={comment.id} className="flex gap-2">
          <Pill tone={comment.is_client ? "warning" : "accent"} className="mt-px">
            {comment.is_client ? "Client" : "You"}
          </Pill>
          <p className="min-w-0 whitespace-pre-line break-words text-sm text-ink">{comment.body}</p>
        </li>
      ))}
    </ul>
  );
}
