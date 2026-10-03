-- Remove a legacy invalid WhatsApp link so the product-specific route is used dynamically.
update public.produtos
set whatsapp_compartilhar_url = null,
    updated_at = now()
where whatsapp_compartilhar_url = 'https://gvitrine.vercel.app/Agenda-PRO';