"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { Realm } from "@/types/database";

interface RealmContextType {
  realms: Realm[];
  currentRealm: Realm | null;
  setCurrentRealm: (realm: Realm) => void;
  loading: boolean;
}

const RealmContext = createContext<RealmContextType>({
  realms: [],
  currentRealm: null,
  setCurrentRealm: () => {},
  loading: true,
});

interface RealmProviderProps {
  children: ReactNode;
  isAdmin?: boolean;
}

export function RealmProvider({ children, isAdmin = false }: RealmProviderProps) {
  const [realms, setRealms] = useState<Realm[]>([]);
  const [currentRealm, setCurrentRealm] = useState<Realm | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchRealms = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      let data: Realm[] | null = null;

      if (isAdmin) {
        // Admins can see all realms
        const result = await supabase
          .from("realms")
          .select("*")
          .order("name");
        data = result.data;
      } else {
        // Regular users see only their realms via user_realms
        const result = await supabase
          .from("user_realms")
          .select("realm:realms(*)")
          .eq("user_id", user.id);

        if (result.data) {
          data = result.data
            .map((ur) => ur.realm as unknown as Realm)
            .filter((r): r is Realm => r !== null);
        }
      }

      if (data && data.length > 0) {
        setRealms(data);
        // Restore from localStorage or use first realm
        const savedRealmId = localStorage.getItem("currentRealmId");
        const savedRealm = data.find((r) => r.id === savedRealmId);
        setCurrentRealm(savedRealm || data[0]);
      }
      setLoading(false);
    };

    fetchRealms();
  }, [supabase, isAdmin]);

  const handleSetCurrentRealm = (realm: Realm) => {
    setCurrentRealm(realm);
    localStorage.setItem("currentRealmId", realm.id);
  };

  return (
    <RealmContext.Provider
      value={{
        realms,
        currentRealm,
        setCurrentRealm: handleSetCurrentRealm,
        loading,
      }}
    >
      {children}
    </RealmContext.Provider>
  );
}

export function useRealm() {
  return useContext(RealmContext);
}
