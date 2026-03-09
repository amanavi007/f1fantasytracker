import { UploadPanel } from "@/components/upload-panel";
import { getGps, getScreenshotUploads } from "@/lib/data";

export default async function UploadPage() {
  const [gps, uploads] = await Promise.all([getGps(), getScreenshotUploads()]);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-[0.2em] text-accent">Race-Day Fast Flow</p>
        <h1 className="mt-2 font-display text-3xl tracking-[0.1em]">Batch Upload & Parse</h1>
      </section>
      <UploadPanel gps={gps} uploads={uploads} />
    </div>
  );
}
