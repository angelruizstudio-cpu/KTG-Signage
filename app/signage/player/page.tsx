import { KioskScreenPlayer } from "@/components/signage/KioskScreenPlayer";
import { RegisterServiceWorker } from "@/components/signage/RegisterServiceWorker";

export default function DevicePlayerPage() {
  return (
    <>
      <RegisterServiceWorker />
      <KioskScreenPlayer />
    </>
  );
}
