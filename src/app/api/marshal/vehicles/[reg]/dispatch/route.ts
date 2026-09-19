/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/marshal/vehicles/[reg]/dispatch
 *
 * Body: { action: "load" | "full_cabin" | "depart" | "delay" | "breakdown" | "reset_to_waiting", reason?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getMarshalContext } from "@/lib/marshal/queries";
import { applyDispatchAction, type DispatchAction } from "@/lib/marshal/dispatch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Params {
  params: Promise<{ reg: string }>;
}

const VALID_ACTIONS: DispatchAction[] = [
  "load",
  "full_cabin",
  "depart",
  "delay",
  "breakdown",
  "reset_to_waiting",
];

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "marshal") {
      return NextResponse.json(
        { error: "Marshal access required" },
        { status: 403 }
      );
    }

    const context = await getMarshalContext(session.authUserId);
    if (!context) {
      return NextResponse.json(
        { error: "Marshal assignment not found" },
        { status: 404 }
      );
    }

    const { reg } = await params;
    const registrationNumber = decodeURIComponent(reg).toUpperCase();

    const body = await request.json();
    const action = String(body.action ?? "") as DispatchAction;
    const reason = typeof body.reason === "string" ? body.reason.trim() : undefined;

    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action: ${action}` },
        { status: 400 }
      );
    }

    const result = await applyDispatchAction(
      context,
      registrationNumber,
      action,
      reason
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Dispatch failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      newStatus: result.newStatus,
      rankFeeWritten: result.rankFeeWritten ?? false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/marshal/dispatch] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
