import { createCampaignAction } from "@/modules/marketing/actions";
import { CampaignForm } from "@/modules/marketing/components/CampaignForm";

const CHANNEL_LABELS: Record<string, string> = {
  social_media: "Redes sociales",
  email: "Email",
  flyers: "Folletos / Volantes",
  word_of_mouth: "Boca a boca",
  website: "Sitio web",
  other: "Otro",
};

export default function NewCampaignPage() {
  const channels = Object.entries(CHANNEL_LABELS).map(([value, label]) => ({ value, label }));

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Nueva campaña</h2>
        <p className="text-sm text-slate-400 mt-0.5">Registrá una campaña de marketing</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-xl">
        <CampaignForm channels={channels} action={createCampaignAction} />
      </div>
    </div>
  );
}
