CREATE TABLE "competitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"source_kind" text NOT NULL,
	"repo" text NOT NULL,
	"season" text NOT NULL,
	"file" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp with time zone,
	"last_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "competitions_code_unique" UNIQUE("code")
);
