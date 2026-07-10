import { ScreenPlayer } from "@/components/signage/ScreenPlayer";
import { RegisterServiceWorker } from "@/components/signage/RegisterServiceWorker";

export default async function SignageScreenPage({ params }: { params: Promise<{ screenKey: string }> }) {
  const { screenKey } = await params;
  return (
    <>
      <RegisterServiceWorker />
      <ScreenPlayer screenKey={screenKey} />
    </>
  );
}
