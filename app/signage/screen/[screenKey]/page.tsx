import { ScreenPlayer } from "@/components/signage/ScreenPlayer";

export default async function SignageScreenPage({ params }: { params: Promise<{ screenKey: string }> }) {
  const { screenKey } = await params;
  return <ScreenPlayer screenKey={screenKey} />;
}
