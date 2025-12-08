-- Extend leaderboard users function to include age
CREATE OR REPLACE FUNCTION public.get_users_for_leaderboard()
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    points INTEGER,
    last_award TIMESTAMP WITH TIME ZONE,
    madrasah_maktab TEXT,
    city TEXT,
    avatar TEXT,
    age INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.full_name,
        u.role,
        u.points,
        u.last_award,
        u.madrasah_maktab,
        u.city,
        u.avatar,
        u.age
    FROM public.users u
    ORDER BY u.points DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_users_for_leaderboard() TO anon;
GRANT EXECUTE ON FUNCTION public.get_users_for_leaderboard() TO authenticated;

SELECT pg_notify('pgrst', 'reload schema');

