"use client";

import ImageUploadField from "@/components/common/ImageUploadField";
import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import type { Advert } from "@/types";

interface Props {
  advert?: Advert;
  onClose: () => void;
  onSaved: () => void;
}

const REGIONS = ["All", "Hhohho", "Manzini", "Lubombo", "Shiselweni"];

export default function AdvertFormModal({ advert, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(advert?.title ?? "");
  const [sponsorName, setSponsorName] = useState(advert?.sponsorName ?? "");
  const [imageUrl, setImageUrl] = useState(advert?.imageUrl ?? "");
  const [description, setDescription] = useState(advert?.description ?? "");
  const [promoCode, setPromoCode] = useState(advert?.promoCode ?? "");
  const [contactPhone, setContactPhone] = useState(advert?.contactPhone ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(advert?.websiteUrl ?? "");
  const [category, setCategory] = useState(advert?.category ?? "Fintech");
  const [regions, setRegions] = useState<string[]>(advert?.targetRegions?.map(String) ?? ["All"]);
  const [isActive, setIsActive] = useState(advert?.isActive ?? true);
  const [loading, setLoading] = useState(false);

  const toggleRegion = (r: string) => {
    if (r === "All") {
      setRegions(["All"]);
      return;
    }
    const without = regions.filter((x) => x !== "All");
    if (without.includes(r)) setRegions(without.filter((x) => x !== r));
    else setRegions([...without, r]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const body = {
      title,
      sponsorName,
      imageUrl,
      description,
      promoCode,
      contactPhone,
      websiteUrl,
      category,
      targetRegions: regions,
      isActive,
    };
    const url = advert ? `/api/super/adverts/${advert.id}` : "/api/super/adverts";
    const method = advert ? "PATCH" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) onSaved();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between p-5 border-b border-white/[0.06]">
          <h3 className="text-sm font-black uppercase text-white">
            {advert ? "Edit Advert" : "New Advert"}
          </h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-zinc-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <Input label="Title *" value={title} onChange={setTitle} required />
          <Input label="Sponsor *" value={sponsorName} onChange={setSponsorName} required />
          <ImageUploadField
            label="Advert image"
            value={imageUrl}
            onChange={setImageUrl}
            folder="adverts"
            required
          />

          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Promo Code" value={promoCode} onChange={setPromoCode} />
            <Input label="Contact Phone" value={contactPhone} onChange={setContactPhone} />
          </div>

          <Input label="Website URL" value={websiteUrl} onChange={setWebsiteUrl} />
          <Input label="Category" value={category} onChange={setCategory} />

          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Target Regions</label>
            <div className="flex flex-wrap gap-1.5">
              {REGIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRegion(r)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                    regions.includes(r)
                      ? "bg-amber-500 text-black"
                      : "bg-white/[0.06] text-zinc-500"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-zinc-300">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded text-emerald-600"
            />
            Active on kiosk
          </label>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white/[0.06] rounded-xl text-xs font-bold text-zinc-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Advert
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
        {label}
      </label>
      <input
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white"
      />
    </div>
  );
}
