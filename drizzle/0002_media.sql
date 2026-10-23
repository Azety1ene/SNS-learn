CREATE TABLE "media" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "media_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"owner_id" text NOT NULL,
	"purpose" text NOT NULL,
	"pathname" text NOT NULL,
	"url" text,
	"size_bytes" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "media_pathname_unique" UNIQUE("pathname"),
	CONSTRAINT "media_url_unique" UNIQUE("url"),
	CONSTRAINT "media_purpose" CHECK ("media"."purpose" in ('post', 'avatar')),
	CONSTRAINT "media_size_positive" CHECK ("media"."size_bytes" > 0),
	CONSTRAINT "media_dimensions_positive" CHECK ("media"."width" > 0 and "media"."height" > 0)
);
--> statement-breakpoint
CREATE TABLE "post_media" (
	"post_id" bigint NOT NULL,
	"position" smallint NOT NULL,
	"media_id" bigint NOT NULL,
	"alt_text" text DEFAULT '' NOT NULL,
	CONSTRAINT "post_media_post_id_position_pk" PRIMARY KEY("post_id","position"),
	CONSTRAINT "post_media_media_id_unique" UNIQUE("media_id"),
	CONSTRAINT "post_media_position_range" CHECK ("post_media"."position" between 0 and 3),
	CONSTRAINT "post_media_alt_text_length" CHECK (char_length("post_media"."alt_text") <= 10000)
);
--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_owner_id_created_at_idx" ON "media" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "media_live_idx" ON "media" USING btree ("size_bytes") WHERE "media"."deleted_at" is null;