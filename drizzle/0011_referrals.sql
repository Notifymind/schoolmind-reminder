ALTER TABLE "user" ADD COLUMN referral_code text NOT NULL DEFAULT gen_random_uuid()::text UNIQUE;
--> statement-breakpoint
-- IDs are retained as audit records when an account is deleted. They are never reused.
CREATE TABLE referrals (
  referred_id text PRIMARY KEY,
  referrer_id text NOT NULL,
  created_at timestamp NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT referral_not_self CHECK (referred_id <> referrer_id)
);
CREATE INDEX referrals_referrer_idx ON referrals(referrer_id);
CREATE TABLE referral_rewards (
  code_id text PRIMARY KEY,
  referred_id text NOT NULL REFERENCES referrals(referred_id),
  amount numeric(10,2) NOT NULL CHECK (amount > 0 AND amount <= 5),
  created_at timestamp NOT NULL DEFAULT clock_timestamp()
);
--> statement-breakpoint
CREATE FUNCTION protect_referral() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'Referral relationships are permanent';
  END IF;
  PERFORM pg_advisory_xact_lock(73401911);
  PERFORM 1 FROM "user" WHERE id = NEW.referred_id
    AND NOT ('seller' = ANY(string_to_array(role, ','))) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account cannot be referred'; END IF;
  PERFORM 1 FROM "user" WHERE id = NEW.referrer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Referrer not found'; END IF;
  NEW.created_at := clock_timestamp();
  RETURN NEW;
END $$;
CREATE TRIGGER protect_referral BEFORE INSERT OR UPDATE OR DELETE ON referrals
FOR EACH ROW EXECUTE FUNCTION protect_referral();
--> statement-breakpoint
CREATE FUNCTION protect_referral_code() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.referral_code IS DISTINCT FROM OLD.referral_code THEN
    RAISE EXCEPTION 'Referral codes are permanent';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_referral_code BEFORE UPDATE OF referral_code ON "user"
FOR EACH ROW EXECUTE FUNCTION protect_referral_code();
--> statement-breakpoint
-- Called inside the redemption transaction, after taking the referral advisory lock.
CREATE FUNCTION reward_referral(load_id text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  referral referrals%ROWTYPE;
  card codes%ROWTYPE;
  recipient "user"%ROWTYPE;
  earned numeric;
  total_earned numeric;
  reward numeric;
BEGIN
  PERFORM pg_advisory_xact_lock(73401911);
  SELECT * INTO card FROM codes WHERE id = load_id;
  IF card.type <> 'balance' OR card.redeemed_by IS NULL OR card.redeemed_at IS NULL THEN RETURN; END IF;
  SELECT * INTO referral FROM referrals WHERE referred_id = card.redeemed_by;
  IF NOT FOUND OR card.redeemed_at < referral.created_at THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM "user" WHERE id = card.redeemed_by AND 'seller' = ANY(string_to_array(role, ','))) THEN RETURN; END IF;
  SELECT * INTO recipient FROM "user" WHERE id = referral.referrer_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT COALESCE(sum(amount), 0) INTO earned FROM referral_rewards WHERE referred_id = referral.referred_id;
  SELECT COALESCE(sum(r.amount), 0) INTO total_earned FROM referral_rewards r
    JOIN referrals f ON f.referred_id = r.referred_id WHERE f.referrer_id = referral.referrer_id;
  reward := LEAST(round(card.value * 0.10, 2), 5 - earned, 20 - total_earned);
  IF reward <= 0 THEN RETURN; END IF;
  INSERT INTO referral_rewards(code_id, referred_id, amount) VALUES (card.id, referral.referred_id, reward)
    ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN; END IF;
  IF 'seller' = ANY(string_to_array(recipient.role, ',')) THEN
    UPDATE "user" SET balance = balance + reward WHERE id = recipient.id;
  ELSE
    UPDATE "user" SET wallet_balance = wallet_balance + reward WHERE id = recipient.id;
  END IF;
END $$;
