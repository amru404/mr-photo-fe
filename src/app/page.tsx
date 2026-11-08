import { redirect } from "next/navigation";

/** There is no public landing page: the root opens the dashboard (or sign-in). */
export default function Home() {
  redirect("/dashboard");
}
