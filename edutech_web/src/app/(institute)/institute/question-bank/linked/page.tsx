import { InstituteQuestionBankPageView } from "@/app/(institute)/institute/question-bank/page";

export default async function InstituteLinkedQuestionBankPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return InstituteQuestionBankPageView({ searchParams, linkedOnly: true });
}
