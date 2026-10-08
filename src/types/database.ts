/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Minimal Supabase database contract used to keep the runtime schema and
 * TypeScript client aligned without requiring generated types in this repo.
 *
 * The app queries many tables dynamically, so we intentionally keep the table
 * contracts permissive here. This prevents the "never[]" cascade caused by
 * an empty or missing Database type while retaining a single source of truth.
 */

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json }
    | Json[];

export type Database = {
    public: {
        Tables: Record<
            string,
            {
                Row: Record<string, any>;
                Insert: Record<string, any>;
                Update: Record<string, any>;
                Relationships: Array<{
                    foreignKeyName: string;
                    columns: string[];
                    referencedTable: string;
                    referencedColumns: string[];
                }>;
            }
        >;
        Views: Record<string, { Row: Record<string, any> }>;
        Functions: Record<string, any>;
        Enums: Record<string, string>;
        CompositeTypes: Record<string, any>;
    };
};
