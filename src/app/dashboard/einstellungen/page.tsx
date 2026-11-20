import { redirect } from "next/navigation";

export default function EinstellungenRedirectPage() {
  redirect("/dashboard/settings");
}
