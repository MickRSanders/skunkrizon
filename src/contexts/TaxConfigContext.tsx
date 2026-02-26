import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";
import { toast } from "sonner";

export type TaxTreatment = "equalized" | "protected" | "employee_borne" | "laissez_faire";
export type GrossUpMode = "standard" | "selective" | "none";

export interface TaxConfig {
  taxTreatment: TaxTreatment;
  grossUpMode: GrossUpMode;
  includeSocialSecurity: boolean;
  includeHousingInGrossUp: boolean;
  includeEducationInGrossUp: boolean;
  includeColaInGrossUp: boolean;
  hypoTaxMethod: string;
  equalizationSettlement: string;
}

interface TaxConfigContextValue extends TaxConfig {
  isLoading: boolean;
  setTaxTreatment: (v: TaxTreatment) => void;
  setGrossUpMode: (v: GrossUpMode) => void;
  setIncludeSocialSecurity: (v: boolean) => void;
  setIncludeHousingInGrossUp: (v: boolean) => void;
  setIncludeEducationInGrossUp: (v: boolean) => void;
  setIncludeColaInGrossUp: (v: boolean) => void;
  setHypoTaxMethod: (v: string) => void;
  setEqualizationSettlement: (v: string) => void;
  simulationTaxApproach: string;
  grossUpMultiplier: number;
}

const TaxConfigContext = createContext<TaxConfigContextValue | undefined>(undefined);

const TAX_APPROACH_MAP: Record<TaxTreatment, string> = {
  equalized: "tax-equalization",
  protected: "tax-protection",
  employee_borne: "actual-tax",
  laissez_faire: "actual-tax",
};

const TAX_RATE_MAP: Record<string, number> = {
  "tax-equalization": 0.35,
  "tax-protection": 0.28,
  "actual-tax": 0.22,
};

const DEFAULTS: TaxConfig = {
  taxTreatment: "equalized",
  grossUpMode: "standard",
  includeSocialSecurity: true,
  includeHousingInGrossUp: true,
  includeEducationInGrossUp: false,
  includeColaInGrossUp: true,
  hypoTaxMethod: "marginal",
  equalizationSettlement: "annual",
};

export function TaxConfigProvider({ children }: { children: ReactNode }) {
  const { activeTenant } = useTenantContext();
  const tenantId = activeTenant?.tenant_id;
  const queryClient = useQueryClient();

  const [local, setLocal] = useState<TaxConfig>(DEFAULTS);

  const { data: dbRow, isLoading } = useQuery({
    queryKey: ["tenant_tax_settings", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_tax_settings" as any)
        .select("*")
        .eq("tenant_id", tenantId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  // Sync DB row → local state
  useEffect(() => {
    if (dbRow) {
      setLocal({
        taxTreatment: (dbRow.tax_treatment as TaxTreatment) || DEFAULTS.taxTreatment,
        grossUpMode: (dbRow.gross_up_mode as GrossUpMode) || DEFAULTS.grossUpMode,
        includeSocialSecurity: dbRow.include_social_security ?? DEFAULTS.includeSocialSecurity,
        includeHousingInGrossUp: dbRow.include_housing_in_gross_up ?? DEFAULTS.includeHousingInGrossUp,
        includeEducationInGrossUp: dbRow.include_education_in_gross_up ?? DEFAULTS.includeEducationInGrossUp,
        includeColaInGrossUp: dbRow.include_cola_in_gross_up ?? DEFAULTS.includeColaInGrossUp,
        hypoTaxMethod: dbRow.hypo_tax_method || DEFAULTS.hypoTaxMethod,
        equalizationSettlement: dbRow.equalization_settlement || DEFAULTS.equalizationSettlement,
      });
    } else if (!isLoading) {
      setLocal(DEFAULTS);
    }
  }, [dbRow, isLoading]);

  const saveMutation = useMutation({
    mutationFn: async (config: TaxConfig) => {
      if (!tenantId) return;
      const row = {
        tenant_id: tenantId,
        tax_treatment: config.taxTreatment,
        gross_up_mode: config.grossUpMode,
        include_social_security: config.includeSocialSecurity,
        include_housing_in_gross_up: config.includeHousingInGrossUp,
        include_education_in_gross_up: config.includeEducationInGrossUp,
        include_cola_in_gross_up: config.includeColaInGrossUp,
        hypo_tax_method: config.hypoTaxMethod,
        equalization_settlement: config.equalizationSettlement,
      };
      const { error } = await supabase
        .from("tenant_tax_settings" as any)
        .upsert(row as any, { onConflict: "tenant_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant_tax_settings", tenantId] });
      toast.success("Tax settings saved");
    },
    onError: (err: any) => {
      toast.error("Failed to save tax settings: " + err.message);
    },
  });

  const update = useCallback(
    (patch: Partial<TaxConfig>) => {
      const next = { ...local, ...patch };
      setLocal(next);
      saveMutation.mutate(next);
    },
    [local, saveMutation]
  );

  const simulationTaxApproach = TAX_APPROACH_MAP[local.taxTreatment];

  const grossUpMultiplier = (() => {
    if (local.grossUpMode === "none") return 0;
    let mult = 1.0;
    const allOn = local.grossUpMode === "standard";
    if (allOn || local.includeSocialSecurity) mult += 0.08;
    if (allOn || local.includeHousingInGrossUp) mult += 0.05;
    if (allOn || local.includeEducationInGrossUp) mult += 0.03;
    if (allOn || local.includeColaInGrossUp) mult += 0.04;
    return mult;
  })();

  return (
    <TaxConfigContext.Provider
      value={{
        ...local,
        isLoading,
        setTaxTreatment: (v) => update({ taxTreatment: v }),
        setGrossUpMode: (v) => update({ grossUpMode: v }),
        setIncludeSocialSecurity: (v) => update({ includeSocialSecurity: v }),
        setIncludeHousingInGrossUp: (v) => update({ includeHousingInGrossUp: v }),
        setIncludeEducationInGrossUp: (v) => update({ includeEducationInGrossUp: v }),
        setIncludeColaInGrossUp: (v) => update({ includeColaInGrossUp: v }),
        setHypoTaxMethod: (v) => update({ hypoTaxMethod: v }),
        setEqualizationSettlement: (v) => update({ equalizationSettlement: v }),
        simulationTaxApproach,
        grossUpMultiplier,
      }}
    >
      {children}
    </TaxConfigContext.Provider>
  );
}

export function useTaxConfig() {
  const ctx = useContext(TaxConfigContext);
  if (!ctx) throw new Error("useTaxConfig must be used within TaxConfigProvider");
  return ctx;
}

export { TAX_RATE_MAP };
