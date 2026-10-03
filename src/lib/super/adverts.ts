/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";
import type { Advert } from "../../types";

export async function listAdverts(): Promise<Advert[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("adverts")
    .select("*")
    .order("created_at", { ascending: false });

  return (data ?? []).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    sponsorName: r.sponsor_name as string,
    imageUrl: r.image_url as string,
    targetRegions: (r.target_regions as string[]) ?? [],
    isActive: (r.is_active as boolean) ?? true,
    createdAt: r.created_at as string,
    description: (r.description as string | null) ?? undefined,
    promoCode: (r.promo_code as string | null) ?? undefined,
    contactPhone: (r.contact_phone as string | null) ?? undefined,
    websiteUrl: (r.website_url as string | null) ?? undefined,
    category: (r.category as string | null) ?? undefined,
  }));
}

export async function createAdvert(input: Partial<Advert>): Promise<{
  success: boolean;
  advert?: Advert;
  error?: string;
}> {
  const admin = createSupabaseAdminClient();
  const id = input.id ?? `adv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const { data, error } = await admin
    .from("adverts")
    .insert({
      id,
      title: input.title ?? "",
      sponsor_name: input.sponsorName ?? "",
      image_url: input.imageUrl ?? "",
      target_regions: input.targetRegions ?? ["All"],
      is_active: input.isActive ?? true,
      description: input.description ?? null,
      promo_code: input.promoCode ?? null,
      contact_phone: input.contactPhone ?? null,
      website_url: input.websiteUrl ?? null,
      category: input.category ?? null,
    })
    .select("*")
    .single();

  if (error || !data) return { success: false, error: error?.message };

  return {
    success: true,
    advert: {
      id: data.id as string,
      title: data.title as string,
      sponsorName: data.sponsor_name as string,
      imageUrl: data.image_url as string,
      targetRegions: (data.target_regions as string[]) ?? [],
      isActive: (data.is_active as boolean) ?? true,
      createdAt: data.created_at as string,
      description: (data.description as string | null) ?? undefined,
      promoCode: (data.promo_code as string | null) ?? undefined,
      contactPhone: (data.contact_phone as string | null) ?? undefined,
      websiteUrl: (data.website_url as string | null) ?? undefined,
      category: (data.category as string | null) ?? undefined,
    },
  };
}

export async function updateAdvert(
  id: string,
  input: Partial<Advert>
): Promise<{ success: boolean; error?: string }> {
  const admin = createSupabaseAdminClient();
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.sponsorName !== undefined) patch.sponsor_name = input.sponsorName;
  if (input.imageUrl !== undefined) patch.image_url = input.imageUrl;
  if (input.targetRegions !== undefined) patch.target_regions = input.targetRegions;
  if (input.isActive !== undefined) patch.is_active = input.isActive;
  if (input.description !== undefined) patch.description = input.description;
  if (input.promoCode !== undefined) patch.promo_code = input.promoCode;
  if (input.contactPhone !== undefined) patch.contact_phone = input.contactPhone;
  if (input.websiteUrl !== undefined) patch.website_url = input.websiteUrl;
  if (input.category !== undefined) patch.category = input.category;
  patch.updated_at = new Date().toISOString();

  const { error } = await admin.from("adverts").update(patch).eq("id", id);
  return { success: !error, error: error?.message };
}

export async function deleteAdvert(id: string): Promise<{ success: boolean; error?: string }> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("adverts").delete().eq("id", id);
  return { success: !error, error: error?.message };
}
