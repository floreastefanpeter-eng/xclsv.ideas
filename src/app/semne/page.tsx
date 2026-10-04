import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { StationBand } from "@/components/punte/station-band";
import { SignGuide } from "@/components/punte/sign-guide";
import { ASL_CREDIT } from "@/lib/asl/glossary";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Ghidul semnelor · Punte" };

export default function SignsPage() {
  return (
    <>
    <StationBand right={<Link href="/" className={cn(buttonVariants({ variant: "ghost" }), "text-white hover:bg-white/10 hover:text-white")}>
          <ArrowLeft aria-hidden />
          Înapoi
        </Link>} />
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 pb-16 pt-6">
      <div>
        <h1 className="font-display text-4xl font-extrabold">Ghidul semnelor</h1>
        <p className="mt-2 text-lg text-ink/80">
          Semnele pe care le recunoaște modelul open source, cu traducerea în română. Fiecare are un video ASL de referință și
          căutarea semnului românesc în DLMG.
        </p>
      </div>
      <SignGuide />
      <p className="text-sm text-muted-foreground">
        Model: {ASL_CREDIT.model}, © {ASL_CREDIT.author}, {ASL_CREDIT.modelLicense}. Date: {ASL_CREDIT.dataset}.
      </p>
    </main>
    </>
  );
}
