insert into public.users (revenuecat_app_user_id)
values ('anon_demo_user')
on conflict (revenuecat_app_user_id) do nothing;

insert into public.crown_wallets (user_id, free_crowns, free_granted_at)
select id, 10, now()
from public.users
where revenuecat_app_user_id = 'anon_demo_user'
on conflict (user_id) do nothing;
