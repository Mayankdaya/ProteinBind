import Index from "@/components/Dashboard";
import { Metadata } from "next";
import DefaultLayout from "@/components/Layouts/DefaultLayout";

export const metadata: Metadata = {
  title: "ProteinBind Dashboard",
  description: "Your protein binding analysis platform",
};

export default function Home() {
  return (
    <DefaultLayout>
      <Index />
    </DefaultLayout>
  );
}