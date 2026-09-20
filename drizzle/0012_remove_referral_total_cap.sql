-- Called inside the redemption transaction, after taking the referral advisory lock.
CREATE OR REPLACE FUNCTION reward_referral(load_id text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  referral referrals%ROWTYPE;
  card codes%ROWTYPE;
  recipient "user"%ROWTYPE;
  earned numeric;
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
  reward := LEAST(round(card.value * 0.10, 2), 5 - earned);
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
