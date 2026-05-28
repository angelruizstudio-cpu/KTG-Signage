"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UploadCloud } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { createClient } from "@/lib/supabase/client";
import { useCurrentOrganization } from "@/lib/hooks/useCurrentOrganization";
import { uploadMediaAsset } from "@/lib/services/media";

export default function UploadMediaPage() {
  const router = useRouter();
  const { organization } = useCurrentOrganization();
  const supabase = createClient();
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization || !file) return;
    setLoading(true);
    setError(null);
    try {
      await uploadMediaAsset(supabase, file, organization.id, description);
      router.push("/dashboard/media");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader title="Upload media" description="Supported: JPG, PNG, WebP, MP4, and WebM. Images up to 10 MB. Videos up to 250 MB." />
      <Card className="max-w-2xl">
        <form className="space-y-5" onSubmit={submit}>
          <label className="grid min-h-48 cursor-pointer place-items-center rounded-lg border border-dashed border-slate-700 bg-surface p-6 text-center hover:border-cyan">
            <div>
              <UploadCloud className="mx-auto mb-3 h-10 w-10 text-cyan" />
              <p className="font-semibold">{file ? file.name : "Choose a media file"}</p>
              <p className="mt-1 text-sm text-slate-400">The player will use the uploaded public URL for MVP reliability.</p>
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <Textarea placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
          {error ? <p className="text-sm text-offline">{error}</p> : null}
          <Button disabled={!file || loading}>{loading ? "Uploading..." : "Upload media"}</Button>
        </form>
      </Card>
    </>
  );
}
