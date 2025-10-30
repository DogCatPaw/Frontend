import { getAdoptionList } from "@/lib/api/adopt/adoption";
import AdoptClient from "./AdoptClient";

// Server Component - 초기 데이터를 서버에서 fetch
export default async function AdoptPage() {
  // 서버에서 초기 입양 공고 리스트 가져오기
  const initialData = await getAdoptionList({
    size: 9,
  });

  return (
    <AdoptClient
      initialAdoptions={initialData.result.adoptions}
      initialNextCursor={initialData.result.nextCursor}
    />
  );
}
