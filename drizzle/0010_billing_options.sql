CREATE TABLE pro_plans (
  id varchar(20) PRIMARY KEY,
  label varchar(100) NOT NULL,
  price numeric(10,2) NOT NULL CONSTRAINT pro_price_positive CHECK (price > 0),
  duration integer NOT NULL CONSTRAINT pro_duration_valid CHECK (duration BETWEEN 1 AND 3650),
  unit varchar(10) NOT NULL CONSTRAINT pro_unit_valid CHECK (unit IN ('days', 'months'))
);
INSERT INTO pro_plans VALUES ('month', 'Monthly', 3, 30, 'days'), ('school_year', 'Yearly', 24, 365, 'days');
CREATE TABLE gift_card_options (
  id serial PRIMARY KEY,
  value numeric(10,2) NOT NULL CONSTRAINT gift_value_positive CHECK (value > 0),
  seller_cost numeric(10,2) NOT NULL CONSTRAINT gift_cost_nonnegative CHECK (seller_cost >= 0)
);
INSERT INTO gift_card_options (value, seller_cost) VALUES (3,3), (6,6), (12,12), (24,24);
