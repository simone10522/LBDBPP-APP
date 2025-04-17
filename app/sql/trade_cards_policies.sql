-- Policy per SELECT: gli utenti possono vedere solo le proprie trade cards
CREATE POLICY "Users can select their own trade cards"
ON public.trade_cards
FOR SELECT
USING (auth.uid() = user_id);

-- Policy per INSERT: gli utenti possono inserire solo trade cards associate al proprio user_id
CREATE POLICY "Users can insert their own trade cards"
ON public.trade_cards
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy per UPDATE: gli utenti possono aggiornare solo le proprie trade cards
CREATE POLICY "Users can update their own trade cards"
ON public.trade_cards
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy per DELETE: gli utenti possono eliminare solo le proprie trade cards
CREATE POLICY "Users can delete their own trade cards"
ON public.trade_cards
FOR DELETE
USING (auth.uid() = user_id);

-- Abilita RLS (Row Level Security) sulla tabella
ALTER TABLE public.trade_cards ENABLE ROW LEVEL SECURITY;
