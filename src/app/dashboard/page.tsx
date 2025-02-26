import Index from "@/components/Dashboard";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | ProteinBind",
  description: "ProteinBind Dashboard",
};

export default function DashboardPage() {
  return (
    <DefaultLayout>
      <Index />
    </DefaultLayout>
  );
}
