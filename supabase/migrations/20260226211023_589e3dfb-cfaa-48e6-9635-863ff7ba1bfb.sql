
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  -- Default role: superadmin
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'superadmin');
  RETURN NEW;
END;
$function$;
