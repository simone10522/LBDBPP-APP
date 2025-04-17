-- Enable RLS (Row Level Security)
create table public.trade_notifications (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default now(),
    sender_id uuid references auth.users(id) on delete cascade,
    receiver_id uuid references auth.users(id) on delete cascade,
    trade_match_id uuid references trade_matches(id) on delete cascade,
    notification_type text not null check (
        notification_type in (
            'new_trade_request',
            'trade_accepted',
            'trade_rejected',
            'trade_cancelled',
            'trade_completed',
            'trade_modified'
        )
    ),
    read boolean default false,
    message text
);

-- Imposta RLS
alter table public.trade_notifications enable row level security;

-- Crea policy per inserimento
create policy "Users can insert notifications" on public.trade_notifications
    for insert with check (auth.uid() = sender_id);

-- Crea policy per visualizzazione
create policy "Users can view their notifications" on public.trade_notifications
    for select using (auth.uid() = receiver_id);

-- Crea policy per aggiornamento
create policy "Users can update their received notifications" on public.trade_notifications
    for update using (auth.uid() = receiver_id);

-- Crea indici per migliorare le performance
create index trade_notifications_receiver_id_idx on public.trade_notifications(receiver_id);
create index trade_notifications_read_idx on public.trade_notifications(read);

-- Trigger per notificare in realtime
create or replace function public.handle_new_trade_notification()
returns trigger
language plpgsql
security definer
as $$
begin
  perform pg_notify(
    'new_trade_notification',
    json_build_object(
      'receiver_id', new.receiver_id,
      'type', new.notification_type,
      'trade_match_id', new.trade_match_id,
      'created_at', new.created_at
    )::text
  );
  return new;
end;
$$;

create trigger on_new_trade_notification
  after insert on public.trade_notifications
  for each row
  execute procedure public.handle_new_trade_notification();
