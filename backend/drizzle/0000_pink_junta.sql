CREATE TYPE "public"."payment_method" AS ENUM('cash', 'transfer', 'card', 'other');--> statement-breakpoint
CREATE TYPE "public"."raffle_status" AS ENUM('draft', 'active', 'closed');--> statement-breakpoint
CREATE TYPE "public"."ticket_event_type" AS ENUM('reserved', 'payment_registered', 'paid', 'released', 'reassigned', 'updated');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('reserved', 'paid');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "raffles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"ticket_price_cents" bigint NOT NULL,
	"currency" text DEFAULT 'COP' NOT NULL,
	"number_min" integer DEFAULT 0 NOT NULL,
	"number_max" integer DEFAULT 99 NOT NULL,
	"number_digits" integer DEFAULT 2 NOT NULL,
	"draw_date" timestamp with time zone,
	"lottery_reference" text,
	"status" "raffle_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "raffles_ticket_price_positive" CHECK ("raffles"."ticket_price_cents" > 0),
	CONSTRAINT "raffles_number_range_valid" CHECK ("raffles"."number_min" >= 0 and "raffles"."number_max" > "raffles"."number_min"),
	CONSTRAINT "raffles_number_digits_valid" CHECK ("raffles"."number_digits" between 1 and 6)
);
--> statement-breakpoint
CREATE TABLE "prizes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"raffle_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prizes_raffle_id_position_unique" UNIQUE("raffle_id","position")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_owner_id_phone_unique" UNIQUE("owner_id","phone")
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"raffle_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"customer_id" uuid NOT NULL,
	"status" "ticket_status" DEFAULT 'reserved' NOT NULL,
	"amount_paid_cents" bigint DEFAULT 0 NOT NULL,
	"notes" text,
	"reserved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tickets_raffle_id_number_unique" UNIQUE("raffle_id","number"),
	CONSTRAINT "tickets_number_non_negative" CHECK ("tickets"."number" >= 0),
	CONSTRAINT "tickets_amount_paid_non_negative" CHECK ("tickets"."amount_paid_cents" >= 0),
	CONSTRAINT "tickets_paid_at_matches_status" CHECK (("tickets"."status" = 'paid') = ("tickets"."paid_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"amount_cents" bigint NOT NULL,
	"method" "payment_method" DEFAULT 'cash' NOT NULL,
	"note" text,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_positive" CHECK ("payments"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "ticket_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"raffle_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"type" "ticket_event_type" NOT NULL,
	"actor_id" uuid,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "raffles" ADD CONSTRAINT "raffles_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prizes" ADD CONSTRAINT "prizes_raffle_id_raffles_id_fk" FOREIGN KEY ("raffle_id") REFERENCES "public"."raffles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_raffle_id_raffles_id_fk" FOREIGN KEY ("raffle_id") REFERENCES "public"."raffles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_events" ADD CONSTRAINT "ticket_events_raffle_id_raffles_id_fk" FOREIGN KEY ("raffle_id") REFERENCES "public"."raffles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_events" ADD CONSTRAINT "ticket_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "raffles_owner_id_idx" ON "raffles" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "raffles_owner_id_status_idx" ON "raffles" USING btree ("owner_id","status");--> statement-breakpoint
CREATE INDEX "prizes_raffle_id_idx" ON "prizes" USING btree ("raffle_id");--> statement-breakpoint
CREATE INDEX "customers_owner_id_idx" ON "customers" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "tickets_raffle_id_status_idx" ON "tickets" USING btree ("raffle_id","status");--> statement-breakpoint
CREATE INDEX "tickets_customer_id_idx" ON "tickets" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "payments_ticket_id_idx" ON "payments" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "ticket_events_raffle_id_created_at_idx" ON "ticket_events" USING btree ("raffle_id","created_at");--> statement-breakpoint
CREATE INDEX "ticket_events_raffle_id_number_idx" ON "ticket_events" USING btree ("raffle_id","number");