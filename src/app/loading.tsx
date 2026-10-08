import { Loader2 } from "lucide-react";
import BrandMark from "@/components/common/BrandMark";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#050505]">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <BrandMark size="lg" showSubtitle />
        </div>
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
        <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
          Loading workspace
        </div>
      </div>
    </div>
  );
}
