export const metadata = {
  title: "Dashboard | Discovery Platform",
};

import { redirect } from "next/navigation";

export default function DashboardPageRedirect() {
  redirect("/");
}
