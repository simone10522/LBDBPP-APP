ALTER TABLE trade_matches 
ADD CONSTRAINT unique_trade_match 
UNIQUE (user1_id, user2_id, user1_cards, user2_cards);
