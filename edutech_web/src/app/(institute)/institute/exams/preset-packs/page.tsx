import Link from "next/link";
import { ExamPresetPackLibrary } from "@/components/ui/exam-preset-pack-library";
import { InstitutePageHeader } from "@/components/ui/institute-page-header";
import { requireInstituteAdminSession } from "@/lib/auth/session";

export default async function InstitutePresetPackLibraryPage() {
  await requireInstituteAdminSession();

  return (
    <div className="studentPage studentPageTight instituteConsolePage">
      <InstitutePageHeader
        title="Preset Pack Library"
        description="Review reusable exam product packs, edit institute-managed metadata, and launch directly into builder with the right runtime profile preloaded."
        action={
          <div className="pageHeaderActionGroup">
            <Link className="button buttonSecondary" href="/institute/exams">
              Back to Exams
            </Link>
            <Link className="button buttonPrimary" href="/institute/exams/advanced">
              Open Advanced Builder
            </Link>
          </div>
        }
      />

      <ExamPresetPackLibrary
        audience="institute"
        builderHref="/institute/exams/advanced"
        scopeLabel="institute"
      />
    </div>
  );
}
