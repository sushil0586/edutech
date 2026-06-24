import Link from "next/link";
import { ExamPresetPackLibrary } from "@/components/ui/exam-preset-pack-library";
import { PlatformAdminPageHeader } from "@/components/ui/platform-admin-page-header";
import { requirePlatformAdminSession } from "@/lib/auth/session";

export default async function PlatformAdminPresetPackLibraryPage() {
  await requirePlatformAdminSession();

  return (
    <div className="studentPage studentPageTight instituteConsolePage">
      <PlatformAdminPageHeader
        title="Preset Pack Library"
        description="Govern platform starter packs and managed exam product presets from one searchable control surface before handing them to builder workflows."
        action={
          <div className="pageHeaderActionGroup">
            <Link className="button buttonSecondary" href="/admin/exams">
              Back to Exams
            </Link>
            <Link className="button buttonPrimary" href="/admin/exams/advanced">
              Open Advanced Builder
            </Link>
          </div>
        }
      />

      <ExamPresetPackLibrary
        audience="platform"
        builderHref="/admin/exams/advanced"
        scopeLabel="platform"
      />
    </div>
  );
}
