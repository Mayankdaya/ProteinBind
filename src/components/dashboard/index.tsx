'use client';
import dynamic from "next/dynamic";
import React from "react";
import Link from "next/link";
import CTACard from "./components/CTACard";
import { AtomIcon, MessageCircle, Network, SearchIcon } from "lucide-react";

const DashboardCardMap = dynamic(
  () => import("@/components/dashboard/components/DashboardCardMap"),
  {
    ssr: false,
  },
);

const DashboardCardChat = dynamic(
  () => import("@/components/dashboard/components/DashboardCardChat"),
  {
    ssr: false,
  },
);

const Index: React.FC = () => {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4 2xl:gap-7.5">
        <Link href="/molecule-bank">
          <CTACard subtitle="Browse molecular database" title="Molecule Bank">
            <AtomIcon />
          </CTACard>
        </Link>
        
        <Link href="/model">
          <CTACard
            subtitle="Create new molecules"
            title="Generate Molecule"
          >
            <Network />
          </CTACard>
        </Link>

        <Link href="/research">
          <CTACard
            subtitle="Explore compounds"
            title="Search Compounds"
          >
            <SearchIcon />
          </CTACard>
        </Link>

        <Link href="/research">
          <CTACard
            subtitle="Connect with researchers"
            title="Collaborative Research"
          >
            <MessageCircle />
          </CTACard>
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-7.5 2xl:gap-7.5">
        <DashboardCardChat />
        <DashboardCardMap />
      </div>
    </>
  );
};

export default Index;
