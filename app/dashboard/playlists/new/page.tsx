"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { createClient } from "@/lib/supabase/client";
import { useCurrentOrganization } from "@/lib/hooks/useCurrentOrganization";
import { createPlaylist } from "@/lib/services/playlists";

export default function NewPlaylistPage() {
  const router = useRouter();
  const { organization } = useCurrentOrganization();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization) return;
    try {
      const playlist = await createPlaylist(supabase, organization.id, { name, description });
      router.push(`/dashboard/playlists/${playlist.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create playlist.");
    }
  }

  return (
    <>
      <PageHeader title="Create playlist" description="A playlist is an ordered loop of active media assets." />
      <Card className="max-w-2xl">
        <form className="space-y-4" onSubmit={submit}>
          <Input placeholder="Playlist name" value={name} onChange={(event) => setName(event.target.value)} required />
          <Textarea placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
          {error ? <p className="text-sm text-offline">{error}</p> : null}
          <Button>Create playlist</Button>
        </form>
      </Card>
    </>
  );
}
